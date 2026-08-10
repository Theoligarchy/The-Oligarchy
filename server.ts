import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

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

  const projectId = "balmy-framing-jj1d7";
  const databaseId = "ai-studio-theoligarchy-56998575-a2c5-4cbc-8cbc-dd66e1c68ca1";
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
  const normalizedTarget = normalize(decoded);

  // 1. Try fetching directly by ID
  try {
    const res = await fetch(`${baseUrl}/articles/${encodeURIComponent(decoded)}`);
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
    const queryUrl = `${baseUrl}:runQuery`;
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
    const queryUrl = `${baseUrl}:runQuery`;
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

  // API Route: Suggest Category and Tags using Gemini API
  app.post('/api/suggest-metadata', async (req, res) => {
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
