import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { generateVintageNewspaperEmail } from './src/utils/newsletterTemplate';

// Helper: Lazy initialization of Gemini AI Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper: Firestore REST API Integration
let projectId = "the-oligarchy-a58f7";
let databaseId = "default";
let apiKey = "";
try {
  const configRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
  const parsed = JSON.parse(configRaw);
  if (parsed.projectId) projectId = parsed.projectId;
  if (parsed.firestoreDatabaseId) databaseId = parsed.firestoreDatabaseId;
  if (parsed.apiKey) apiKey = parsed.apiKey;
} catch (e) {
  // fallback
}

interface ArticleData {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  seoTitle?: string;
  seoDescription?: string;
}

function parseFirestoreValue(val: any): any {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('booleanValue' in val) return val.booleanValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj: any = {};
    const fields = val.mapValue.fields || {};
    for (const k in fields) {
      obj[k] = parseFirestoreValue(fields[k]);
    }
    return obj;
  }
  return undefined;
}

function parseFirestoreDoc(doc: any): ArticleData | null {
  if (!doc || !doc.fields) return null;
  const fields = doc.fields;
  
  const namePath = doc.name || '';
  const parts = namePath.split('/');
  const docId = parts[parts.length - 1];

  return {
    id: parseFirestoreValue(fields.id) || docId,
    title: parseFirestoreValue(fields.title) || '',
    subtitle: parseFirestoreValue(fields.subtitle) || '',
    slug: parseFirestoreValue(fields.slug) || '',
    excerpt: parseFirestoreValue(fields.excerpt) || '',
    featuredImage: parseFirestoreValue(fields.featuredImage) || '',
    seoTitle: parseFirestoreValue(fields.seoTitle) || '',
    seoDescription: parseFirestoreValue(fields.seoDescription) || '',
  };
}

async function getArticleByIdOrSlug(idOrSlug: string): Promise<ArticleData | null> {
  let decoded = idOrSlug;
  try {
    decoded = decodeURIComponent(idOrSlug).trim();
  } catch (err) {
    // ignore
  }

  const keyParam = apiKey ? `?key=${apiKey}` : '';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
  const normalizedTarget = normalize(decoded);

  // 1. Try fetching directly by ID
  try {
    const res = await fetch(`${baseUrl}/articles/${encodeURIComponent(decoded)}${keyParam}`);
    if (res.ok) {
      const doc = await res.json();
      const art = parseFirestoreDoc(doc);
      if (art) return art;
    }
  } catch (err) {
    // ignore
  }

  // 2. Try querying by slug field directly
  try {
    const queryUrl = `${baseUrl}:runQuery${keyParam}`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: decoded }
            }
          },
          limit: 1
        }
      })
    });

    if (response.ok) {
      const results = await response.json();
      if (Array.isArray(results) && results.length > 0 && results[0].document) {
        const art = parseFirestoreDoc(results[0].document);
        if (art) return art;
      }
    }
  } catch (err) {
    console.error(`Error querying article by slug ${decoded}:`, err);
  }

  // 3. Fallback: Query and find match using robust normalization of slug or title
  try {
    const queryUrl = `${baseUrl}:runQuery${keyParam}`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          limit: 100
        }
      })
    });

    if (response.ok) {
      const results = await response.json();
      if (Array.isArray(results)) {
        for (const item of results) {
          if (item.document) {
            const article = parseFirestoreDoc(item.document);
            if (article) {
              if (
                article.id === decoded ||
                article.id === idOrSlug ||
                (article.slug && article.slug.trim() === decoded) ||
                (article.slug && normalize(article.slug) === normalizedTarget) ||
                (article.title && normalize(article.title) === normalizedTarget)
              ) {
                return article;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error querying article list fallback for ${decoded}:`, err);
  }

  return null;
}

// Helper: Safely replace or inject a meta tag
function replaceMetaTag(html: string, propertyOrName: string, isProperty: boolean, newValue: string): string {
  const attribute = isProperty ? 'property' : 'name';
  // Regex to match existing meta tag safely
  const regex = new RegExp(`<meta\\s+[^>]*${attribute}="${propertyOrName}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  
  // Clean up any double quotes in value to avoid breaking HTML
  const cleanValue = newValue.replace(/"/g, '&quot;');
  const replacement = `<meta ${attribute}="${propertyOrName}" content="${cleanValue}" />`;
  
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  } else {
    // If not found, inject right before </head>
    return html.replace('</head>', `  <meta ${attribute}="${propertyOrName}" content="${cleanValue}" />\n</head>`);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // In-Memory Sliding Window IP Rate Limiter for Gemini AI Endpoints
  interface RateLimitRecord {
    timestamps: number[];
  }
  const aiRateLimitMap = new Map<string, RateLimitRecord>();
  const AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  const AI_RATE_LIMIT_MAX_REQUESTS = 20; // max 20 calls per 10m per IP

  const aiEndpointRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';

    const now = Date.now();
    const cutoff = now - AI_RATE_LIMIT_WINDOW_MS;

    let record = aiRateLimitMap.get(ip);
    if (!record) {
      record = { timestamps: [] };
      aiRateLimitMap.set(ip, record);
    }

    // Filter timestamps within current sliding window
    record.timestamps = record.timestamps.filter(t => t > cutoff);

    const remaining = Math.max(0, AI_RATE_LIMIT_MAX_REQUESTS - record.timestamps.length);
    const oldestTimestamp = record.timestamps.length > 0 ? record.timestamps[0] : now;
    const resetTimeSeconds = Math.max(1, Math.ceil((oldestTimestamp + AI_RATE_LIMIT_WINDOW_MS - now) / 1000));

    res.setHeader('X-RateLimit-Limit', AI_RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTimeSeconds);

    if (record.timestamps.length >= AI_RATE_LIMIT_MAX_REQUESTS) {
      res.setHeader('Retry-After', resetTimeSeconds);
      return res.status(429).json({
        error: `AI metadata rate limit reached (${AI_RATE_LIMIT_MAX_REQUESTS} requests per 10 minutes per IP). Please try again in ${resetTimeSeconds} seconds.`
      });
    }

    record.timestamps.push(now);
    next();
  };

  // Periodic cleanup of stale rate-limit IP records
  setInterval(() => {
    const cutoff = Date.now() - AI_RATE_LIMIT_WINDOW_MS;
    for (const [ip, record] of aiRateLimitMap.entries()) {
      record.timestamps = record.timestamps.filter(t => t > cutoff);
      if (record.timestamps.length === 0) {
        aiRateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  // API Route: Suggest Category and Tags using Gemini API with Rate Limiting Protection
  app.post('/api/suggest-metadata', aiEndpointRateLimiter, async (req, res) => {
    try {
      const { title = '', subtitle = '', excerpt = '', content = '' } = req.body || {};
      
      const combinedText = [title, subtitle, excerpt, content].filter(Boolean).join('\n\n').trim();
      if (!combinedText) {
        return res.status(400).json({ error: 'Please enter a title, excerpt, or content for the draft article.' });
      }

      const ai = getGeminiClient();
      const prompt = `Analyze the following research draft title, excerpt, and text content for 'The Oligarchy' publication. Determine the single most accurate category and suggest 3 to 6 relevant search/metadata tags.

CATEGORIES (YOU MUST SELECT EXACTLY ONE OF THESE THREE):
- criminology: focused on crime, law enforcement, forensic science, corruption, criminal justice, investigations, policy.
- psyche: focused on criminal psychology, behavior, dark triad, mental health, offender profiling, human motives.
- politics: focused on systems of power, political influence, state corruption, authoritarianism, state policy, governance.

DRAFT DETAILS:
Title: ${title}
Subtitle: ${subtitle}
Excerpt: ${excerpt}
Text Content Snippet:
${combinedText.slice(0, 10000)}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert editorial archivist and criminological research director for 'The Oligarchy' research journal. Select the most accurate primary category ('criminology', 'psyche', or 'politics') and generate clean, concise search keyword tags.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'Must be one of "criminology", "psyche", or "politics"',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of 3 to 6 lowercase keyword tags',
              },
              reasoning: {
                type: Type.STRING,
                description: 'A brief 1-sentence editorial reasoning for why this category and tags were selected.',
              }
            },
            required: ['category', 'tags']
          }
        }
      });

      const responseText = response.text || '{}';
      let parsed: any = {};
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Gemini JSON output:', responseText);
      }

      const validCategories = ['criminology', 'psyche', 'politics'];
      let suggestedCategory = (parsed.category || '').toLowerCase().trim();
      if (!validCategories.includes(suggestedCategory)) {
        suggestedCategory = 'criminology';
      }

      const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const cleanTags = rawTags
        .map((t: any) => String(t).toLowerCase().replace(/[^a-z0-9\-]/g, '').trim())
        .filter((t: string) => t.length > 0);

      return res.json({
        category: suggestedCategory,
        tags: cleanTags,
        reasoning: parsed.reasoning || 'Categorized based on primary subject matter and thematic keywords.'
      });
    } catch (err: any) {
      console.error('Error in /api/suggest-metadata route:', err);
      return res.status(500).json({ error: err.message || 'Error executing Gemini API content analysis.' });
    }
  });

  // =========================================================================
  // REAL NEWSLETTER & SUBSCRIBER MANAGEMENT API
  // =========================================================================

  // Helper: Renders an academic/editorial styled unsubscribe confirmation page
  function renderUnsubscribeHtml(headline: string, message: string, success: boolean): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} — The Oligarchy</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0c0e;
      color: #ede9e1;
      font-family: Georgia, 'Times New Roman', serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      max-width: 540px;
      width: 100%;
      background: #14161b;
      border: 1px solid #2a2d36;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 0 12px 36px rgba(0,0,0,0.4);
    }
    .accent-strip {
      height: 3px;
      background: #7a1217;
      margin: -48px -40px 36px -40px;
    }
    .eyebrow {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #7a1217;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 26px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0 0 18px 0;
      font-weight: 700;
      color: #f7f5f0;
    }
    p {
      font-size: 15px;
      line-height: 1.65;
      color: #b0a99c;
      margin: 0 0 28px 0;
    }
    .divider {
      height: 1px;
      background: #252831;
      margin: 24px 0;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #f7f5f0;
      color: #0b0c0e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      text-decoration: none;
      border: 1px solid #f7f5f0;
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: transparent;
      color: #f7f5f0;
    }
    .footer-note {
      font-size: 12px;
      color: #635d52;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="accent-strip"></div>
    <div class="eyebrow">THE OLIGARCHY &bull; EDITORIAL REGISTRY</div>
    <h1>${headline}</h1>
    <p>${message}</p>
    <div class="divider"></div>
    <div style="margin-bottom: 24px;">
      <a href="/" class="btn">Return to Journal Archive &rarr;</a>
    </div>
    <div class="footer-note">The Oligarchy &bull; Independent Scholarly Journal of Criminology, Psyche &amp; Politics</div>
  </div>
</body>
</html>`;
  }

  // 1. PUBLIC SUBSCRIBE ENDPOINT (Prevents Duplicates, Persists Real Records to Firestore)
  app.post('/api/subscribe', async (req, res) => {
    try {
      const { email, location = 'website' } = req.body || {};
      const rawEmail = typeof email === 'string' ? email.trim() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!rawEmail || !emailRegex.test(rawEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid academic or professional email address (e.g. scholar@domain.edu).'
        });
      }

      const normalizedEmail = rawEmail.toLowerCase();
      // Deterministic alphanumeric document ID prevents duplicates at the database level
      const hexId = Buffer.from(normalizedEmail).toString('hex');
      const docId = 'sub_' + hexId;
      const now = Date.now();

      const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/subscribers?documentId=${docId}&key=${apiKey}`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            email: { stringValue: normalizedEmail },
            status: { stringValue: 'active' },
            subscribedAt: { integerValue: String(now) },
            location: { stringValue: location },
            unsubscribeToken: { stringValue: crypto.randomUUID() },
            createdAt: { integerValue: String(now) },
            updatedAt: { integerValue: String(now) }
          }
        })
      });

      if (createRes.status === 200 || createRes.status === 201) {
        return res.status(200).json({
          success: true,
          duplicate: false,
          message: 'Thank you for subscribing to The Oligarchy research dispatches.'
        });
      }

      // 409 Conflict: Subscriber record already exists in database
      if (createRes.status === 409) {
        // Ensure status is reactivated if they were previously unsubscribed
        const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/subscribers/${docId}?updateMask.fieldPaths=status&updateMask.fieldPaths=subscribedAt&updateMask.fieldPaths=updatedAt&key=${apiKey}`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              status: { stringValue: 'active' },
              subscribedAt: { integerValue: String(now) },
              updatedAt: { integerValue: String(now) }
            }
          })
        }).catch(() => {});

        return res.status(200).json({
          success: true,
          duplicate: true,
          message: "You're already subscribed to The Oligarchy research dispatches."
        });
      }

      const errData: any = await createRes.json().catch(() => ({}));
      return res.status(createRes.status || 500).json({
        success: false,
        error: errData?.error?.message || 'Database error recording subscriber.'
      });
    } catch (err: any) {
      console.error('Error in /api/subscribe:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal server error processing subscription.' });
    }
  });

  // 2. UNSUBSCRIBE ENDPOINT (Web link & API endpoint)
  app.all(['/api/unsubscribe', '/unsubscribe'], async (req, res, next) => {
    // If GET to /unsubscribe with NO query parameters, forward to SPA frontend
    if (req.path === '/unsubscribe' && req.method === 'GET' && !req.query.email && !req.query.token) {
      return next();
    }

    try {
      const rawEmail = (req.query.email || req.body?.email || '') as string;
      const token = (req.query.token || req.body?.token || '') as string;
      const trimmed = rawEmail.trim().toLowerCase();

      if (!trimmed && !token) {
        if (req.method === 'GET') {
          return res.status(400).send(renderUnsubscribeHtml('Identifier Missing', 'No email or subscriber identifier was provided in the unsubscribe request.', false));
        }
        return res.status(400).json({ success: false, error: 'Email address or token identifier is required.' });
      }

      const docId = token && token.startsWith('sub_') ? token : (trimmed ? 'sub_' + Buffer.from(trimmed).toString('hex') : token);
      const now = Date.now();

      // Patch the subscriber status in Firestore without deleting historical records
      const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/subscribers/${docId}?updateMask.fieldPaths=status&updateMask.fieldPaths=unsubscribedAt&updateMask.fieldPaths=updatedAt&key=${apiKey}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            status: { stringValue: 'unsubscribed' },
            unsubscribedAt: { integerValue: String(now) },
            updatedAt: { integerValue: String(now) }
          }
        })
      });

      if (req.method === 'GET') {
        return res.status(200).send(renderUnsubscribeHtml(
          'Subscription Retired',
          `Your email address (${trimmed || 'registered subscriber'}) has been removed from our active research dispatch registry. You will receive no further automated emails from The Oligarchy.`,
          true
        ));
      }

      return res.status(200).json({
        success: true,
        message: 'You have been successfully unsubscribed from The Oligarchy dispatches.'
      });
    } catch (err: any) {
      console.error('Error in /api/unsubscribe:', err);
      if (req.method === 'GET') {
        return res.status(500).send(renderUnsubscribeHtml('Dispatch Error', 'Unable to process unsubscribe request at this time.', false));
      }
      return res.status(500).json({ success: false, error: err.message || 'Internal server error processing unsubscription.' });
    }
  });

  // 3. SECURE SERVER-SIDE PUBLISH TRIGGER & NEWSLETTER DISPATCH
  // Triggered when an article is published. Securely invokes Resend server-side without exposing API keys.
  app.post('/api/newsletter/dispatch-published', async (req, res) => {
    try {
      const { articleId, forceResend = false, subscribersList = [] } = req.body || {};

      if (!articleId) {
        return res.status(400).json({ success: false, error: 'articleId is required.' });
      }

      // 1. Fetch real article from Firestore
      const authHeader = req.headers.authorization || '';
      const articleUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/articles/${articleId}?key=${apiKey}`;
      const articleRes = await fetch(articleUrl, {
        headers: authHeader ? { 'Authorization': authHeader } : {}
      });

      if (!articleRes.ok) {
        return res.status(404).json({ success: false, error: `Article ${articleId} not found in Firestore.` });
      }

      const articleDoc = await articleRes.json();
      const fields = articleDoc.fields || {};
      const articleStatus = fields.status?.stringValue || 'draft';
      const articleTitle = fields.title?.stringValue || 'Untitled Manuscript';
      const articleSlug = fields.slug?.stringValue || '';
      const category = fields.category?.stringValue || 'criminology';
      const excerpt = fields.excerpt?.stringValue || fields.description?.stringValue || '';
      const content = fields.content?.stringValue || '';
      const featuredImage = fields.featuredImage?.stringValue || '';
      const authorName = fields.authorName?.stringValue || (fields.authorId?.stringValue === 'sania' ? 'Sania' : 'Priyasha Priyal Jena');
      const originalPublishedAt = fields.originalPublishedAt?.stringValue || fields.publishDate?.stringValue || '';
      const readTime = fields.readTime?.stringValue || '6 min read';
      const doi = fields.doi?.stringValue || '';

      // Check real publication state: only published articles can trigger dispatches
      if (articleStatus !== 'published') {
        return res.status(400).json({
          success: false,
          error: `Article is currently "${articleStatus}". Subscriber dispatches are strictly reserved for published treatises.`
        });
      }

      // Check duplicate send protection
      const isAlreadySent = fields.newsletterSent?.booleanValue === true;
      if (isAlreadySent && !forceResend) {
        return res.status(200).json({
          success: true,
          skipped: true,
          reason: 'Subscriber notification was already dispatched for this article. Duplicate send prevented.'
        });
      }

      // 2. Fetch Active Subscribers from Firestore or use authenticated list
      let activeRecipients: Array<{ email: string; id: string; unsubscribeToken?: string }> = [];

      if (Array.isArray(subscribersList) && subscribersList.length > 0) {
        activeRecipients = subscribersList.filter(s => s && s.email && s.status !== 'unsubscribed');
      } else {
        // Query Firestore subscribers collection using managing editor authorization
        try {
          const subsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/subscribers?key=${apiKey}`;
          const subsRes = await fetch(subsUrl, {
            headers: authHeader ? { 'Authorization': authHeader } : {}
          });
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            const docs = subsData.documents || [];
            activeRecipients = docs
              .map((d: any) => {
                const subFields = d.fields || {};
                const id = d.name.split('/').pop() || '';
                return {
                  id,
                  email: subFields.email?.stringValue || '',
                  status: subFields.status?.stringValue || 'active',
                  unsubscribeToken: subFields.unsubscribeToken?.stringValue || id
                };
              })
              .filter((s: any) => s.email && s.status !== 'unsubscribed');
          }
        } catch (subErr) {
          console.warn('Failed to query subscribers via REST, fallback to empty list:', subErr);
        }
      }

      if (activeRecipients.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          message: 'No active subscribers found in the registry.'
        });
      }

      // 3. Resolve Resend API Configuration
      const resendApiKey = process.env.RESEND_API_KEY || (req.headers['x-resend-key'] as string) || req.body?.resendApiKey || '';
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'The Oligarchy <newsletter@theoligarchy.in>';

      if (!resendApiKey) {
        const errorMsg = 'Resend API Key is not configured in server environment or admin headers.';
        // Record failed state on article
        await patchArticleNewsletterStatus(articleId, 'failed', errorMsg, authHeader);
        return res.status(400).json({
          success: false,
          domainVerified: false,
          error: errorMsg,
          count: activeRecipients.length
        });
      }

      // 4. Generate Vintage Newspaper Email
      const articlePayload = {
        id: articleId,
        title: articleTitle,
        slug: articleSlug,
        category,
        excerpt,
        content,
        featuredImage,
        authorName,
        originalPublishedAt,
        readTime,
        doi
      };

      const { subject, html, text } = generateVintageNewspaperEmail({
        article: articlePayload,
        siteUrl: 'https://theoligarchy.in'
      });

      // 5. Send via Resend API
      // We send to all active recipients
      const recipientEmails = activeRecipients.map(r => r.email.trim());
      
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipientEmails.length === 1 ? recipientEmails[0] : recipientEmails,
          subject,
          html,
          text
        })
      });

      const resendData: any = await resendResponse.json().catch(() => ({}));

      if (!resendResponse.ok) {
        // Detect domain verification requirement from Resend error response
        const resendMsg = resendData?.message || resendData?.error?.message || 'Direct dispatch aborted by email service.';
        const isDomainError = /domain.*not verified|validation_error|forbidden/i.test(resendMsg);
        const userFacingError = isDomainError
          ? `Resend Domain Validation Required: Direct dispatch aborted. The domain theoligarchy.in must be verified in your Resend account (resend.com/domains).`
          : `Resend Dispatch Failed: ${resendMsg}`;

        // Save status to article
        await patchArticleNewsletterStatus(articleId, 'failed', userFacingError, authHeader);

        return res.status(resendResponse.status).json({
          success: false,
          domainVerified: !isDomainError,
          error: userFacingError,
          rawError: resendData,
          count: activeRecipients.length
        });
      }

      // Success! Update article tracking fields in Firestore
      const now = Date.now();
      await patchArticleNewsletterSuccess(articleId, activeRecipients.length, now, authHeader);

      return res.status(200).json({
        success: true,
        domainVerified: true,
        count: activeRecipients.length,
        resendId: resendData?.id || 'resend-ok',
        message: `Successfully dispatched research alert for "${articleTitle}" to ${activeRecipients.length} subscriber(s).`
      });

    } catch (err: any) {
      console.error('Error in /api/newsletter/dispatch-published:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal server error during dispatch.' });
    }
  });

  // Helper: Patch article status on newsletter failure
  async function patchArticleNewsletterStatus(articleId: string, status: string, errorMsg: string, authHeader: string) {
    try {
      const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/articles/${articleId}?updateMask.fieldPaths=newsletterStatus&updateMask.fieldPaths=newsletterError&key=${apiKey}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: authHeader ? { 'Content-Type': 'application/json', 'Authorization': authHeader } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            newsletterStatus: { stringValue: status },
            newsletterError: { stringValue: errorMsg }
          }
        })
      });
    } catch {}
  }

  // Helper: Patch article on newsletter success
  async function patchArticleNewsletterSuccess(articleId: string, count: number, sentAt: number, authHeader: string) {
    try {
      const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/articles/${articleId}?updateMask.fieldPaths=newsletterSent&updateMask.fieldPaths=newsletterSentAt&updateMask.fieldPaths=newsletterSentCount&updateMask.fieldPaths=newsletterStatus&updateMask.fieldPaths=newsletterError&key=${apiKey}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: authHeader ? { 'Content-Type': 'application/json', 'Authorization': authHeader } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            newsletterSent: { booleanValue: true },
            newsletterSentAt: { integerValue: String(sentAt) },
            newsletterSentCount: { integerValue: String(count) },
            newsletterStatus: { stringValue: 'sent' },
            newsletterError: { stringValue: '' }
          }
        })
      });
    } catch {}
  }

  // 4. TEST EMAIL DISPATCH
  app.post('/api/newsletter/send-test', async (req, res) => {
    try {
      const { testEmail, articleId } = req.body || {};
      const resendApiKey = process.env.RESEND_API_KEY || (req.headers['x-resend-key'] as string) || req.body?.resendApiKey || '';
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'The Oligarchy <newsletter@theoligarchy.in>';

      if (!testEmail) {
        return res.status(400).json({ success: false, error: 'testEmail is required.' });
      }

      if (!resendApiKey) {
        return res.status(400).json({ success: false, error: 'Resend API Key is not configured.' });
      }

      // Fetch or synthesize sample test article
      let sampleArticle: any = {
        id: articleId || 'art-sample',
        title: 'The Cartelization of Modern Criminal Networks',
        subtitle: 'An Empirical Analysis of Systemic Institutional Capture and Regulatory Arbitrage',
        slug: 'cartelization-of-modern-criminal-networks',
        category: 'criminology',
        excerpt: 'An investigation into how modern transnational networks leverage algorithmic financial secrecy and jurisdiction hopping to operate beyond classical jurisdictional reach.',
        authorName: 'Priyasha Priyal Jena',
        authorInstitution: 'Founder & Editor-in-Chief',
        originalPublishedAt: '12 September 2026',
        readTime: '7 min read',
        doi: '10.1093/theoligarchy/2026.09.001'
      };

      if (articleId) {
        try {
          const artUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/articles/${articleId}?key=${apiKey}`;
          const artRes = await fetch(artUrl);
          if (artRes.ok) {
            const artData = await artRes.json();
            const f = artData.fields || {};
            sampleArticle = {
              id: articleId,
              title: f.title?.stringValue || sampleArticle.title,
              subtitle: f.subtitle?.stringValue,
              slug: f.slug?.stringValue || sampleArticle.slug,
              category: f.category?.stringValue || sampleArticle.category,
              excerpt: f.excerpt?.stringValue || f.description?.stringValue || sampleArticle.excerpt,
              content: f.content?.stringValue,
              featuredImage: f.featuredImage?.stringValue,
              authorName: f.authorName?.stringValue || sampleArticle.authorName,
              originalPublishedAt: f.originalPublishedAt?.stringValue || f.publishDate?.stringValue || sampleArticle.originalPublishedAt,
              readTime: f.readTime?.stringValue || sampleArticle.readTime,
              doi: f.doi?.stringValue || sampleArticle.doi
            };
          }
        } catch {}
      }

      const { subject, html, text } = generateVintageNewspaperEmail({
        article: sampleArticle,
        recipientEmail: testEmail,
        siteUrl: 'https://theoligarchy.in'
      });

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: testEmail.trim(),
          subject: `[TEST PREVIEW] ${subject}`,
          html,
          text
        })
      });

      const resendData: any = await resendResponse.json().catch(() => ({}));

      if (!resendResponse.ok) {
        const resendMsg = resendData?.message || resendData?.error?.message || 'Direct dispatch aborted.';
        const isDomainError = /domain.*not verified|validation_error|forbidden/i.test(resendMsg);
        return res.status(resendResponse.status).json({
          success: false,
          domainVerified: !isDomainError,
          error: isDomainError
            ? `Resend Domain Validation Required: Direct dispatch aborted. The domain theoligarchy.in must be verified in your Resend account (resend.com/domains).`
            : `Resend Dispatch Failed: ${resendMsg}`,
          rawError: resendData
        });
      }

      return res.status(200).json({
        success: true,
        domainVerified: true,
        message: `Test email successfully dispatched to ${testEmail}.`
      });

    } catch (err: any) {
      console.error('Error in /api/newsletter/send-test:', err);
      return res.status(500).json({ success: false, error: err.message || 'Error sending test email.' });
    }
  });

  // 5. STATUS CHECK
  app.get('/api/newsletter/status', (req, res) => {
    const hasResendKey = Boolean(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'The Oligarchy <newsletter@theoligarchy.in>';
    return res.json({
      configured: hasResendKey,
      fromEmail,
      provider: 'resend',
      mode: process.env.NODE_ENV || 'development'
    });
  });

  // RSS 2.0 & Atom Live Syndication Feed
  app.get(['/feed.xml', '/rss.xml', '/atom.xml', '/feed'], async (req, res) => {
    try {
      // 1. If public/feed.xml or dist/feed.xml exists and was updated within last 10 minutes, serve quickly
      const publicFeed = path.join(process.cwd(), 'public', 'feed.xml');
      const distFeed = path.join(process.cwd(), 'dist', 'feed.xml');
      const feedPath = fs.existsSync(distFeed) ? distFeed : (fs.existsSync(publicFeed) ? publicFeed : null);

      if (feedPath) {
        const stats = fs.statSync(feedPath);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs < 10 * 60 * 1000) {
          const cachedXml = fs.readFileSync(feedPath, 'utf8');
          res.set({
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          });
          return res.status(200).send(cachedXml);
        }
      }

      // 2. Fetch live published articles from Firestore REST API
      const keyParam = apiKey ? `?key=${apiKey}` : '';
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery${keyParam}`;

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'published' }
              }
            }
          }
        })
      });

      let articles: any[] = [];
      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results)) {
          for (const item of results) {
            if (item.document) {
              const doc = item.document;
              const fields = doc.fields || {};
              articles.push({
                id: parseFirestoreValue(fields.id) || doc.name.split('/').pop(),
                title: parseFirestoreValue(fields.title) || '',
                subtitle: parseFirestoreValue(fields.subtitle) || '',
                slug: parseFirestoreValue(fields.slug) || '',
                excerpt: parseFirestoreValue(fields.excerpt) || '',
                content: parseFirestoreValue(fields.content) || '',
                featuredImage: parseFirestoreValue(fields.featuredImage) || '',
                date: parseFirestoreValue(fields.originalPublishedAt) || parseFirestoreValue(fields.publishDate) || parseFirestoreValue(fields.date) || parseFirestoreValue(fields.publishedAt) || '',
                author: parseFirestoreValue(fields.authorName) || parseFirestoreValue(fields.author) || (parseFirestoreValue(fields.authorId) === 'sania' ? 'Sania' : 'The Oligarchy'),
                category: parseFirestoreValue(fields.category) || 'Criminology',
                updateTime: doc.updateTime || new Date().toISOString()
              });
            }
          }
        }
      }

      // If articles fetched, dynamically build feed XML
      if (articles.length > 0) {
        const siteUrl = 'https://theoligarchy.in';
        const buildDate = new Date().toUTCString();
        const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const escapeXml = (unsafe: string) => String(unsafe || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <channel>\n    <title>The Oligarchy — Journal of Criminology, Psyche &amp; Politics</title>\n    <link>${siteUrl}</link>\n    <description>An independent peer-reviewed archive and investigative journal dedicated to criminology, criminal psychology, and political power systems.</description>\n    <language>en-us</language>\n    <lastBuildDate>${buildDate}</lastBuildDate>\n    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />\n    <image>\n      <url>${siteUrl}/logo_highres.png</url>\n      <title>The Oligarchy</title>\n      <link>${siteUrl}</link>\n    </image>\n`;

        for (const art of articles) {
          const permalink = art.slug ? `${siteUrl}/post/${slugify(art.slug)}` : `${siteUrl}/?art=${encodeURIComponent(art.id)}`;
          let itemDate = new Date();
          if (art.date) {
            const parsed = new Date(art.date);
            if (!isNaN(parsed.getTime())) itemDate = parsed;
          }
          xml += `    <item>\n      <title><![CDATA[${art.title || 'Untitled Treatise'}]]></title>\n      <link>${permalink}</link>\n      <guid isPermaLink="true">${permalink}</guid>\n      <pubDate>${itemDate.toUTCString()}</pubDate>\n      <dc:creator><![CDATA[${art.author || 'The Oligarchy'}]]></dc:creator>\n      <category><![CDATA[${art.category || 'Criminology'}]]></category>\n      <description><![CDATA[${art.excerpt || art.subtitle || ''}]]></description>\n      <content:encoded><![CDATA[<p>${art.excerpt || ''}</p>${art.featuredImage ? `<p><img src="${art.featuredImage}" alt="${escapeXml(art.title)}" /></p>` : ''}<p><a href="${permalink}">Read the full treatise on The Oligarchy &rarr;</a></p>]]></content:encoded>\n`;
          if (art.featuredImage && art.featuredImage.startsWith('http')) {
            xml += `      <enclosure url="${art.featuredImage}" type="image/jpeg" length="0" />\n`;
          }
          xml += `    </item>\n`;
        }
        xml += `  </channel>\n</rss>`;

        try {
          const publicDir = path.join(process.cwd(), 'public');
          if (fs.existsSync(publicDir)) {
            fs.writeFileSync(path.join(publicDir, 'feed.xml'), xml, 'utf8');
            fs.writeFileSync(path.join(publicDir, 'rss.xml'), xml, 'utf8');
          }
        } catch (e) {
          // ignore
        }

        res.set({
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        });
        return res.status(200).send(xml);
      }

      if (feedPath) {
        const cachedXml = fs.readFileSync(feedPath, 'utf8');
        res.set({
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        });
        return res.status(200).send(cachedXml);
      }

      return res.status(404).send('RSS feed is being generated.');
    } catch (feedErr: any) {
      console.error('Error generating RSS feed in server.ts:', feedErr);
      const publicFeed = path.join(process.cwd(), 'public', 'feed.xml');
      if (fs.existsSync(publicFeed)) {
        res.set({ 'Content-Type': 'application/rss+xml; charset=utf-8' });
        return res.status(200).send(fs.readFileSync(publicFeed, 'utf8'));
      }
      return res.status(500).send('Error generating RSS feed.');
    }
  });

  let vite: any;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist'), {
      index: false, // Prevents automatic index.html serving to let our custom router parse routes
    }));
  }

  // Catch-all route to serve the HTML and dynamically inject Open Graph / Twitter metadata
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;
    
    // Ignore static files/assets and API requests
    if (url.startsWith('/api/') || url.includes('.')) {
      return next();
    }

    try {
      // 1. Read the base index.html
      const templatePath = isProd 
        ? path.join(process.cwd(), 'dist', 'index.html')
        : path.join(process.cwd(), 'index.html');
      
      if (!fs.existsSync(templatePath)) {
        return res.status(404).send('index.html not found');
      }

      let html = fs.readFileSync(templatePath, 'utf-8');

      // 2. Identify requested article from URL parameter or pretty path
      let articleIdOrSlug = '';
      const queryArticle = req.query.article as string || req.query.art as string;
      
      if (queryArticle) {
        articleIdOrSlug = queryArticle;
      } else {
        const postMatch = url.match(/^\/post\/([^\/?#]+)/);
        const articleMatch = url.match(/^\/article\/([^\/?#]+)/);
        if (postMatch) {
          articleIdOrSlug = postMatch[1];
        } else if (articleMatch) {
          articleIdOrSlug = articleMatch[1];
        }
      }

      // 3. Fetch article metadata from Firestore and dynamically inject Open Graph meta tags
      if (articleIdOrSlug) {
        const article = await getArticleByIdOrSlug(articleIdOrSlug);
        if (article) {
          const title = article.seoTitle || `${article.title} — The Oligarchy`;
          const desc = article.seoDescription || article.excerpt || "An independent peer-reviewed and scholarly archive dedicated to investigating criminology, criminal psychology, and political power systems.";
          const image = article.featuredImage || "https://theoligarchy.in/logo_highres.png";
          
          const host = req.get('host') || 'www.crimeledger.org';
          const protocol = req.secure ? 'https' : 'http';
          const absoluteUrl = article.slug
            ? `${protocol}://${host}/post/${encodeURIComponent(article.slug.trim())}`
            : `${protocol}://${host}/post/${article.id}`;

          // Inject Document Title
          html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

          // Inject standard description
          html = replaceMetaTag(html, 'description', false, desc);

          // Inject Open Graph (Facebook/LinkedIn/WhatsApp/Discord)
          html = replaceMetaTag(html, 'og:title', true, title);
          html = replaceMetaTag(html, 'og:description', true, desc);
          html = replaceMetaTag(html, 'og:image', true, image);
          html = replaceMetaTag(html, 'og:url', true, absoluteUrl);

          // Inject Twitter Cards
          html = replaceMetaTag(html, 'twitter:title', false, title);
          html = replaceMetaTag(html, 'twitter:description', false, desc);
          html = replaceMetaTag(html, 'twitter:image', false, image);
          html = replaceMetaTag(html, 'twitter:url', false, absoluteUrl);
        }
      }

      // 4. Transform HTML in development for Vite's HMR scripts
      if (!isProd && vite) {
        html = await vite.transformIndexHtml(url, html);
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } catch (e) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Server running on http://localhost:${PORT}`);
  });
}

startServer();
