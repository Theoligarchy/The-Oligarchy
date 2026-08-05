import fs from 'fs';
import path from 'path';

function replaceMetaTag(html, propertyOrName, isProperty, newValue) {
  const attribute = isProperty ? 'property' : 'name';
  const cleanValue = String(newValue || '').replace(/"/g, '&quot;');
  const regex = new RegExp(`<meta\\s+[^>]*${attribute}="${propertyOrName}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  const replacement = `<meta ${attribute}="${propertyOrName}" content="${cleanValue}" />`;

  if (regex.test(html)) {
    return html.replace(regex, replacement);
  } else {
    return html.replace('</head>', `  ${replacement}\n</head>`);
  }
}

function parseFirestoreValue(val) {
  if (!val) return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('booleanValue' in val) return val.booleanValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj = {};
    const fields = val.mapValue.fields || {};
    for (const k in fields) {
      obj[k] = parseFirestoreValue(fields[k]);
    }
    return obj;
  }
  return undefined;
}

function parseFirestoreDoc(doc) {
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
    date: parseFirestoreValue(fields.date) || parseFirestoreValue(fields.publishedAt) || '',
    author: parseFirestoreValue(fields.author) || 'Priyasha Priyal Jena',
    category: parseFirestoreValue(fields.category) || 'Criminology'
  };
}

async function fetchPublishedArticles() {
  const articles = [];
  try {
    const configPath = path.resolve('firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const projectId = config.projectId;
      const databaseId = config.firestoreDatabaseId;
      const apiKey = config.apiKey;

      const firestoreQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;

      console.log('Querying published articles from Firestore for Open Graph pre-rendering...');
      const response = await fetch(firestoreQueryUrl, {
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

      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results)) {
          for (const item of results) {
            if (item.document) {
              const art = parseFirestoreDoc(item.document);
              if (art && art.title) {
                articles.push(art);
              }
            }
          }
        }
      } else {
        const errText = await response.text();
        console.warn(`Firestore REST runQuery returned ${response.status}: ${errText}`);
      }
    } else {
      console.warn('firebase-applet-config.json not found. Skipping dynamic article fetch.');
    }
  } catch (err) {
    console.error('Failed to fetch articles for pre-rendering:', err.message);
  }
  return articles;
}

function prerenderArticlePage(baseTemplate, article, targetDir) {
  const title = article.seoTitle || `${article.title} — The Oligarchy`;
  const desc = article.seoDescription || article.excerpt || article.subtitle || 
    'An independent peer-reviewed and scholarly archive dedicated to investigating criminology, criminal psychology, and political power systems.';
  const image = article.featuredImage || 'https://theoligarchy.in/logo_highres.png';
  
  const articleSlug = article.slug ? article.slug.trim() : article.id;
  const absoluteUrl = `https://theoligarchy.in/post/${encodeURIComponent(articleSlug)}`;

  let html = baseTemplate;

  // Replace document title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

  // Standard Meta Tags
  html = replaceMetaTag(html, 'description', false, desc);

  // Canonical link
  const canonicalTag = `<link rel="canonical" href="${absoluteUrl}" />`;
  if (/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i.test(html)) {
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, canonicalTag);
  } else {
    html = html.replace('</head>', `  ${canonicalTag}\n</head>`);
  }

  // Open Graph Meta Tags (Facebook / WhatsApp / LinkedIn / iMessage / Discord / Instagram)
  html = replaceMetaTag(html, 'og:type', true, 'article');
  html = replaceMetaTag(html, 'og:title', true, title);
  html = replaceMetaTag(html, 'og:description', true, desc);
  html = replaceMetaTag(html, 'og:image', true, image);
  html = replaceMetaTag(html, 'og:url', true, absoluteUrl);
  html = replaceMetaTag(html, 'og:site_name', true, 'THEOLIGARCHY');

  // Twitter Card Meta Tags
  html = replaceMetaTag(html, 'twitter:card', false, 'summary_large_image');
  html = replaceMetaTag(html, 'twitter:title', false, title);
  html = replaceMetaTag(html, 'twitter:description', false, desc);
  html = replaceMetaTag(html, 'twitter:image', false, image);
  html = replaceMetaTag(html, 'twitter:url', false, absoluteUrl);

  // Inject Article Structured Data (JSON-LD)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': article.title,
    'description': desc,
    'image': [image],
    'datePublished': article.date || new Date().toISOString(),
    'author': {
      '@type': 'Person',
      'name': article.author || 'Priyasha Priyal Jena',
      'url': 'https://theoligarchy.in/'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'The Oligarchy',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://theoligarchy.in/logo_highres.png'
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': absoluteUrl
    }
  };

  const jsonLdScript = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
  html = html.replace('</head>', `${jsonLdScript}</head>`);

  // Ensure target directory exists and save index.html
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf8');
}

async function runPrerender() {
  console.log('--- Starting Open Graph Pre-renderer Step ---');
  
  // Read base template from dist/index.html (or public/index.html fallback)
  const distIndexPath = path.resolve('dist/index.html');
  const rootIndexPath = path.resolve('index.html');
  
  let baseTemplate = '';
  if (fs.existsSync(distIndexPath)) {
    baseTemplate = fs.readFileSync(distIndexPath, 'utf8');
  } else if (fs.existsSync(rootIndexPath)) {
    baseTemplate = fs.readFileSync(rootIndexPath, 'utf8');
  } else {
    console.error('Error: Neither dist/index.html nor index.html was found.');
    return;
  }

  const articles = await fetchPublishedArticles();
  console.log(`Pre-rendering Open Graph metadata for ${articles.length} articles...`);

  // Build target base directories
  const distDir = path.resolve('dist');

  for (const art of articles) {
    const slug = art.slug ? art.slug.trim() : art.id;
    const id = art.id;

    console.log(`Pre-rendering: "${art.title}" (${slug})`);

    if (fs.existsSync(distDir)) {
      // Create /post/:slug/index.html
      prerenderArticlePage(baseTemplate, art, path.join(distDir, 'post', slug));
      // Create /article/:slug/index.html
      prerenderArticlePage(baseTemplate, art, path.join(distDir, 'article', slug));

      // If ID is distinct from slug, also create /post/:id/index.html and /article/:id/index.html
      if (id && id !== slug) {
        prerenderArticlePage(baseTemplate, art, path.join(distDir, 'post', id));
        prerenderArticlePage(baseTemplate, art, path.join(distDir, 'article', id));
      }
    }

    // Also write to public/ so static builds preserve generated pre-rendered HTML files
    const publicDir = path.resolve('public');
    prerenderArticlePage(baseTemplate, art, path.join(publicDir, 'post', slug));
    prerenderArticlePage(baseTemplate, art, path.join(publicDir, 'article', slug));
  }

  console.log('✓ Pre-render step completed successfully!');
}

runPrerender();
