/**
 * The Oligarchy — Research Journal & Vintage Editorial Email Generator
 * Formats published scholarly treatises into a refined, minimal, vintage-newspaper
 * aesthetic for email distribution across all major mail clients.
 */

export interface NewsletterArticle {
  id: string;
  title: string;
  subtitle?: string;
  slug?: string;
  category: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  authorId?: string;
  authorName?: string;
  authorTitle?: string;
  authorInstitution?: string;
  originalPublishedAt?: string;
  publishDate?: string;
  readTime?: string;
  doi?: string;
  archivalRefId?: string;
}

export interface NewsletterRenderOptions {
  article: NewsletterArticle;
  recipientEmail?: string;
  subscriberId?: string;
  unsubscribeToken?: string;
  siteUrl?: string; // Default: 'https://theoligarchy.in'
}

/**
 * Extracts a clean, authentic text excerpt from an article without HTML tags.
 */
export function extractCleanExcerpt(article: NewsletterArticle, maxLength = 320): string {
  if (article.excerpt && article.excerpt.trim().length > 0) {
    const clean = article.excerpt.replace(/<[^>]+>/g, '').trim();
    if (clean.length <= maxLength) return clean;
    return clean.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  if (article.content && article.content.trim().length > 0) {
    const text = article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  if (article.subtitle && article.subtitle.trim().length > 0) {
    return article.subtitle.trim();
  }

  return 'An investigative analysis and critical inquiry into the systems, structures, and psychology of entrenched power.';
}

/**
 * Generates both HTML and plaintext versions of the Vintage Newspaper publication email.
 */
export function generateVintageNewspaperEmail(options: NewsletterRenderOptions): {
  subject: string;
  html: string;
  text: string;
} {
  const { article, recipientEmail = '', subscriberId = '', unsubscribeToken = '', siteUrl = 'https://theoligarchy.in' } = options;

  const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const articleSlug = article.slug ? slugify(article.slug) : slugify(article.title || article.id);
  const articleUrl = article.slug
    ? `${siteUrl}/post/${articleSlug}`
    : `${siteUrl}/?art=${encodeURIComponent(article.id)}`;

  const cleanCategory = (article.category || 'CRIMINOLOGY').toUpperCase();
  const publishedDate = article.originalPublishedAt || article.publishDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const authorDisplay = article.authorName || 'The Oligarchy';
  const authorAffil = article.authorInstitution ? ` · ${article.authorInstitution}` : (article.authorTitle ? ` · ${article.authorTitle}` : '');
  const readTimeDisplay = article.readTime || '6 min read';
  const archivalRef = article.archivalRefId || `TOL-${cleanCategory.slice(0, 3)}-${article.id.slice(-4).toUpperCase()}`;
  const excerptText = extractCleanExcerpt(article, 380);

  // Unsubscribe URL
  const tokenParam = unsubscribeToken || subscriberId || (recipientEmail ? encodeURIComponent(recipientEmail) : '');
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${tokenParam}&email=${encodeURIComponent(recipientEmail)}`;

  const subject = `[The Oligarchy] ${article.title}`;

  // Vintage Newspaper HTML Template
  // Minimalist, high contrast, ivory paper, thin rules, restrained typography
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, li, blockquote { font-family: Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f0; color: #141416; font-family: Georgia, 'Times New Roman', serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; line-height: 1.6;">

  <!-- Outer wrapper table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f5f0; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center">

        <!-- Main Letter Container (Max 620px for ideal reading measure) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border: 1px solid #e5e0d8; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">

          <!-- Top Editorial Accent Strip (Deep Muted Burgundy) -->
          <tr>
            <td style="background-color: #7a1217; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 36px 40px 20px 40px; text-align: center;">

              <!-- Small Uppercase Dispatch Notice -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: #7a1217; margin-bottom: 12px;">
                SCHOLARLY DISPATCH &bull; INDEPENDENT INVESTIGATION
              </div>

              <!-- Main Masthead -->
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #121316; line-height: 1.15;">
                THE OLIGARCHY
              </h1>

              <!-- Sub-Masthead Tagline -->
              <div style="margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #645e54;">
                THE STORIES BEHIND SYSTEMS OF POWER
              </div>

              <!-- Vintage Double Rule -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px; margin-bottom: 14px;">
                <tr>
                  <td style="border-top: 1px solid #141416; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="height: 2px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #cfc8be; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Newspaper Metadata Grid -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #6c665d;">
                    ${publishedDate}
                  </td>
                  <td align="center" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #7a1217;">
                    ${cleanCategory}
                  </td>
                  <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #6c665d;">
                    REF: ${archivalRef}
                  </td>
                </tr>
              </table>

              <!-- Lower Single Rule -->
              <div style="border-bottom: 1px solid #e8e3da; margin-top: 14px; margin-bottom: 24px;"></div>

            </td>
          </tr>

          <!-- Article Content Body -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">

              <!-- Category Pill / Eyebrow -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.20em; text-transform: uppercase; color: #7a1217; margin-bottom: 12px;">
                NEW RESEARCH &bull; ${cleanCategory}
              </div>

              <!-- Article Title -->
              <h2 style="margin: 0 0 14px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; line-height: 1.3; color: #121316; letter-spacing: -0.01em;">
                ${escapeHtml(article.title)}
              </h2>

              <!-- Subtitle if present -->
              ${article.subtitle ? `
              <div style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-style: italic; color: #4e483e; line-height: 1.45;">
                ${escapeHtml(article.subtitle)}
              </div>` : ''}

              <!-- Author Byline -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #5c564c; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid #f0ece3;">
                By <strong style="color: #1a1917;">${escapeHtml(authorDisplay)}</strong>${escapeHtml(authorAffil)} &bull; <span style="color: #7a1217;">${escapeHtml(readTimeDisplay)}</span>
              </div>

              <!-- Actual Article Excerpt -->
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.68; color: #252320; margin-bottom: 24px;">
                ${escapeHtml(excerptText)}
              </div>

              <!-- Hero Image (Optional, only if real image exists) -->
              ${article.featuredImage && article.featuredImage.startsWith('http') ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 26px;">
                <tr>
                  <td align="center" style="border: 1px solid #e5e0d8; padding: 4px; background-color: #faf9f6;">
                    <a href="${articleUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <img src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.title)}" style="display: block; width: 100%; max-width: 532px; height: auto; border: 0;" />
                    </a>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Call To Action (Vintage High-Contrast Editorial Button) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px; margin-bottom: 28px;">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #141416; border: 1px solid #141416;">
                          <a href="${articleUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #ffffff; text-decoration: none;">
                            READ THE FULL ARTICLE &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- DOI or Archival Notice if available -->
              ${article.doi ? `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; color: #7a7469; letter-spacing: 0.08em; padding: 10px 14px; background-color: #faf8f5; border-left: 2px solid #7a1217; margin-bottom: 20px;">
                DIGITAL OBJECT IDENTIFIER: <strong>${escapeHtml(article.doi)}</strong>
              </div>` : ''}

            </td>
          </tr>

          <!-- Editorial Colophon & Legal Footer -->
          <tr>
            <td style="padding: 24px 40px 36px 40px; background-color: #faf8f5; border-top: 1px solid #eae5db; text-align: center;">

              <!-- Journal Attribution -->
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 700; color: #1a1917; letter-spacing: 0.05em; margin-bottom: 4px;">
                The Oligarchy
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #6e675c; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px;">
                Independent Research Publication &bull; Journal of Criminology, Psyche &amp; Politics
              </div>

              <!-- Thin Separator -->
              <div style="width: 40px; height: 1px; background-color: #d8d2c6; margin: 0 auto 16px auto;"></div>

              <!-- Dispatch Purpose -->
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 11px; font-style: italic; color: #736c61; max-width: 440px; margin: 0 auto 16px auto; line-height: 1.5;">
                You are receiving this dispatch because your email is registered in our research notification ledger. No commercial advertising. No third-party sponsorship.
              </div>

              <!-- Unsubscribe & Portal Links -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #8a8275;">
                <a href="${siteUrl}" target="_blank" style="color: #141416; text-decoration: underline; margin-right: 14px;">Visit Online Archive</a>
                &bull;
                <a href="${unsubscribeUrl}" target="_blank" style="color: #7a1217; text-decoration: underline; margin-left: 14px;">Unsubscribe from dispatches</a>
              </div>

            </td>
          </tr>

        </table>
        <!-- End Main Letter Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;

  // Plaintext Fallback
  const text = `THE OLIGARCHY
THE STORIES BEHIND SYSTEMS OF POWER
Independent Research Publication
================================================================

NEW RESEARCH: ${cleanCategory}

${article.title}
${article.subtitle ? article.subtitle + '\n' : ''}By ${authorDisplay}${authorAffil}
Published: ${publishedDate} | Read Time: ${readTimeDisplay}
Ref: ${archivalRef}

----------------------------------------------------------------

${excerptText}

----------------------------------------------------------------

Read the complete treatise online:
${articleUrl}

================================================================
The Oligarchy — Journal of Criminology, Psyche & Politics
To discontinue future dispatches, visit:
${unsubscribeUrl}
`;

  return { subject, html, text };
}

function escapeHtml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
