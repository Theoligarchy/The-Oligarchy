import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, 
  Copy, 
  Check, 
  Twitter, 
  Linkedin, 
  MessageSquare, 
  Mail, 
  Send, 
  X, 
  ChevronUp,
  Link2,
  Bookmark
} from 'lucide-react';
import { Article } from '../types';

interface FloatingShareMenuProps {
  article: Article;
  onBookmarkToggle?: () => void;
  isBookmarked?: boolean;
  onCopyLinkNotification?: (msg: string) => void;
}

export default function FloatingShareMenu({ 
  article, 
  onBookmarkToggle, 
  isBookmarked = false,
  onCopyLinkNotification
}: FloatingShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  // Compute canonical share URL
  const baseOrigin = (
    typeof window !== 'undefined' && (
      window.location.origin.includes('run.app') || 
      window.location.origin.includes('localhost') || 
      window.location.origin.includes('127.0.0.1')
    )
  ) ? 'https://theoligarchy.in' : (typeof window !== 'undefined' ? window.location.origin : 'https://theoligarchy.in');

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
  const shareSummary = article.subtitle || article.excerpt || `Critical research analysis published on The Oligarchy.`;
  const shareText = `Read this independent research analysis on "${article.title}" at The Oligarchy:`;

  const emailSubject = `Scholarly Analysis: ${article.title} — The Oligarchy`;
  const emailBody = `I thought you would find this investigation from The Oligarchy insightful:\n\n"${article.title}"\n${article.subtitle ? article.subtitle + '\n\n' : '\n'}${shareSummary ? shareSummary + '\n\n' : ''}Access the full text & bibliography here:\n${shareUrl}\n\n— The Oligarchy Research Registry`;

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Scroll listener for reading progress & visibility threshold
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate scroll progress percentage (0 - 100)
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100)));
        setReadingProgress(progress);
      }

      // Show floating menu once scrolled slightly down into the article (e.g. 150px)
      setIsVisible(scrollY > 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      if (onCopyLinkNotification) {
        onCopyLinkNotification('Article link copied to clipboard');
      }
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setIsMobileOpen(false);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const sharePlatforms = [
    {
      id: 'copy-link',
      name: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? Check : Link2,
      onClick: handleCopyLink,
      color: copied ? 'text-green-400' : 'text-paper/70 hover:text-paper',
      bgColor: copied ? 'bg-green-950/40 border-green-500/40' : 'hover:bg-blood/20 hover:border-blood/40',
      activeColor: 'bg-green-500',
      description: 'Copy URL to clipboard'
    },
    {
      id: 'twitter-x',
      name: 'X (Twitter)',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + ' ' + shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'text-paper/70 hover:text-[#1DA1F2]',
      bgColor: 'hover:bg-[#1DA1F2]/15 hover:border-[#1DA1F2]/40',
      description: 'Post to X / Twitter'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'text-paper/70 hover:text-[#0077B5]',
      bgColor: 'hover:bg-[#0077B5]/15 hover:border-[#0077B5]/40',
      description: 'Share with professional network'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageSquare,
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareTitle + '\n' + shareUrl)}`,
      color: 'text-paper/70 hover:text-[#25D366]',
      bgColor: 'hover:bg-[#25D366]/15 hover:border-[#25D366]/40',
      description: 'Send via WhatsApp message'
    },
    {
      id: 'email',
      name: 'Email Dispatch',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
      color: 'text-paper/70 hover:text-amber-300',
      bgColor: 'hover:bg-amber-500/15 hover:border-amber-400/40',
      description: 'Send scholarly citation via Email'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      color: 'text-paper/70 hover:text-[#229ED9]',
      bgColor: 'hover:bg-[#229ED9]/15 hover:border-[#229ED9]/40',
      description: 'Share to Telegram channel or contact'
    }
  ];

  return (
    <>
      {/* =========================================================================
          DESKTOP FLOATING SIDEBAR RAIL (Visible on md/lg screens and above)
          Positioned on the left side of the reader viewport with smooth transitions
          ========================================================================= */}
      <AnimatePresence>
        {isVisible && (
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="hidden md:flex fixed left-3 lg:left-6 xl:left-10 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 select-none"
            aria-label="Article Share and Reading Toolbar"
            id="desktop-floating-share-rail"
          >
            {/* Main Floating Tool Container */}
            <div className="bg-[#0e0e0e]/95 backdrop-blur-md border border-paper/15 p-2 rounded-full shadow-2xl flex flex-col items-center gap-2">
              
              {/* Reading Progress Indicator Circle */}
              <div 
                className="relative w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-paper/10 mb-0.5 group"
                title={`${readingProgress}% article read`}
                id="reading-progress-indicator"
              >
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-paper/10"
                    strokeWidth="2.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blood transition-all duration-150"
                    strokeDasharray={`${readingProgress}, 100`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono text-[8px] text-paper/70 font-semibold">
                  {readingProgress}%
                </span>

                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-black/90 border border-paper/15 rounded text-[9px] font-mono text-paper/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {readingProgress}% read
                </div>
              </div>

              <div className="w-4 h-px bg-paper/10 my-0.5" />

              {/* Bookmark Action (if callback passed) */}
              {onBookmarkToggle && (
                <div className="relative group">
                  <button
                    onClick={onBookmarkToggle}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                      isBookmarked
                        ? 'bg-blood/25 border-blood text-blood-light'
                        : 'border-transparent hover:border-paper/20 hover:bg-paper/10 text-paper/60 hover:text-paper'
                    }`}
                    title={isBookmarked ? 'Remove from Reading Stack' : 'Save to Reading Stack'}
                    id="floating-bookmark-btn"
                  >
                    <Bookmark size={15} className={isBookmarked ? 'fill-blood' : ''} />
                  </button>

                  {/* Tooltip */}
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#111] border border-paper/20 rounded shadow-lg text-[10px] font-sans text-paper/85 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex items-center gap-1">
                    <span>{isBookmarked ? 'Saved in Reading Stack' : 'Save to Reading Stack'}</span>
                  </div>
                </div>
              )}

              {/* Social & Sharing Platforms */}
              {sharePlatforms.map((platform) => {
                const IconComponent = platform.icon;
                const isHovered = hoveredPlatform === platform.id;

                if (platform.onClick) {
                  return (
                    <div key={platform.id} className="relative group">
                      <button
                        onClick={platform.onClick}
                        onMouseEnter={() => setHoveredPlatform(platform.id)}
                        onMouseLeave={() => setHoveredPlatform(null)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center border border-transparent ${platform.bgColor} ${platform.color} transition-all duration-200 cursor-pointer`}
                        title={platform.name}
                        id={`floating-share-${platform.id}`}
                      >
                        <IconComponent size={15} />
                      </button>

                      {/* Tooltip */}
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#111] border border-paper/20 rounded shadow-lg text-[10px] font-sans text-paper/85 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex items-center gap-1.5">
                        <span className="font-semibold">{platform.name}</span>
                        {platform.id === 'copy-link' && copied && (
                          <span className="text-green-400 font-mono text-[9px]">✓ Saved</span>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={platform.id} className="relative group">
                    <a
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onMouseEnter={() => setHoveredPlatform(platform.id)}
                      onMouseLeave={() => setHoveredPlatform(null)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center border border-transparent ${platform.bgColor} ${platform.color} transition-all duration-200 cursor-pointer`}
                      title={platform.name}
                      id={`floating-share-${platform.id}`}
                    >
                      <IconComponent size={15} />
                    </a>

                    {/* Tooltip */}
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#111] border border-paper/20 rounded shadow-lg text-[10px] font-sans text-paper/85 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <span className="font-semibold">{platform.name}</span>
                    </div>
                  </div>
                );
              })}

              {/* Native Share Sheet Button (if available) */}
              {canNativeShare && (
                <div className="relative group">
                  <button
                    onClick={handleNativeShare}
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-transparent hover:bg-blood/20 hover:border-blood/40 text-paper/70 hover:text-paper transition-all duration-200 cursor-pointer"
                    title="More Device Share Options"
                    id="floating-share-native-device"
                  >
                    <Share2 size={14} />
                  </button>

                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#111] border border-paper/20 rounded shadow-lg text-[10px] font-sans text-paper/85 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <span className="font-semibold">Device Share Sheet</span>
                  </div>
                </div>
              )}

              <div className="w-4 h-px bg-paper/10 my-0.5" />

              {/* Quick Scroll to Top */}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-7 h-7 rounded-full flex items-center justify-center text-paper/40 hover:text-paper hover:bg-paper/10 transition-colors cursor-pointer"
                title="Scroll back to top"
                id="floating-scroll-top-btn"
              >
                <ChevronUp size={14} />
              </button>

            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MOBILE FLOATING ACTION MENU (Visible on small & mobile viewports)
          Fixed in the bottom-right corner with smooth expandable action tray
          ========================================================================= */}
      <div className="md:hidden fixed bottom-6 right-4 z-40 select-none" id="mobile-floating-share-container">
        <AnimatePresence>
          {isMobileOpen && (
            <>
              {/* Tap-outside backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30"
              />

              {/* Expanded Action Menu Sheet */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute bottom-14 right-0 w-64 bg-[#0d0d0d] border border-paper/20 rounded-lg shadow-2xl p-2.5 z-40 flex flex-col gap-1 text-paper"
              >
                {/* Header with Reading Progress */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-paper/10 mb-1">
                  <span className="font-sans text-[9px] font-extrabold uppercase tracking-widest text-paper/40">
                    Share Investigation
                  </span>
                  <span className="font-mono text-[9px] text-blood-light font-bold">
                    {readingProgress}% Read
                  </span>
                </div>

                {/* Option: Copy Link */}
                <button
                  onClick={() => {
                    handleCopyLink();
                    setTimeout(() => setIsMobileOpen(false), 900);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-paper/5 active:bg-paper/10 text-left cursor-pointer transition-colors"
                  id="mobile-share-copylink"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-paper/5 flex items-center justify-center">
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={13} className="text-paper/80" />}
                    </div>
                    <span className="font-serif text-xs text-paper/90">
                      {copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-paper/40">URL</span>
                </button>

                {/* Option: Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-paper/5 active:bg-paper/10 text-left cursor-pointer transition-colors"
                  id="mobile-share-email"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Mail size={13} className="text-amber-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-xs text-paper/90">Email Analysis</span>
                    <span className="font-mono text-[8px] text-paper/40">Send via Mail client</span>
                  </div>
                </a>

                {/* Option: WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareTitle + '\n' + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-paper/5 active:bg-paper/10 text-left cursor-pointer transition-colors"
                  id="mobile-share-whatsapp"
                >
                  <div className="w-7 h-7 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                    <MessageSquare size={13} className="text-[#25D366]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-xs text-paper/90">WhatsApp</span>
                    <span className="font-mono text-[8px] text-paper/40">Send to chat or status</span>
                  </div>
                </a>

                {/* Option: X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + ' ' + shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-paper/5 active:bg-paper/10 text-left cursor-pointer transition-colors"
                  id="mobile-share-twitter"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center">
                    <Twitter size={13} className="text-[#1DA1F2]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-xs text-paper/90">X (Twitter)</span>
                    <span className="font-mono text-[8px] text-paper/40">Post tweet</span>
                  </div>
                </a>

                {/* Option: LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-paper/5 active:bg-paper/10 text-left cursor-pointer transition-colors"
                  id="mobile-share-linkedin"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0077B5]/10 flex items-center justify-center">
                    <Linkedin size={13} className="text-[#0077B5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-xs text-paper/90">LinkedIn</span>
                    <span className="font-mono text-[8px] text-paper/40">Share scholarly post</span>
                  </div>
                </a>

                {/* Option: Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileOpen(false)}
                  className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-paper/5 active:bg-paper/10 text-left cursor-pointer transition-colors"
                  id="mobile-share-telegram"
                >
                  <div className="w-7 h-7 rounded-full bg-[#229ED9]/10 flex items-center justify-center">
                    <Send size={13} className="text-[#229ED9]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-xs text-paper/90">Telegram</span>
                    <span className="font-mono text-[8px] text-paper/40">Forward to contact</span>
                  </div>
                </a>

                {/* Native OS Device Share Trigger */}
                {canNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-between p-2 rounded bg-blood/15 hover:bg-blood/25 border border-blood/30 mt-1 cursor-pointer transition-colors"
                    id="mobile-share-devicesheet"
                  >
                    <div className="flex items-center gap-2.5">
                      <Share2 size={13} className="text-blood-light" />
                      <span className="font-sans text-[10px] uppercase font-bold tracking-wider text-paper">
                        More Device Options
                      </span>
                    </div>
                    <span className="font-mono text-[8px] text-blood-light">Native</span>
                  </button>
                )}

              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Mobile Trigger Button */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`w-12 h-12 rounded-full border shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
            isMobileOpen 
              ? 'bg-blood border-paper/30 text-paper rotate-90' 
              : 'bg-[#111]/95 backdrop-blur-md border-blood/60 text-paper hover:bg-blood/20'
          }`}
          title="Share this article"
          id="mobile-floating-share-fab"
        >
          {isMobileOpen ? (
            <X size={18} />
          ) : (
            <div className="relative flex items-center justify-center">
              <Share2 size={18} className="text-blood-light" />
              {readingProgress > 5 && (
                <svg className="absolute -inset-2.5 w-11 h-11 -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                  <path
                    className="text-blood transition-all duration-200"
                    strokeDasharray={`${readingProgress}, 100`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              )}
            </div>
          )}
        </motion.button>
      </div>
    </>
  );
}
