import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  BookOpen, 
  Scale, 
  Database, 
  Shield, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ArrowDown,
  Quote
} from 'lucide-react';
import { Source } from '../types';

export interface ActiveFootnoteState {
  index: number;
  targetRect: {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
    clientX: number;
    clientY: number;
  };
  source?: Source;
}

interface FootnotePopoverProps {
  footnote: ActiveFootnoteState | null;
  onClose: () => void;
  onJumpToBibliography: (index: number) => void;
}

export default function FootnotePopover({
  footnote,
  onClose,
  onJumpToBibliography
}: FootnotePopoverProps) {
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; isAbove: boolean; arrowOffset: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Map category to icon and label
  const getCategoryDetails = (cat?: string) => {
    switch (cat) {
      case 'academic':
        return { label: 'Academic Paper / Journal', icon: <FileText size={12} className="text-blue-400" /> };
      case 'government':
        return { label: 'Government & Agency Report', icon: <Shield size={12} className="text-red-400" /> };
      case 'book':
        return { label: 'Scholarly Book & Monograph', icon: <BookOpen size={12} className="text-yellow-400" /> };
      case 'court':
        return { label: 'Court Record & Judicial Filing', icon: <Scale size={12} className="text-purple-400" /> };
      case 'database':
        return { label: 'Public Database & Registry', icon: <Database size={12} className="text-green-400" /> };
      case 'investigative':
        return { label: 'Investigative Journalism', icon: <FileText size={12} className="text-teal-400" /> };
      default:
        return { label: 'Referenced Citation', icon: <Quote size={12} className="text-paper/60" /> };
    }
  };

  // Calculate coordinates with boundary checks
  useEffect(() => {
    if (!footnote) {
      setCoords(null);
      return;
    }

    const computePosition = () => {
      const { clientX, clientY, width, height } = footnote.targetRect;
      const popoverWidth = Math.min(360, window.innerWidth - 24);
      const popoverEstimatedHeight = 180;
      
      const triggerCenterX = clientX + width / 2;
      
      // Calculate horizontal position clamped to viewport
      let left = triggerCenterX - popoverWidth / 2;
      if (left < 12) left = 12;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }

      // Calculate arrow offset relative to popover
      const arrowOffset = Math.max(16, Math.min(popoverWidth - 16, triggerCenterX - left));

      // Calculate vertical position (prefer above if room, else below)
      const roomAbove = clientY > popoverEstimatedHeight + 20;
      const isAbove = roomAbove;
      
      const top = isAbove 
        ? clientY - 10 // anchored to top of trigger (will translate -100%)
        : clientY + height + 10; // anchored below trigger

      setCoords({ top, left, isAbove, arrowOffset });
    };

    computePosition();

    // Recompute on window resize or orientation change
    window.addEventListener('resize', computePosition);
    return () => window.removeEventListener('resize', computePosition);
  }, [footnote]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!footnote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // If clicked on another footnote button, let its handler open the new footnote
        const isFootnoteBtn = (e.target as HTMLElement).closest('.footnote-ref-btn, [data-footnote-index]');
        if (!isFootnoteBtn) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [footnote, onClose]);

  if (!footnote || !coords) return null;

  const { index, source } = footnote;
  const categoryInfo = getCategoryDetails(source?.category);

  const handleCopyCitation = async () => {
    if (!source) return;
    const textToCopy = `${source.title}${source.citation ? ` (${source.citation})` : ''}${source.url ? ` — ${source.url}` : ''}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy footnote reference:', err);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 pointer-events-none z-50 select-text"
        id="footnote-popover-portal"
      >
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.94, y: coords.isAbove ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: coords.isAbove ? 4 : -4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: coords.isAbove ? undefined : `${coords.top}px`,
            bottom: coords.isAbove ? `${window.innerHeight - coords.top}px` : undefined,
            left: `${coords.left}px`,
            width: `${Math.min(360, window.innerWidth - 24)}px`
          }}
          className="pointer-events-auto bg-[#0d0d0d] border border-paper/20 rounded-md shadow-2xl p-3.5 text-paper flex flex-col gap-2.5 backdrop-blur-md"
          role="dialog"
          aria-label={`Citation Footnote ${index}`}
          id={`footnote-popover-${index}`}
        >
          {/* Decorative Arrow Indicator */}
          <div 
            style={{ left: `${coords.arrowOffset}px` }}
            className={`absolute w-2.5 h-2.5 bg-[#0d0d0d] border-paper/20 rotate-45 pointer-events-none ${
              coords.isAbove 
                ? '-bottom-[6px] border-r border-b' 
                : '-top-[6px] border-l border-t'
            }`}
          />

          {/* Header Row: Footnote Index + Category Tag + Dismiss Button */}
          <div className="flex items-center justify-between gap-2 border-b border-paper/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blood-light bg-blood/20 border border-blood/40 px-1.5 py-0.5 rounded leading-none">
                [{index}]
              </span>
              <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-paper/70">
                {categoryInfo.icon}
                <span>{categoryInfo.label}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-paper/40 hover:text-paper p-1 rounded hover:bg-paper/10 transition-colors cursor-pointer"
              title="Close footnote popover (Esc)"
              aria-label="Close"
              id="close-footnote-popover"
            >
              <X size={13} />
            </button>
          </div>

          {/* Source Reference Content */}
          <div className="flex flex-col gap-1.5">
            {source ? (
              <>
                <p className="font-serif text-[13px] leading-relaxed text-paper/95 font-medium">
                  {source.title}
                </p>
                {source.citation && (
                  <div className="font-sans text-[10px] text-paper/60 bg-paper/5 px-2 py-1 rounded border border-paper/5 inline-block">
                    {source.citation}
                  </div>
                )}
              </>
            ) : (
              <p className="font-serif text-xs text-paper/60 italic leading-relaxed">
                Citation reference [{index}] is catalogued in this paper's full bibliography below.
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-paper/10 mt-0.5">
            <div className="flex items-center gap-2">
              {/* External Link button (if URL exists) */}
              {source?.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blood/20 hover:bg-blood/35 text-blood-light hover:text-paper border border-blood/40 font-sans text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Open source document / record in a new tab"
                  id={`access-record-fn-${index}`}
                >
                  <ExternalLink size={10} />
                  <span>Access Record</span>
                </a>
              )}

              {/* Copy citation button */}
              {source && (
                <button
                  onClick={handleCopyCitation}
                  className="text-paper/60 hover:text-paper hover:bg-paper/10 border border-paper/10 font-sans text-[10px] uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy reference citation"
                  id={`copy-fn-citation-${index}`}
                >
                  {copied ? (
                    <>
                      <Check size={10} className="text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Jump to Bibliography */}
            <button
              onClick={() => {
                onJumpToBibliography(index);
                onClose();
              }}
              className="text-paper/50 hover:text-blood-light font-sans text-[10px] uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer ml-auto transition-colors"
              title="Jump to full bibliography entry in this paper"
              id={`jump-to-bib-${index}`}
            >
              <span>Bibliography</span>
              <ArrowDown size={10} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
