/**
 * Cloudflare Worker for Dynamic Open Graph Meta Tag Injection
 * 
 * Intercepts requests to https://theoligarchy.in/post/* or https://theoligarchy.in/article/*
 * When a social crawler (Facebook, Twitter/X, WhatsApp, LinkedIn, iMessage, Discord, Telegram, Instagram)
 * fetches an article page, this worker queries Firestore REST API and injects static og:title, og:image, 
 * og:description, and twitter:card meta tags directly into the HTML response.
 */

const SOCIAL_CRAWLERS = [
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'slackbot',
  'discordbot',
  'telegrambot',
  'applebot',
  'bingbot',
  'googlebot',
  'pinterest'
];

function isSocialCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_CRAWLERS.some(crawler => ua.includes(crawler));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';

    // Only process article paths (/post/:slug or /article/:slug)
    const postMatch = url.pathname.match(/^\/post\/([^\/?#]+)/i);
    const articleMatch = url.pathname.match(/^\/article\/([^\/?#]+)/i);
    const articleSlugOrId = postMatch ? postMatch[1] : (articleMatch ? articleMatch[1] : null);

    // Fetch original response from origin (GitHub Pages or static host)
    const response = await fetch(request);

    if (!articleSlugOrId) {
      return response;
    }

    // Always ensure HTML content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    try {
      // Query Firestore REST API for the article details
      const projectId = env.FIREBASE_PROJECT_ID || 'balmy-framing-jj1d7';
      const databaseId = env.FIREBASE_DATABASE_ID || 'ai-studio-theoligarchy-56998575-a2c5-4cbc-8cbc-dd66e1c68ca1';
      const apiKey = env.FIREBASE_API_KEY || '';

      const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
      
      const firestoreRes = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: decodeURIComponent(articleSlugOrId) }
              }
            },
            limit: 1
          }
        })
      });

      let article = null;
      if (firestoreRes.ok) {
        const results = await firestoreRes.json();
        if (Array.isArray(results) && results.length > 0 && results[0].document) {
          const fields = results[0].document.fields || {};
          article = {
            title: fields.title?.stringValue || fields.seoTitle?.stringValue || 'The Oligarchy Article',
            description: fields.seoDescription?.stringValue || fields.excerpt?.stringValue || fields.subtitle?.stringValue || 'Independent research publication.',
            image: fields.featuredImage?.stringValue || 'https://theoligarchy.in/logo_highres.png',
            url: `https://theoligarchy.in/post/${encodeURIComponent(articleSlugOrId)}`
          };
        }
      }

      if (!article) {
        return response;
      }

      // Transform HTML head using HTMLRewriter
      const rewriter = new HTMLRewriter()
        .on('title', {
          element(element) {
            element.setInnerContent(`${article.title} — The Oligarchy`);
          }
        })
        .on('meta[property="og:title"]', {
          element(element) {
            element.setAttribute('content', article.title);
          }
        })
        .on('meta[property="og:description"]', {
          element(element) {
            element.setAttribute('content', article.description);
          }
        })
        .on('meta[property="og:image"]', {
          element(element) {
            element.setAttribute('content', article.image);
          }
        })
        .on('meta[property="og:url"]', {
          element(element) {
            element.setAttribute('content', article.url);
          }
        })
        .on('meta[name="twitter:title"]', {
          element(element) {
            element.setAttribute('content', article.title);
          }
        })
        .on('meta[name="twitter:description"]', {
          element(element) {
            element.setAttribute('content', article.description);
          }
        })
        .on('meta[name="twitter:image"]', {
          element(element) {
            element.setAttribute('content', article.image);
          }
        });

      return rewriter.transform(response);
    } catch (err) {
      console.error('Cloudflare Worker OG Tag Rewriter error:', err);
      return response;
    }
  }
};
