/**
 * Content Block Identification & Stable ID Engine
 * 
 * Assigns deterministic, content-derived stable identifiers to article paragraphs,
 * blockquotes, and prose sections so that textual interactions (highlights and copies)
 * can be attributed to specific arguments even when surrounding content is edited.
 */

export interface ResolvedContentBlock {
  id: string;          // Deterministic stable ID e.g. "p_7f3b89e1"
  index: number;       // 0-based sequential order in current version
  tagName: string;     // 'p', 'blockquote', 'h2', 'h3', etc.
  text: string;        // Cleaned plain text
  preview: string;     // First ~140 chars for previews
  wordCount: number;
}

/**
 * Fast 32-bit FNV-1a hash algorithm for deterministic content fingerprinting
 */
export function fnv1aHex(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Normalize text content for stable fingerprinting across minor whitespace variations
 */
export function normalizeTextSnippet(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a deterministic stable ID for a text block.
 * Uses the normalized opening 120 characters of the block text.
 * When an article is edited (e.g. paragraphs added before/after or spelling fixes elsewhere),
 * this unchanged paragraph retains its exact ID.
 */
export function generateContentBlockId(text: string, occurrence: number = 0): string {
  const normalized = normalizeTextSnippet(text);
  const sample = normalized.slice(0, 120);
  const hash = fnv1aHex(sample || 'empty_block');
  return occurrence > 0 ? `p_${hash}_${occurrence}` : `p_${hash}`;
}

/**
 * Extract all eligible text content blocks from article HTML
 */
export function extractContentBlocks(html: string): ResolvedContentBlock[] {
  if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return [];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const eligibleSelectors = 'p, blockquote, h2, h3, h4, li';
    const elements = Array.from(doc.body.querySelectorAll(eligibleSelectors));
    
    const seenHashes = new Map<string, number>();
    const blocks: ResolvedContentBlock[] = [];
    let blockIndex = 0;

    elements.forEach((el) => {
      // Ignore nested blocks if parent is also an eligible block
      if (el.parentElement && el.parentElement.closest(eligibleSelectors)) {
        return;
      }

      // Ignore trivial or empty blocks (< 10 chars)
      const rawText = el.textContent?.trim() || '';
      if (rawText.length < 10) return;

      const baseHash = fnv1aHex(normalizeTextSnippet(rawText).slice(0, 120));
      const occurrence = seenHashes.get(baseHash) || 0;
      seenHashes.set(baseHash, occurrence + 1);

      // Check if existing data-content-block-id or id was already assigned
      const existingId = el.getAttribute('data-content-block-id') || el.id;
      const blockId = existingId && existingId.startsWith('p_') 
        ? existingId 
        : generateContentBlockId(rawText, occurrence);

      blocks.push({
        id: blockId,
        index: blockIndex++,
        tagName: el.tagName.toLowerCase(),
        text: rawText,
        preview: rawText.length > 140 ? rawText.slice(0, 137) + '...' : rawText,
        wordCount: rawText.split(/\s+/).filter(Boolean).length
      });
    });

    return blocks;
  } catch (err) {
    console.warn('Failed to parse content blocks from HTML:', err);
    return [];
  }
}

/**
 * Injects stable `data-content-block-id` attributes and semantic IDs into HTML text blocks.
 * Runs in the browser DOMParser to guarantee 100% valid HTML AST manipulation.
 */
export function injectContentBlockIds(html: string): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const eligibleSelectors = 'p, blockquote, h2, h3, h4, li';
    const elements = Array.from(doc.body.querySelectorAll(eligibleSelectors));
    
    const seenHashes = new Map<string, number>();
    let blockIndex = 0;

    elements.forEach((el) => {
      // Ignore nested blocks (e.g. <li> inside <ul> already handled)
      if (el.parentElement && el.parentElement.closest(eligibleSelectors)) {
        return;
      }

      const rawText = el.textContent?.trim() || '';
      if (rawText.length < 10) return; // Skip empty spacers/breaks

      const baseHash = fnv1aHex(normalizeTextSnippet(rawText).slice(0, 120));
      const occurrence = seenHashes.get(baseHash) || 0;
      seenHashes.set(baseHash, occurrence + 1);

      // Preserve existing ID if already formatted properly, otherwise inject stable content hash
      const existingId = el.getAttribute('data-content-block-id');
      const blockId = existingId && existingId.startsWith('p_')
        ? existingId
        : generateContentBlockId(rawText, occurrence);

      el.setAttribute('data-content-block-id', blockId);
      el.setAttribute('data-block-index', String(blockIndex++));
      
      // Set DOM id only if none exists to avoid breaking existing footnote or section anchors
      if (!el.id) {
        el.id = blockId;
      }

      el.classList.add('article-content-block');
    });

    return doc.body.innerHTML;
  } catch (e) {
    console.warn('Failed to inject content block IDs:', e);
    return html;
  }
}

/**
 * Resolve a specific contentBlockId against article HTML to recover its exact text
 */
export function resolveContentBlockText(
  blockId: string, 
  articleHtml: string
): ResolvedContentBlock | null {
  const blocks = extractContentBlocks(articleHtml);
  return blocks.find(b => b.id === blockId) || null;
}
