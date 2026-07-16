import fs from 'fs';
import path from 'path';

async function generateSitemap() {
  console.log('Generating sitemap.xml...');
  
  const siteUrl = 'https://theoligarchy.in';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Base static URLs matching the platform's research sections and critical informational tabs
  const staticUrls = [
    { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${siteUrl}/?tab=criminology`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/?tab=psyche`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/?tab=politics`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/?tab=editorial`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${siteUrl}/?tab=about`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${siteUrl}/?tab=contact`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${siteUrl}/?tab=submit-tip`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${siteUrl}/?tab=reading-stack`, changefreq: 'weekly', priority: '0.6' }
  ];
  
  let dynamicUrls = [];
  
  try {
    // Read Firebase config to query the correct database
    const configPath = path.resolve('firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const projectId = config.projectId;
      const databaseId = config.firestoreDatabaseId;
      
      const apiKey = config.apiKey;
      const firestoreQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;
      
      console.log(`Querying published articles via Firestore REST runQuery API...`);
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
              const doc = item.document;
              const fields = doc.fields || {};
              
              // Extract article ID
              let id = fields.id && fields.id.stringValue;
              if (!id) {
                id = doc.name.split('/').pop();
              }
              
              // Resolve the correct last modified date
              let lastmod = currentDate;
              if (doc.updateTime) {
                lastmod = doc.updateTime.split('T')[0];
              }
              
              dynamicUrls.push({
                loc: `${siteUrl}/?article=${id}`,
                lastmod,
                changefreq: 'monthly',
                priority: '0.6'
              });
            }
          }
          console.log(`Successfully retrieved ${dynamicUrls.length} published articles.`);
        }
      } else {
        const errText = await response.text();
        console.warn(`Firestore REST runQuery API returned status ${response.status}: ${errText}. Using static URLs fallback.`);
      }
    } else {
      console.warn('firebase-applet-config.json not found. Using static URLs fallback.');
    }
  } catch (error) {
    console.error('Failed to fetch dynamic articles for sitemap:', error.message);
    console.log('Continuing with static URLs fallback...');
  }
  
  const allUrls = [...staticUrls, ...dynamicUrls];
  
  // Construct XML content
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const url of allUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod || currentDate}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';
  
  // Save to public/ (which will be committed and used as input for subsequent builds)
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');
  console.log('Saved sitemap.xml to public/sitemap.xml');
  
  // Save directly to dist/ in case the build step has already run
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
    console.log('Saved sitemap.xml to dist/sitemap.xml');
  }
}

generateSitemap();
