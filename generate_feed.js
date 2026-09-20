import fs from 'fs';
import path from 'path';

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
    content: parseFirestoreValue(fields.content) || '',
    featuredImage: parseFirestoreValue(fields.featuredImage) || '',
    date: parseFirestoreValue(fields.originalPublishedAt) || parseFirestoreValue(fields.publishDate) || parseFirestoreValue(fields.date) || parseFirestoreValue(fields.publishedAt) || '',
    author: parseFirestoreValue(fields.author) || 'Priyasha Priyal Jena',
    category: parseFirestoreValue(fields.category) || 'Criminology',
    readTime: parseFirestoreValue(fields.readTime) || '10 min read',
    updateTime: doc.updateTime || new Date().toISOString()
  };
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildRssXml(articles) {
  const siteUrl = 'https://theoligarchy.in';
  const buildDate = new Date().toUTCString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom" 
     xmlns:content="http://purl.org/rss/1.0/modules/content/" 
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>The Oligarchy — Journal of Criminology, Psyche &amp; Politics</title>
    <link>${siteUrl}</link>
    <description>An independent peer-reviewed archive and investigative journal dedicated to criminology, criminal psychology, and political power systems.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl}/logo_highres.png</url>
      <title>The Oligarchy</title>
      <link>${siteUrl}</link>
    </image>
`;

  for (const art of articles) {
    const permalink = art.slug 
      ? `${siteUrl}/post/${slugify(art.slug)}` 
      : `${siteUrl}/?art=${encodeURIComponent(art.id)}`;
    
    // Parse valid pubDate
    let itemDate = new Date();
    if (art.date) {
      const parsed = new Date(art.date);
      if (!isNaN(parsed.getTime())) itemDate = parsed;
    } else if (art.updateTime) {
      const parsed = new Date(art.updateTime);
      if (!isNaN(parsed.getTime())) itemDate = parsed;
    }

    const title = art.title || 'Untitled Treatise';
    const author = art.author || 'Priyasha Priyal Jena';
    const category = art.category || 'Criminology';
    const excerpt = art.excerpt || art.subtitle || '';
    const fullContent = art.content || excerpt;

    xml += `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${permalink}</link>
      <guid isPermaLink="true">${permalink}</guid>
      <pubDate>${itemDate.toUTCString()}</pubDate>
      <dc:creator><![CDATA[${author}]]></dc:creator>
      <category><![CDATA[${category}]]></category>
      <description><![CDATA[${excerpt}]]></description>
      <content:encoded><![CDATA[<p>${excerpt}</p>${art.featuredImage ? `<p><img src="${art.featuredImage}" alt="${escapeXml(title)}" /></p>` : ''}<p><a href="${permalink}">Read the full treatise on The Oligarchy &rarr;</a></p>]]></content:encoded>
`;

    if (art.featuredImage && art.featuredImage.startsWith('http')) {
      xml += `      <enclosure url="${art.featuredImage}" type="image/jpeg" length="0" />\n`;
    }

    xml += `    </item>\n`;
  }

  xml += `  </channel>
</rss>`;

  return xml;
}

async function generateFeed() {
  console.log('Generating RSS & Atom Feed (feed.xml)...');
  let articles = [];

  try {
    const configPath = path.resolve('firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const projectId = config.projectId;
      const databaseId = config.firestoreDatabaseId;
      const apiKey = config.apiKey;
      const firestoreQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;

      console.log('Querying published articles for RSS feed via Firestore REST...');
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
              if (art) articles.push(art);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Firestore live fetch for RSS feed failed, attempting fallback backup:', err.message);
  }

  // If live query returned no articles, fallback to firestore_live_backup.json
  if (articles.length === 0) {
    try {
      const backupPath = path.resolve('src/data/firestore_live_backup.json');
      if (fs.existsSync(backupPath)) {
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        if (Array.isArray(backupData.articles)) {
          articles = backupData.articles.filter(a => a.status === 'published' || !a.status);
          console.log(`Loaded ${articles.length} articles from firestore_live_backup.json for RSS feed.`);
        }
      }
    } catch (bErr) {
      console.warn('Backup read for RSS feed failed:', bErr.message);
    }
  }

  console.log(`Compiling RSS feed with ${articles.length} treatises.`);
  const xml = buildRssXml(articles);

  // Write to public/
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'feed.xml'), xml, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'rss.xml'), xml, 'utf8');
  console.log('Saved feed.xml and rss.xml to public/');

  // Write to dist/ if dist already exists
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'feed.xml'), xml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'rss.xml'), xml, 'utf8');
    console.log('Saved feed.xml and rss.xml to dist/');
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('generate_feed.js')) {
  generateFeed();
}
