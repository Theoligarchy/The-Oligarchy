import { Article, CoAuthor } from '../types';

/**
 * Standardizes person's full name into parts: firstName, middleNames, lastName
 */
function parsePersonName(fullName: string): { first: string; initials: string; last: string } {
  const clean = fullName.replace(/^Dr\.\s*|^Prof\.\s*|^Mr\.\s*|^Ms\.\s*|^Mrs\.\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) {
    return { first: '', initials: '', last: '' };
  }
  if (parts.length === 1) {
    return { first: parts[0], initials: parts[0][0] + '.', last: parts[0] };
  }
  
  const last = parts[parts.length - 1];
  const first = parts[0];
  const middleAndFirst = parts.slice(0, -1);
  const initials = middleAndFirst.map(p => p[0]?.toUpperCase() + '.').join(' ');

  return { first, initials, last };
}

/**
 * Extracts list of author names from an article, respecting primary author and co-authors
 */
export function getArticleAuthors(article: Article): { name: string; role?: string; institution?: string; orcid?: string }[] {
  const list: { name: string; role?: string; institution?: string; orcid?: string }[] = [];

  // Primary Author
  if (article.authorName && article.authorName.trim()) {
    list.push({
      name: article.authorName.trim(),
      role: article.authorTitle || (article.authorId === 'priyasha-priyal-jena' ? 'Founder & Editor-in-Chief' : 'Lead Investigator'),
      institution: article.authorInstitution || 'The Oligarchy Research Group',
      orcid: article.authorOrcid
    });
  }

  // Co-Authors
  if (Array.isArray(article.coAuthors)) {
    article.coAuthors.forEach(ca => {
      if (ca.name && ca.name.trim()) {
        list.push({
          name: ca.name.trim(),
          role: ca.role || 'Co-Researcher',
          institution: ca.institution,
          orcid: ca.orcid
        });
      }
    });
  }

  if (list.length === 0) {
    list.push({
      name: 'Priyasha Priyal Jena',
      role: 'Founder & Editor-in-Chief',
      institution: 'The Oligarchy Research Group'
    });
  }

  return list;
}

/**
 * Derives the publication date components
 */
function getArticleDateComponents(article: Article): { year: number; monthName: string; monthShort: string; day: number; formattedFull: string } {
  let dateObj = new Date(article.createdAt || Date.now());

  if (article.publishDate) {
    const parsed = new Date(article.publishDate);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  
  const year = dateObj.getFullYear() || 2026;
  const monthIdx = dateObj.getMonth();
  const day = dateObj.getDate() || 1;

  return {
    year,
    monthName: months[monthIdx] || 'May',
    monthShort: monthsShort[monthIdx] || 'May',
    day,
    formattedFull: `${day} ${months[monthIdx]} ${year}`
  };
}

/**
 * Returns canonical or permanent URL for citation
 */
export function getArticleCanonicalUrl(article: Article): string {
  if (article.canonicalUrl) return article.canonicalUrl;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/?art=${article.id}`;
  }
  return `https://theoligarchy.in/article/${article.slug || article.id}`;
}

/**
 * Derives unique Archival Reference ID
 */
export function getArticleArchivalId(article: Article): string {
  if (article.archivalRefId) return article.archivalRefId;
  const catPrefix = (article.category || 'RES').slice(0, 4).toUpperCase();
  const year = getArticleDateComponents(article).year;
  const idHash = (article.slug || article.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || '001';
  return `TOL-${year}-${catPrefix}-${idHash}`;
}

/**
 * Normalizes ORCID string into clean 16-digit format with hyphens (e.g. 0000-0002-1825-0097)
 */
export function normalizeOrcid(orcid?: string): string | null {
  if (!orcid || typeof orcid !== 'string') return null;
  const clean = orcid.trim().replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, '').replace(/[^0-9X-]/gi, '');
  
  // Format with hyphens if raw digits
  const rawDigits = clean.replace(/-/g, '');
  if (rawDigits.length === 16) {
    return `${rawDigits.slice(0, 4)}-${rawDigits.slice(4, 8)}-${rawDigits.slice(8, 12)}-${rawDigits.slice(12, 16).toUpperCase()}`;
  }

  // Already hyphenated format
  if (/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(clean)) {
    return clean.toUpperCase();
  }

  return clean || null;
}

/**
 * Returns official verified ORCID URL
 */
export function getOrcidUrl(orcid?: string): string | null {
  const normalized = normalizeOrcid(orcid);
  if (!normalized) return null;
  return `https://orcid.org/${normalized}`;
}

// ══════════════════════════════════════════════════════════════════════════
// 1. APA 7th Edition Citation Generator
// ══════════════════════════════════════════════════════════════════════════
export function generateAPACitation(article: Article): string {
  const authors = getArticleAuthors(article);
  const dateInfo = getArticleDateComponents(article);
  const url = getArticleCanonicalUrl(article);

  let authorString = '';
  if (authors.length === 1) {
    const { initials, last } = parsePersonName(authors[0].name);
    authorString = `${last}, ${initials}`;
  } else if (authors.length === 2) {
    const a1 = parsePersonName(authors[0].name);
    const a2 = parsePersonName(authors[1].name);
    authorString = `${a1.last}, ${a1.initials}, & ${a2.last}, ${a2.initials}`;
  } else {
    const formatted = authors.map(a => {
      const p = parsePersonName(a.name);
      return `${p.last}, ${p.initials}`;
    });
    const lastAuthor = formatted.pop();
    authorString = `${formatted.join(', ')}, & ${lastAuthor}`;
  }

  const title = article.subtitle ? `${article.title}: ${article.subtitle}` : article.title;
  const doi = article.doi ? ` https://doi.org/${article.doi}` : ` ${url}`;

  return `${authorString} (${dateInfo.year}, ${dateInfo.monthName} ${dateInfo.day}). ${title}. The Oligarchy: Investigative Journal of Power, Psyche & Law.${doi}`;
}

// ══════════════════════════════════════════════════════════════════════════
// 2. Chicago 17th Edition (Author-Date / Notes) Citation Generator
// ══════════════════════════════════════════════════════════════════════════
export function generateChicagoCitation(article: Article): string {
  const authors = getArticleAuthors(article);
  const dateInfo = getArticleDateComponents(article);
  const url = getArticleCanonicalUrl(article);

  let authorString = '';
  if (authors.length === 1) {
    const p = parsePersonName(authors[0].name);
    authorString = `${p.last}, ${p.first}`;
  } else if (authors.length === 2) {
    const p1 = parsePersonName(authors[0].name);
    authorString = `${p1.last}, ${p1.first}, and ${authors[1].name}`;
  } else {
    const p1 = parsePersonName(authors[0].name);
    authorString = `${p1.last}, ${p1.first}, et al.`;
  }

  const title = article.subtitle ? `${article.title}: ${article.subtitle}` : article.title;
  return `${authorString}. "${title}." The Oligarchy, ${dateInfo.monthName} ${dateInfo.day}, ${dateInfo.year}. ${url}.`;
}

// ══════════════════════════════════════════════════════════════════════════
// 3. MLA 9th Edition Citation Generator
// ══════════════════════════════════════════════════════════════════════════
export function generateMLACitation(article: Article): string {
  const authors = getArticleAuthors(article);
  const dateInfo = getArticleDateComponents(article);
  const url = getArticleCanonicalUrl(article);

  let authorString = '';
  if (authors.length === 1) {
    const p = parsePersonName(authors[0].name);
    authorString = `${p.last}, ${p.first}.`;
  } else if (authors.length === 2) {
    const p1 = parsePersonName(authors[0].name);
    authorString = `${p1.last}, ${p1.first}, and ${authors[1].name}.`;
  } else {
    const p1 = parsePersonName(authors[0].name);
    authorString = `${p1.last}, ${p1.first}, et al.`;
  }

  const title = article.subtitle ? `${article.title}: ${article.subtitle}` : article.title;
  return `${authorString} "${title}." The Oligarchy, ${dateInfo.day} ${dateInfo.monthShort} ${dateInfo.year}, ${url}.`;
}

// ══════════════════════════════════════════════════════════════════════════
// 4. Harvard (Cite Them Right) Citation Generator
// ══════════════════════════════════════════════════════════════════════════
export function generateHarvardCitation(article: Article): string {
  const authors = getArticleAuthors(article);
  const dateInfo = getArticleDateComponents(article);
  const url = getArticleCanonicalUrl(article);

  let authorString = '';
  if (authors.length === 1) {
    const p = parsePersonName(authors[0].name);
    authorString = `${p.last}, ${p.initials.replace(/\s+/g, '')}`;
  } else if (authors.length === 2) {
    const p1 = parsePersonName(authors[0].name);
    const p2 = parsePersonName(authors[1].name);
    authorString = `${p1.last}, ${p1.initials.replace(/\s+/g, '')} and ${p2.last}, ${p2.initials.replace(/\s+/g, '')}`;
  } else {
    const p1 = parsePersonName(authors[0].name);
    authorString = `${p1.last}, ${p1.initials.replace(/\s+/g, '')} et al.`;
  }

  const title = article.subtitle ? `${article.title}: ${article.subtitle}` : article.title;
  return `${authorString} (${dateInfo.year}) '${title}', The Oligarchy, ${dateInfo.day} ${dateInfo.monthName}. Available at: ${url} (Accessed: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}).`;
}

// ══════════════════════════════════════════════════════════════════════════
// 5. BibTeX Citation Generator
// ══════════════════════════════════════════════════════════════════════════
export function generateBibTeXCitation(article: Article): string {
  const authors = getArticleAuthors(article);
  const dateInfo = getArticleDateComponents(article);
  const url = getArticleCanonicalUrl(article);
  const archivalId = getArticleArchivalId(article);

  const bibtexAuthors = authors
    .map(a => {
      const p = parsePersonName(a.name);
      return `${p.last}, ${p.first}`;
    })
    .join(' and ');

  const citeKey = `${parsePersonName(authors[0].name).last.toLowerCase()}${dateInfo.year}${article.slug.slice(0, 10).replace(/[^a-z0-9]/g, '')}`;
  const fullTitle = article.subtitle ? `${article.title}: ${article.subtitle}` : article.title;

  return `@article{${citeKey},
  author    = {${bibtexAuthors}},
  title     = {{${fullTitle}}},
  journal   = {The Oligarchy: Investigative Journal of Power, Psyche \\& Law},
  year      = {${dateInfo.year}},
  month     = {${dateInfo.monthShort.toLowerCase().replace('.', '')}},
  url       = {${url}},
  note      = {Archival ID: ${archivalId}${article.doi ? `, DOI: ${article.doi}` : ''}},
  category  = {${article.category}}
}`;
}

// ══════════════════════════════════════════════════════════════════════════
// 6. RIS (Research Information Systems) Generator for Reference Managers
// ══════════════════════════════════════════════════════════════════════════
export function generateRISCitation(article: Article): string {
  const authors = getArticleAuthors(article);
  const dateInfo = getArticleDateComponents(article);
  const url = getArticleCanonicalUrl(article);
  const fullTitle = article.subtitle ? `${article.title}: ${article.subtitle}` : article.title;

  const lines: string[] = [
    'TY  - JOUR',
    `TI  - ${fullTitle}`,
    `T2  - The Oligarchy: Investigative Journal of Power, Psyche & Law`
  ];

  authors.forEach(a => {
    const p = parsePersonName(a.name);
    lines.push(`AU  - ${p.last}, ${p.first}`);
  });

  lines.push(`PY  - ${dateInfo.year}`);
  lines.push(`DA  - ${dateInfo.year}/${dateInfo.monthName}/${dateInfo.day}`);
  lines.push(`UR  - ${url}`);
  if (article.doi) {
    lines.push(`DO  - ${article.doi}`);
  }
  if (article.excerpt) {
    lines.push(`AB  - ${article.excerpt.replace(/\r?\n/g, ' ')}`);
  }
  (article.tags || []).forEach(tag => {
    lines.push(`KW  - ${tag}`);
  });
  lines.push('ER  - ');

  return lines.join('\n');
}

/**
 * Triggers browser download for BibTeX (.bib) file
 */
export function downloadBibTeXFile(article: Article): void {
  const content = generateBibTeXCitation(article);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${article.slug || 'citation'}.bib`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser download for RIS (.ris) file (Zotero / Mendeley / EndNote)
 */
export function downloadRISFile(article: Article): void {
  const content = generateRISCitation(article);
  const blob = new Blob([content], { type: 'application/x-research-info-systems;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${article.slug || 'citation'}.ris`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface CitationFormats {
  apa: string;
  chicago: string;
  harvard: string;
  bibtex: string;
  mla: string;
}

/**
 * Compiles all major scholarly citation formats in one single call
 */
export function generateCitations(article: Article): CitationFormats {
  return {
    apa: generateAPACitation(article),
    chicago: generateChicagoCitation(article),
    harvard: generateHarvardCitation(article),
    bibtex: generateBibTeXCitation(article),
    mla: generateMLACitation(article)
  };
}

