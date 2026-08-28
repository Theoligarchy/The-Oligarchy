import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, 
  Copy, 
  Check, 
  Twitter, 
  Linkedin, 
  MessageSquare, 
  Mail,
  Instagram, 
  ExternalLink, 
  Info, 
  X, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Article } from '../types';

interface ShareMenuProps {
  article: Article;
}

export default function ShareMenu({ article }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [instaCaptionCopied, setInstaCaptionCopied] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Generate share URL with direct article link parameter or pretty slug path
  const baseOrigin = (
    window.location.origin.includes('run.app') || 
    window.location.origin.includes('localhost') || 
    window.location.origin.includes('127.0.0.1')
  ) ? 'https://theoligarchy.in' : window.location.origin;

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const shareUrl = article.slug
    ? `${baseOrigin}/post/${slugify(article.slug)}`
    : `${baseOrigin}/post/${article.id}`;
  const shareTitle = `The Oligarchy — ${article.title}`;
  const shareText = `Read this independent research analysis on ${article.title} at The Oligarchy:`;

  // Custom formatted Instagram caption
  const instagramCaption = `📖 Studying "The Oligarchy" research analysis: "${article.title}" by Priyasha Priyal Jena. Explore the systems of power at: ${shareUrl} @theoligarchy.in #TheOligarchy #CriticalInquiry`;

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyInstagramCaption = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(instagramCaption);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = instagramCaption;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setInstaCaptionCopied(true);
      setTimeout(() => setInstaCaptionCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy Instagram caption: ', err);
    }
  };

  const handleNativeShare = async (): Promise<boolean> => {
    if (canNativeShare) {
      try {
        const shareData = {
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        };
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setIsOpen(false);
          return true;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User cancelled native share sheet
          return true;
        }
        console.warn('Native share failed: ', err);
      }
    }
    return false;
  };

  const handlePrimaryShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Attempt Web Share API first if supported
    if (canNativeShare) {
      const handled = await handleNativeShare();
      if (handled) return;
    }

    // Fallback for desktop or non-supported Web Share: Copy link directly
    await handleCopyLink();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef} id="share-menu-container">
      {/* Main Split Trigger Share Button */}
      <div className="inline-flex items-center rounded-sm border border-paper/10 hover:border-blood/60 bg-navy/80 hover:bg-blood/20 transition-all duration-300 shadow-sm text-paper/80 hover:text-paper font-sans text-[10px] font-bold tracking-widest uppercase overflow-hidden select-none">
        <button
          onClick={handlePrimaryShare}
          className="py-2.5 pl-3.5 pr-2.5 flex items-center gap-2 cursor-pointer hover:text-paper hover:bg-blood/20 transition-colors"
          title={canNativeShare ? "Share via native app sheet" : "Copy article link to clipboard"}
          id="share-button-trigger"
        >
          {copied ? (
            <Check size={12} className="text-green-400 shrink-0" />
          ) : (
            <Share2 size={12} className="text-blood-light shrink-0" />
          )}
          <span>{copied ? 'Link Copied!' : 'Share Analysis'}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="py-2.5 px-2 border-l border-paper/10 hover:border-blood/40 hover:bg-blood/30 text-paper/60 hover:text-paper transition-colors cursor-pointer flex items-center justify-center"
          title="More sharing options"
          id="share-dropdown-toggle"
        >
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2.5 w-64 rounded-sm bg-navy border border-paper/15 shadow-2xl z-50 overflow-hidden select-none"
            id="share-dropdown-panel"
          >
            {/* Header */}
            <div className="border-b border-paper/10 bg-black/40 px-4 py-2.5">
              <span className="font-sans text-[9px] font-extrabold uppercase tracking-[0.25em] text-paper/40">
                Share Research Paper
              </span>
            </div>

            {/* Options List */}
            <div className="p-1 flex flex-col gap-0.5">
              
              {/* Option: Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-2.5 hover:bg-paper/[0.03] active:bg-paper/[0.05] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-blood/20 transition-colors">
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-paper/60" />}
                  </div>
                  <span className="font-serif text-xs">
                    {copied ? 'Link Copied!' : 'Copy Private Link'}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-paper/30 group-hover:text-paper/50">URL</span>
              </button>

              {/* Option: Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + ' ' + shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2.5 hover:bg-paper/[0.03] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#1DA1F2]/20 transition-colors">
                    <Twitter size={11} className="text-paper/60 group-hover:text-[#1DA1F2]" />
                  </div>
                  <span className="font-serif text-xs">Share on Twitter / X</span>
                </div>
                <ChevronRight size={10} className="text-paper/20" />
              </a>

              {/* Option: LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2.5 hover:bg-paper/[0.03] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#0077B5]/20 transition-colors">
                    <Linkedin size={11} className="text-paper/60 group-hover:text-[#0077B5]" />
                  </div>
                  <span className="font-serif text-xs">Post on LinkedIn</span>
                </div>
                <ChevronRight size={10} className="text-paper/20" />
              </a>

              {/* Option: WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareTitle + '\n' + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2.5 hover:bg-paper/[0.03] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                    <MessageSquare size={11} className="text-paper/60 group-hover:text-[#25D366]" />
                  </div>
                  <span className="font-serif text-xs">Send on WhatsApp</span>
                </div>
                <ChevronRight size={10} className="text-paper/20" />
              </a>

              {/* Option: Email Dispatch */}
              <a
                href={`mailto:?subject=${encodeURIComponent('Scholarly Analysis: ' + shareTitle)}&body=${encodeURIComponent('I thought you would find this investigation from The Oligarchy insightful:\n\n"' + article.title + '"\n\n' + (article.subtitle || article.excerpt ? (article.subtitle || article.excerpt) + '\n\n' : '') + 'Access the full analysis & citations at:\n' + shareUrl + '\n\n— The Oligarchy')}`}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2.5 hover:bg-paper/[0.03] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Mail size={11} className="text-paper/60 group-hover:text-amber-300" />
                  </div>
                  <span className="font-serif text-xs">Share via Email</span>
                </div>
                <ChevronRight size={10} className="text-paper/20" />
              </a>

              {/* Option: Instagram Wizard */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowInstagramModal(true);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-paper/[0.03] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#E1306C]/20 transition-colors">
                    <Instagram size={11} className="text-paper/60 group-hover:text-[#E1306C]" />
                  </div>
                  <span className="font-serif text-xs">Share on Instagram</span>
                </div>
                <ChevronRight size={10} className="text-paper/20" />
              </button>

              {/* Option: Native OS System Share (conditional fallback) */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="w-full text-left px-3 py-2.5 border-t border-paper/10 hover:bg-paper/[0.03] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-blood/20 transition-colors">
                      <Share2 size={11} className="text-paper/60" />
                    </div>
                    <span className="font-serif text-xs">System Share Options</span>
                  </div>
                  <span className="font-mono text-[8px] text-blood-light uppercase tracking-widest">Device</span>
                </button>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Instagram Sharing Companion Modal */}
      <AnimatePresence>
        {showInstagramModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" id="instagram-share-modal">
            {/* Modal Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstagramModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Content Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-navy border border-paper/15 rounded-sm p-6 md:p-8 shadow-2xl text-left select-text"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowInstagramModal(false)}
                className="absolute right-4 top-4 text-paper/40 hover:text-paper p-1.5 rounded-full hover:bg-paper/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center shadow-lg">
                  <Instagram size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-paper">Instagram Share Companion</h3>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-paper/30">
                    Social Curation Guidelines
                  </p>
                </div>
              </div>

              {/* Step By Step Guide */}
              <div className="flex flex-col gap-5 font-serif text-sm text-paper/70">
                <p>
                  Since Instagram doesn't support opening direct share URLs via standard web browsers, we have crafted a tailored experience to help you share your reading list with your academic circles:
                </p>

                {/* Text Block with copy function */}
                <div className="bg-black/40 border border-paper/10 p-4 rounded-sm flex flex-col gap-3 relative overflow-hidden">
                  <span className="font-sans text-[8px] font-extrabold uppercase tracking-widest text-paper/30">
                    Curated Story Caption
                  </span>
                  <div className="font-serif italic text-xs leading-relaxed text-paper/65 select-all pr-4">
                    "{instagramCaption}"
                  </div>

                  <button
                    onClick={handleCopyInstagramCaption}
                    className="self-end bg-paper/5 hover:bg-blood/20 border border-paper/10 hover:border-blood text-paper/85 hover:text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-1.5 px-3 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                  >
                    {instaCaptionCopied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    {instaCaptionCopied ? 'Caption Copied!' : 'Copy Caption & Tags'}
                  </button>
                </div>

                {/* Instruction Steps */}
                <div className="flex flex-col gap-3 border-t border-paper/5 pt-4">
                  <div className="flex gap-3 items-start">
                    <span className="font-sans text-[10px] bg-blood text-paper w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                    <p className="text-xs leading-relaxed">
                      Copy the custom caption above (which automatically mentions <strong className="text-paper">@theoligarchy.in</strong> to notify our curators).
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="font-sans text-[10px] bg-blood text-paper w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">2</span>
                    <p className="text-xs leading-relaxed">
                      In Instagram Stories, add a <strong className="text-paper">"Link Sticker"</strong> pointing directly to the research paper URL:<br />
                      <code className="text-[11px] font-mono select-all bg-black/30 p-1 rounded-sm mt-1 block border border-paper/5 text-blood-light hover:text-blood transition-colors">{shareUrl}</code>
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="font-sans text-[10px] bg-blood text-paper w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                    <p className="text-xs leading-relaxed">
                      Paste the caption, design your story with your preferred aesthetic, and post it! We periodically re-share selected student posts to our community circle.
                    </p>
                  </div>
                </div>

                {/* Direct External Action */}
                <div className="mt-4 flex gap-3">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-4 rounded-sm flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer text-center select-none"
                  >
                    Launch Instagram App <ExternalLink size={12} />
                  </a>
                  <button
                    onClick={() => setShowInstagramModal(false)}
                    className="border border-paper/10 hover:border-paper/20 hover:bg-paper/5 text-paper/60 hover:text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-5 rounded-sm transition-colors cursor-pointer select-none"
                  >
                    Done
                  </button>
                </div>

                <div className="flex items-center gap-2 text-paper/30 border-t border-paper/5 pt-3.5 select-none">
                  <Info size={11} />
                  <span className="font-sans text-[9px] uppercase tracking-wide">
                    Note: High-res branding assets can be requested in our editorial contact registry.
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
