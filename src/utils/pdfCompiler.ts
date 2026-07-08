import { Article } from '../types';

export const compileScholarlyPDF = (article: Article) => {
  // Format dates for metadata
  const publishDateStr = article.publishDate || new Date(article.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Parse category for proper capitalisation
  const categoryStr = article.category.toUpperCase();

  // Build Bibliography entries
  const bibliographyHtml = article.sources && article.sources.length > 0
    ? `
      <div class="bibliography">
        <h4 class="bibliography-title">Citations &amp; Scholarly Bibliography</h4>
        <p class="bibliography-disclaimer">
          This document is fully cross-referenced with peer-reviewed publications, legal registries, and intelligence archives.
        </p>
        <ul class="bibliography-list">
          ${article.sources
            .map((src, idx) => `
              <li class="bibliography-item">
                <span class="citation-tag">[${idx + 1}]</span>
                <span class="citation-category">(${src.category.toUpperCase()})</span>
                <strong>${src.title}</strong>
                ${src.citation ? ` — <span class="citation-desc">${src.citation}</span>` : ''}
                ${src.url ? `<br/><span class="citation-url">${src.url}</span>` : ''}
              </li>
            `).join('')}
        </ul>
      </div>
    `
    : '';

  // Process article content to make it print-friendly (e.g. format paragraphs nicely)
  // Ensure we strip buttons, comments, or edit elements that might have crept into Quill
  let cleanContent = article.content || '';
  
  // Format first paragraph of sections to have no-indent
  // In traditional typesetting, the very first paragraph of an article or chapter doesn't have an indent, while subsequent ones do.
  cleanContent = cleanContent.replace(/<p>/, '<p class="first-paragraph">');

  // Build complete HTML Document
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${article.title} — The Oligarchy Scholarly Offprint</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        
        @page {
          size: A4;
          margin: 22mm 18mm 22mm 18mm;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
        
        body {
          background-color: #ffffff;
          color: #111111;
          font-family: 'Georgia', 'Times New Roman', serif;
          line-height: 1.5;
          font-size: 10.5pt;
          margin: 0;
          padding: 0;
        }
        
        /* Official Masthead Header */
        .masthead {
          text-align: center;
          border-bottom: 3.5px double #111111;
          padding-bottom: 12px;
          margin-bottom: 28px;
        }
        
        .masthead-title {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 30pt;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0;
          line-height: 1.0;
        }
        
        .masthead-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 8pt;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          margin: 8px 0 0 0;
          color: #333333;
        }
        
        .masthead-meta {
          display: flex;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
          font-size: 7.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          border-top: 1px solid #dddddd;
          margin-top: 12px;
          padding-top: 8px;
          color: #444444;
        }
        
        /* Structured Metadata Sheet */
        .metadata-section {
          margin-bottom: 25px;
          border-bottom: 1px solid #eeeeee;
          padding-bottom: 20px;
        }
        
        .document-title {
          font-family: 'Playfair Display', serif;
          font-size: 22pt;
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 8px 0;
          color: #000000;
        }
        
        .document-subtitle {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 13pt;
          color: #444444;
          margin: 0 0 15px 0;
          line-height: 1.3;
        }
        
        .document-author {
          font-family: 'Inter', sans-serif;
          font-size: 8.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          margin: 0 0 20px 0;
          color: #111111;
        }
        
        .abstract-box {
          border: 1px solid #111111;
          background-color: #fcfcfc;
          padding: 16px;
          margin-bottom: 15px;
        }
        
        .abstract-title {
          font-family: 'Inter', sans-serif;
          font-size: 8pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin: 0 0 8px 0;
          color: #000000;
        }
        
        .abstract-text {
          font-size: 9.5pt;
          line-height: 1.5;
          font-style: italic;
          color: #222222;
          margin: 0;
          text-align: justify;
        }
        
        /* Multi-Column Print Layout */
        .article-body {
          columns: 2;
          column-gap: 28px;
          column-rule: 1px solid #e2e2e2;
          text-align: justify;
        }
        
        .article-body p {
          margin: 0 0 12px 0;
          text-indent: 1.5em;
        }
        
        .article-body p.first-paragraph,
        .article-body p.no-indent,
        .article-body .first-paragraph {
          text-indent: 0;
        }
        
        /* Ensure headers are clean and avoid column breaks */
        .article-body h1, 
        .article-body h2, 
        .article-body h3, 
        .article-body h4 {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          line-height: 1.2;
          margin: 22px 0 10px 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        .article-body h1 {
          font-size: 13pt;
          border-bottom: 1px solid #cccccc;
          padding-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .article-body h2 {
          font-size: 11.5pt;
        }
        
        .article-body h3 {
          font-size: 10.5pt;
          font-style: italic;
        }
        
        .article-body ul, 
        .article-body ol {
          margin: 0 0 12px 0;
          padding-left: 20px;
          break-inside: avoid;
        }
        
        .article-body li {
          font-size: 10pt;
          margin-bottom: 4px;
        }
        
        /* Bibliography Index styling */
        .bibliography {
          margin-top: 35px;
          border-top: 2px solid #111111;
          padding-top: 18px;
          break-before: page;
          page-break-before: always;
        }
        
        .bibliography-title {
          font-family: 'Playfair Display', serif;
          font-size: 13pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 6px 0;
          color: #000000;
        }
        
        .bibliography-disclaimer {
          font-family: 'Inter', sans-serif;
          font-size: 7.5pt;
          color: #666666;
          margin: 0 0 18px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .bibliography-list {
          list-style-type: none;
          padding-left: 0;
          margin: 0;
        }
        
        .bibliography-item {
          font-size: 9pt;
          line-height: 1.45;
          margin-bottom: 14px;
          padding-left: 24px;
          text-indent: -24px;
          color: #222222;
          text-align: justify;
        }
        
        .citation-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8pt;
          font-weight: bold;
          color: #000000;
          margin-right: 6px;
        }
        
        .citation-category {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7pt;
          font-weight: 500;
          color: #666666;
          margin-right: 6px;
          text-transform: uppercase;
        }
        
        .citation-desc {
          color: #444444;
          font-style: italic;
        }
        
        .citation-url {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7.5pt;
          color: #555555;
          word-break: break-all;
        }
        
        /* Floating notification to print dialogue */
        .print-prompt {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #000000;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 9pt;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from { transform: translate(-50%, 40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      </style>
    </head>
    <body>
      
      <!-- Masthead Header -->
      <header class="masthead">
        <h1 class="masthead-title">The Oligarchy</h1>
        <div class="masthead-subtitle">Journal of Anthropological Criminology &amp; Power Systems</div>
        <div class="masthead-meta">
          <span>Document Series: Vol. IV, No. 2</span>
          <span>ESTABLISHED 2026</span>
          <span>Scholarly Offprint</span>
        </div>
      </header>
      
      <!-- Structured Metadata Sheet -->
      <section class="metadata-section">
        <h2 class="document-title">${article.title}</h2>
        ${article.subtitle ? `<h3 class="document-subtitle">${article.subtitle}</h3>` : ''}
        
        <div class="document-author">
          Author: Priyasha Priyal Jena &middot; Editor-in-Chief &middot; The Oligarchy Academic Board
        </div>
        
        <div class="abstract-box">
          <div class="abstract-title">Abstract &amp; Summary Analysis</div>
          <p class="abstract-text">
            ${article.excerpt || article.subtitle || 'An in-depth critical and academic investigation compiled from legal dossiers, psychological profile logs, and verified organizational power network trace elements.'}
          </p>
        </div>
        
        <div style="font-family: 'Inter', sans-serif; font-size: 8pt; color: #555555; text-transform: uppercase; letter-spacing: 0.08em; display: flex; justify-content: space-between;">
          <span>Category: ${categoryStr} &middot; ${article.readTime || '5 MIN READ'}</span>
          <span>Published: ${publishDateStr}</span>
        </div>
      </section>
      
      <!-- Multi-Column Text Layout -->
      <main class="article-body">
        ${cleanContent}
      </main>
      
      <!-- Bibliography List -->
      ${bibliographyHtml}
      
      <!-- Floating guidance overlay (will be invisible in print output) -->
      <div class="print-prompt no-print">
        Compiling Document. Use "Save as PDF" to download...
      </div>
      
      <script>
        // Trigger browser print dialogue automatically once rendering is ready
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 600);
        };
      </script>
    </body>
    </html>
  `;

  // Open compiled document in a secondary sandbox-friendly window / tab
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert('Pop-up blocker detected. Please allow pop-ups for this domain to download the Scholarly PDF Offprint.');
  }
};
