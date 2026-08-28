/**
 * Transforms article HTML to convert footnote markers ([1], [2], <sup>[1]</sup>, etc.)
 * into accessible, interactive citation footnote buttons.
 */

export function transformFootnotesInHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // 1. If running in browser environment with DOMParser, use DOM-based AST transformation for 100% precision
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // A. Transform existing <sup> tags that contain numbers or brackets (e.g. <sup>[1]</sup>, <sup>1</sup>)
      const existingSups = Array.from(doc.querySelectorAll('sup'));
      existingSups.forEach(sup => {
        const text = sup.textContent?.trim() || '';
        const match = text.match(/^\[?(\d+)\]?$/);
        if (match) {
          const num = match[1];
          const btn = doc.createElement('button');
          btn.type = 'button';
          btn.className = 'footnote-ref-btn';
          btn.setAttribute('data-footnote-index', num);
          btn.setAttribute('aria-label', `Footnote ${num}`);
          btn.setAttribute('title', `Citation Footnote [${num}]`);
          btn.innerHTML = `<sup>[${num}]</sup>`;
          sup.replaceWith(btn);
        }
      });

      // B. Transform existing footnote anchor links (e.g. <a href="#ref-1">[1]</a>)
      const existingRefLinks = Array.from(doc.querySelectorAll('a[href^="#ref"], a[href^="#fn"], a[href^="#footnote"], a[href^="#citation"]'));
      existingRefLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const numMatch = href.match(/\d+/) || link.textContent?.match(/\d+/);
        if (numMatch) {
          const num = numMatch[0];
          const btn = doc.createElement('button');
          btn.type = 'button';
          btn.className = 'footnote-ref-btn';
          btn.setAttribute('data-footnote-index', num);
          btn.setAttribute('aria-label', `Footnote ${num}`);
          btn.setAttribute('title', `Citation Footnote [${num}]`);
          btn.innerHTML = `<sup>[${num}]</sup>`;
          link.replaceWith(btn);
        }
      });

      // C. Process text nodes to locate [1], [2], [1, 2] notation in prose
      const walker = doc.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'code', 'pre', 'textarea', 'button', 'a'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest('.footnote-ref-btn') || parent.closest('[data-footnote-index]')) {
              return NodeFilter.FILTER_REJECT;
            }
            // Check if text contains bracketed numbers like [1] or [12] or [1, 2]
            if (/\[\d+(?:\s*,\s*\d+)*\]/.test(node.nodeValue || '')) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      const nodesToReplace: Text[] = [];
      while (walker.nextNode()) {
        nodesToReplace.push(walker.currentNode as Text);
      }

      nodesToReplace.forEach(textNode => {
        const val = textNode.nodeValue || '';
        const parent = textNode.parentNode;
        if (!parent) return;

        // Replace pattern [1] or [1, 2, 3] with interactive buttons
        const parts = val.split(/(\[\d+(?:\s*,\s*\d+)*\])/g);
        if (parts.length <= 1) return;

        const fragment = doc.createDocumentFragment();
        parts.forEach(part => {
          const bracketMatch = part.match(/^\[([\d\s,]+)\]$/);
          if (bracketMatch) {
            const numbers = bracketMatch[1].split(',').map(n => n.trim()).filter(Boolean);
            numbers.forEach(numStr => {
              const num = parseInt(numStr, 10);
              if (!isNaN(num) && num > 0 && num < 1000) {
                const btn = doc.createElement('button');
                btn.type = 'button';
                btn.className = 'footnote-ref-btn';
                btn.setAttribute('data-footnote-index', String(num));
                btn.setAttribute('aria-label', `Footnote ${num}`);
                btn.setAttribute('title', `Citation Footnote [${num}]`);
                btn.innerHTML = `<sup>[${num}]</sup>`;
                fragment.appendChild(btn);
              } else {
                fragment.appendChild(doc.createTextNode(part));
              }
            });
          } else if (part) {
            fragment.appendChild(doc.createTextNode(part));
          }
        });

        parent.replaceChild(fragment, textNode);
      });

      return doc.body.innerHTML;
    } catch (e) {
      console.warn('DOMParser footnote transformation error:', e);
    }
  }

  // 2. Fallback regex transformation for non-browser or fallback SSR
  return html
    .replace(/<sup>\s*\[?(\d+)\]?\s*<\/sup>/gi, '<button type="button" class="footnote-ref-btn" data-footnote-index="$1" aria-label="Footnote $1" title="Citation Footnote [$1]"><sup>[$1]</sup></button>')
    .replace(/<a[^>]*href=["']#(?:ref|reference|footnote|fn|citation)-?(\d+)["'][^>]*>.*?<\/a>/gi, '<button type="button" class="footnote-ref-btn" data-footnote-index="$1" aria-label="Footnote $1" title="Citation Footnote [$1]"><sup>[$1]</sup></button>');
}
