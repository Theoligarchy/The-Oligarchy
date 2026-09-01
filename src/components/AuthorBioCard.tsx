import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Building2, 
  ExternalLink, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Users, 
  Award, 
  Sparkles,
  ChevronRight,
  Share2,
  Copy,
  Check,
  Twitter,
  Linkedin,
  Globe,
  Instagram,
  GraduationCap,
  MessageSquare,
  Mail,
  Quote,
  X
} from 'lucide-react';
import { Article, AuthorProfile, CoAuthor } from '../types';
import { DEFAULT_FOUNDER_PROFILE, resolveAuthorSocialLinks } from './ContributorsSection';
import { getArticleAuthors, normalizeOrcid, getOrcidUrl } from '../utils/citationEngine';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface AuthorBioCardProps {
  currentArticle: Article;
  allArticles: Article[];
  contributors?: AuthorProfile[];
  onSelectArticle: (article: Article) => void;
  onSelectContributor?: (contributorIdOrName: string) => void;
}

export default function AuthorBioCard({
  currentArticle,
  allArticles,
  contributors = [],
  onSelectArticle,
  onSelectContributor
}: AuthorBioCardProps) {
  // Extract all attributed authors for this article (Primary + CoAuthors)
  const authorsList = useMemo(() => {
    return getArticleAuthors(currentArticle);
  }, [currentArticle]);

  // Active author index for switching between multiple co-investigators if present
  const [activeAuthorIndex, setActiveAuthorIndex] = useState<number>(0);

  // Share menu state
  const [isShareMenuOpen, setIsShareMenuOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCitation, setCopiedCitation] = useState<boolean>(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Current active author summary info
  const activeAuthor = authorsList[activeAuthorIndex] || authorsList[0] || {
    name: currentArticle.authorName || 'Priyasha Priyal Jena',
    role: 'Founder & Editor-in-Chief',
    institution: undefined,
    orcid: currentArticle.authorOrcid
  };

  // Resolve matching rich profile from contributors registry or fallback to founder profile
  const matchedProfile = useMemo<AuthorProfile>(() => {
    const authorName = (activeAuthor.name || '').trim().toLowerCase();
    const authorId = currentArticle.authorId?.trim().toLowerCase();

    // 1. Try matching by ID if active is primary author
    if (activeAuthorIndex === 0 && authorId) {
      const byId = contributors.find(c => c.id.toLowerCase() === authorId);
      if (byId) return byId;
    }

    // 2. Try matching by Name across contributors registry
    const byName = contributors.find(
      c => c.name.toLowerCase().trim() === authorName ||
           (c.slug && c.slug.toLowerCase() === authorName.replace(/\s+/g, '-'))
    );
    if (byName) return byName;

    // 3. If matching founder by name or default
    if (authorName.includes('priyasha') || authorName === 'priyasha priyal jena' || (!authorName && activeAuthorIndex === 0)) {
      return DEFAULT_FOUNDER_PROFILE;
    }

    // 4. Construct dynamic profile for co-author / guest researcher
    return {
      id: activeAuthor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: activeAuthor.name,
      role: activeAuthor.role || undefined,
      institution: activeAuthor.institution,
      orcid: activeAuthor.orcid,
      bio: activeAuthor.bio || undefined,
      socials: {},
      researchAreas: activeAuthor.researchAreas || currentArticle.tags || [],
      isFounder: false
    };
  }, [activeAuthor, activeAuthorIndex, currentArticle, contributors]);

  // Close share menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close share menu when active author changes
  useEffect(() => {
    setIsShareMenuOpen(false);
    setCopiedLink(false);
    setCopiedCitation(false);
  }, [activeAuthorIndex]);

  // Find other published works by the active researcher (excluding the current article)
  const otherWorks = useMemo<Article[]>(() => {
    const targetName = (activeAuthor.name || matchedProfile.name || '').trim().toLowerCase();
    const targetId = (matchedProfile.id || '').trim().toLowerCase();
    const isFounder = matchedProfile.isFounder || targetName.includes('priyasha');

    return allArticles.filter(art => {
      // Must be published and distinct from the current article
      if (art.status !== 'published' || art.id === currentArticle.id) {
        return false;
      }

      const artAuthorName = (art.authorName || '').trim().toLowerCase();
      const artAuthorId = (art.authorId || '').trim().toLowerCase();

      // Check primary author ID match
      if (targetId && artAuthorId && artAuthorId === targetId) {
        return true;
      }

      // Check primary author Name match
      if (targetName && artAuthorName && artAuthorName === targetName) {
        return true;
      }

      // Check if target author is in coAuthors list
      if (Array.isArray(art.coAuthors) && art.coAuthors.some(ca => ca.name && ca.name.trim().toLowerCase() === targetName)) {
        return true;
      }

      // If founder, also match default/unassigned founder treatises
      if (isFounder && (!artAuthorName || artAuthorName.includes('priyasha'))) {
        return true;
      }

      return false;
    });
  }, [allArticles, currentArticle.id, activeAuthor, matchedProfile]);

  const orcidUrl = getOrcidUrl(matchedProfile.orcid || activeAuthor.orcid);
  const normalizedOrcid = normalizeOrcid(matchedProfile.orcid || activeAuthor.orcid);

  // Resolve social, networking, and personal website links for the active author profile
  const authorSocials = useMemo(() => {
    const res = resolveAuthorSocialLinks(matchedProfile);
    // If founder and no specific external website specified, link to publication domain
    if (matchedProfile.isFounder && !res.portfolioUrl) {
      res.portfolioUrl = 'https://theoligarchy.in';
      res.hasAnySocial = true;
    }
    return res;
  }, [matchedProfile]);

  // Generate Author Profile Share URL
  const baseOrigin = (
    window.location.origin.includes('run.app') || 
    window.location.origin.includes('localhost') || 
    window.location.origin.includes('127.0.0.1')
  ) ? 'https://theoligarchy.in' : window.location.origin;

  const authorSlug = matchedProfile.slug || matchedProfile.id || matchedProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const authorShareUrl = `${baseOrigin}/?tab=contributors&author=${encodeURIComponent(authorSlug)}`;
  const authorShareTitle = `${matchedProfile.name} — Scholar Profile & Treatises | The Oligarchy`;
  const authorShareText = `Explore forensic investigations, behavioral research, and publications by ${matchedProfile.name} on The Oligarchy:`;

  const citationSnippet = `${matchedProfile.name}. (${new Date().getFullYear()}). Scholar Profile & Research Index. The Oligarchy Research Registry. ${authorShareUrl}`;

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(authorShareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = authorShareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy author profile link: ', err);
    }
  };

  const handleCopyCitation = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(citationSnippet);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = citationSnippet;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2200);
    } catch (err) {
      console.error('Failed to copy author citation: ', err);
    }
  };

  const handleNativeShare = async () => {
    if (canNativeShare) {
      try {
        const shareData = {
          title: authorShareTitle,
          text: authorShareText,
          url: authorShareUrl,
        };
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setIsShareMenuOpen(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed: ', err);
        }
      }
    }
  };

  const handleArticleClick = (art: Article) => {
    onSelectArticle(art);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDossier = () => {
    if (onSelectContributor) {
      onSelectContributor(matchedProfile.id || matchedProfile.name);
    }
  };

  return (
    <section 
      id="author-bio-section"
      className="author-bio-card group/card bg-navy/90 border border-paper/15 hover:border-paper/30 hover:shadow-2xl hover:shadow-black/50 rounded-sm p-6 sm:p-8 mt-12 shadow-xl select-text relative transition-all duration-300 ease-out"
      aria-label="Author biography and additional publications"
    >
      {/* Subtle background highlight watermark */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blood/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 overflow-hidden" />

      {/* Multi-Author Tabs (if more than 1 author on this paper) */}
      {authorsList.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-paper/10 relative z-10">
          <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-blood flex items-center gap-1.5 mr-2">
            <Users size={12} />
            Attributed Scholars:
          </span>
          {authorsList.map((auth, idx) => {
            const isSelected = idx === activeAuthorIndex;
            return (
              <button
                key={idx}
                onClick={() => setActiveAuthorIndex(idx)}
                className={`font-sans text-[10px] font-semibold px-3 py-1.5 rounded-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blood text-paper border border-blood shadow-sm'
                    : 'bg-paper/5 text-paper/70 hover:bg-paper/10 border border-paper/10 hover:text-paper'
                }`}
              >
                <span>{auth.name}</span>
                {idx === 0 && (
                  <span className={`text-[8px] uppercase tracking-wider px-1 py-0.2 rounded-xs ${
                    isSelected ? 'bg-black/30 text-paper' : 'bg-blood/20 text-blood-light'
                  }`}>
                    Lead
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Author Bio Card Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start relative z-10">
        {/* Author Avatar / Initial Monogram */}
        <div className="shrink-0">
          {matchedProfile.avatarUrl || matchedProfile.profileImage ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-paper/20 shadow-md bg-black/40">
              <img
                src={getOptimizedImageUrl(matchedProfile.avatarUrl || matchedProfile.profileImage!, 'avatar')}
                alt={matchedProfile.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blood to-blood-dark text-paper flex items-center justify-center font-display text-2xl sm:text-3xl font-bold rounded-full border-2 border-paper/20 shadow-md shrink-0 select-none">
              {matchedProfile.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Author Bio Details */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-lg sm:text-xl font-bold text-paper tracking-tight">
                  {matchedProfile.name}
                </h3>
                {matchedProfile.isFounder && (
                  <span className="font-sans text-[8px] font-bold uppercase tracking-widest bg-blood/20 text-red-300 border border-blood/40 px-2 py-0.5 rounded-xs">
                    Founder
                  </span>
                )}
              </div>

              {matchedProfile.role && (
                <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-blood-light mt-0.5">
                  {matchedProfile.role}
                </p>
              )}

              {/* Author Networking & Social Media Links */}
              {authorSocials.hasAnySocial && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap" id="author-social-links-row" aria-label="Author social and professional profiles">
                  {authorSocials.twitterUrl && (
                    <a
                      href={authorSocials.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-xs bg-paper/5 group-hover/card:bg-paper/[0.08] group-hover/card:border-paper/20 hover:!bg-[#1DA1F2]/20 border border-paper/10 hover:!border-[#1DA1F2]/60 text-paper/60 hover:!text-[#1DA1F2] hover:scale-115 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(29,161,242,0.45)] flex items-center justify-center transition-all duration-200 ease-out group"
                      title={`Connect with ${matchedProfile.name} on Twitter / X`}
                      aria-label={`Twitter profile of ${matchedProfile.name}`}
                    >
                      <Twitter size={11} className="transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  )}

                  {authorSocials.linkedinUrl && (
                    <a
                      href={authorSocials.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-xs bg-paper/5 group-hover/card:bg-paper/[0.08] group-hover/card:border-paper/20 hover:!bg-[#0077B5]/20 border border-paper/10 hover:!border-[#0077B5]/60 text-paper/60 hover:!text-[#0077B5] hover:scale-115 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(0,119,181,0.45)] flex items-center justify-center transition-all duration-200 ease-out group"
                      title={`Connect with ${matchedProfile.name} on LinkedIn`}
                      aria-label={`LinkedIn profile of ${matchedProfile.name}`}
                    >
                      <Linkedin size={11} className="transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  )}

                  {authorSocials.portfolioUrl && (
                    <a
                      href={authorSocials.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-xs bg-paper/5 group-hover/card:bg-paper/[0.08] group-hover/card:border-paper/20 hover:!bg-blood/25 border border-paper/10 hover:!border-blood/60 text-paper/60 hover:!text-paper hover:scale-115 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(139,26,26,0.55)] flex items-center justify-center transition-all duration-200 ease-out group"
                      title={`Visit ${matchedProfile.name}'s Personal Website / Portfolio`}
                      aria-label={`Personal website of ${matchedProfile.name}`}
                    >
                      <Globe size={11} className="transition-transform duration-200 group-hover:scale-110 text-paper/70 group-hover:text-blood-light" />
                    </a>
                  )}

                  {authorSocials.instagramUrl && (
                    <a
                      href={authorSocials.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-xs bg-paper/5 group-hover/card:bg-paper/[0.08] group-hover/card:border-paper/20 hover:!bg-[#E1306C]/20 border border-paper/10 hover:!border-[#E1306C]/60 text-paper/60 hover:!text-[#E1306C] hover:scale-115 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(225,48,108,0.45)] flex items-center justify-center transition-all duration-200 ease-out group"
                      title={`Follow ${matchedProfile.name} on Instagram`}
                      aria-label={`Instagram profile of ${matchedProfile.name}`}
                    >
                      <Instagram size={11} className="transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  )}

                  {authorSocials.googleScholarUrl && (
                    <a
                      href={authorSocials.googleScholarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-xs bg-paper/5 group-hover/card:bg-paper/[0.08] group-hover/card:border-paper/20 hover:!bg-amber-500/20 border border-paper/10 hover:!border-amber-500/60 text-paper/60 hover:!text-amber-300 hover:scale-115 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(245,158,11,0.45)] flex items-center justify-center transition-all duration-200 ease-out group"
                      title={`View ${matchedProfile.name}'s Google Scholar profile`}
                      aria-label={`Google Scholar profile of ${matchedProfile.name}`}
                    >
                      <GraduationCap size={12} className="transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  )}

                  {authorSocials.emailUrl && (
                    <a
                      href={authorSocials.emailUrl}
                      className="w-7 h-7 rounded-xs bg-paper/5 group-hover/card:bg-paper/[0.08] group-hover/card:border-paper/20 hover:!bg-emerald-500/20 border border-paper/10 hover:!border-emerald-500/60 text-paper/60 hover:!text-emerald-300 hover:scale-115 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(16,185,129,0.45)] flex items-center justify-center transition-all duration-200 ease-out group"
                      title={`Email ${matchedProfile.name}`}
                      aria-label={`Email ${matchedProfile.name}`}
                    >
                      <Mail size={11} className="transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Header Action Buttons (Share Author Profile & Scholar Dossier) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Share Author Profile Dropdown Trigger */}
              <div className="relative inline-block text-left" ref={shareMenuRef} id="author-share-container">
                <button
                  id="author-share-button"
                  onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                  className={`font-sans text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all duration-200 cursor-pointer border select-none ${
                    isShareMenuOpen 
                      ? 'bg-blood text-paper border-blood shadow-md' 
                      : 'bg-paper/5 hover:bg-blood/20 text-paper/75 hover:text-paper border-paper/15 hover:border-blood/50'
                  }`}
                  title={`Share ${matchedProfile.name}'s scholar profile`}
                  aria-expanded={isShareMenuOpen}
                  aria-haspopup="true"
                >
                  {copiedLink ? (
                    <Check size={11} className="text-green-400 shrink-0" />
                  ) : (
                    <Share2 size={11} className={isShareMenuOpen ? 'text-paper shrink-0' : 'text-blood-light shrink-0'} />
                  )}
                  <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
                </button>

                {/* Dropdown Mini-Menu for Sharing the Author's Profile */}
                <AnimatePresence>
                  {isShareMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-64 sm:w-72 rounded-sm bg-navy border border-paper/20 shadow-2xl z-50 overflow-hidden select-none text-left"
                      id="author-share-dropdown"
                    >
                      {/* Mini-Menu Header */}
                      <div className="border-b border-paper/10 bg-black/40 px-3.5 py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-sans text-[8px] font-extrabold uppercase tracking-[0.25em] text-blood-light block">
                            Scholar Profile
                          </span>
                          <span className="font-display text-xs font-bold text-paper truncate max-w-[180px] block">
                            {matchedProfile.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setIsShareMenuOpen(false)}
                          className="text-paper/40 hover:text-paper p-1 rounded-sm hover:bg-paper/5 transition-colors cursor-pointer"
                          title="Close share menu"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Mini-Menu Action Options */}
                      <div className="p-1 flex flex-col gap-0.5">
                        {/* Option 1: Copy Profile URL */}
                        <button
                          onClick={handleCopyLink}
                          className="w-full text-left px-3 py-2 hover:bg-paper/[0.04] active:bg-paper/[0.08] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                          id="author-share-copy-link"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-blood/20 transition-colors">
                              {copiedLink ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-paper/60" />}
                            </div>
                            <span className="font-serif text-xs">
                              {copiedLink ? 'Profile Link Copied!' : 'Copy Profile Link'}
                            </span>
                          </div>
                          <span className="font-mono text-[8px] text-paper/30 group-hover:text-paper/50">URL</span>
                        </button>

                        {/* Option 2: Share on Twitter / X */}
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(authorShareText)}&url=${encodeURIComponent(authorShareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsShareMenuOpen(false)}
                          className="w-full px-3 py-2 hover:bg-paper/[0.04] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                          id="author-share-twitter"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#1DA1F2]/20 transition-colors">
                              <Twitter size={11} className="text-paper/60 group-hover:text-[#1DA1F2]" />
                            </div>
                            <span className="font-serif text-xs">Share on Twitter / X</span>
                          </div>
                          <ChevronRight size={10} className="text-paper/20" />
                        </a>

                        {/* Option 3: Share on LinkedIn */}
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(authorShareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsShareMenuOpen(false)}
                          className="w-full px-3 py-2 hover:bg-paper/[0.04] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                          id="author-share-linkedin"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#0077B5]/20 transition-colors">
                              <Linkedin size={11} className="text-paper/60 group-hover:text-[#0077B5]" />
                            </div>
                            <span className="font-serif text-xs">Post on LinkedIn</span>
                          </div>
                          <ChevronRight size={10} className="text-paper/20" />
                        </a>

                        {/* Option 4: Send via WhatsApp */}
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(authorShareText + '\n' + authorShareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsShareMenuOpen(false)}
                          className="w-full px-3 py-2 hover:bg-paper/[0.04] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                          id="author-share-whatsapp"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors">
                              <MessageSquare size={11} className="text-paper/60 group-hover:text-[#25D366]" />
                            </div>
                            <span className="font-serif text-xs">Send on WhatsApp</span>
                          </div>
                          <ChevronRight size={10} className="text-paper/20" />
                        </a>

                        {/* Option 5: Email Dispatch */}
                        <a
                          href={`mailto:?subject=${encodeURIComponent(authorShareTitle)}&body=${encodeURIComponent(authorShareText + '\n\n' + (matchedProfile.bio || '') + '\n\nAccess scholar dossier & treatises:\n' + authorShareUrl + '\n\n— The Oligarchy Research Registry')}`}
                          onClick={() => setIsShareMenuOpen(false)}
                          className="w-full px-3 py-2 hover:bg-paper/[0.04] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                          id="author-share-email"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                              <Mail size={11} className="text-paper/60 group-hover:text-amber-300" />
                            </div>
                            <span className="font-serif text-xs">Share via Email</span>
                          </div>
                          <ChevronRight size={10} className="text-paper/20" />
                        </a>

                        {/* Option 6: Copy Citation Reference */}
                        <button
                          onClick={handleCopyCitation}
                          className="w-full text-left px-3 py-2 border-t border-paper/10 hover:bg-paper/[0.04] active:bg-paper/[0.08] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                          id="author-share-citation"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-paper/5 flex items-center justify-center group-hover:bg-blood/20 transition-colors">
                              {copiedCitation ? <Check size={11} className="text-green-400" /> : <Quote size={11} className="text-paper/60" />}
                            </div>
                            <span className="font-serif text-xs">
                              {copiedCitation ? 'Citation Copied!' : 'Copy Scholar Citation'}
                            </span>
                          </div>
                          <span className="font-mono text-[8px] text-paper/30">Cite</span>
                        </button>

                        {/* Option 7: Device Native Share (if available) */}
                        {canNativeShare && (
                          <button
                            onClick={handleNativeShare}
                            className="w-full text-left px-3 py-2 border-t border-paper/10 hover:bg-paper/[0.04] rounded-sm transition-colors flex items-center justify-between text-paper/85 hover:text-paper cursor-pointer group"
                            id="author-share-native"
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
              </div>

              {/* Quick Contributor Dossier Action */}
              {onSelectContributor && (
                <button
                  onClick={handleViewDossier}
                  className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/70 hover:text-blood flex items-center gap-1 bg-paper/5 hover:bg-paper/10 border border-paper/15 px-2.5 py-1.5 rounded-sm transition-colors cursor-pointer"
                  title={`View ${matchedProfile.name}'s complete scholar dossier and CV`}
                >
                  <span>Scholar Dossier</span>
                  <ArrowRight size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Affiliated Institution */}
          {(matchedProfile.institution || activeAuthor.institution) && (
            <div className="flex items-center gap-1.5 text-paper/60 font-serif text-xs">
              <Building2 size={12} className="text-paper/40 shrink-0" />
              <span>{matchedProfile.institution || activeAuthor.institution}</span>
            </div>
          )}

          {/* Biography Text */}
          {matchedProfile.bio && (
            <p className="font-serif text-xs sm:text-sm text-paper/70 leading-relaxed mt-1">
              {matchedProfile.bio}
            </p>
          )}

          {/* Research Areas / Specialization Badges & ORCID */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-paper/10">
            {/* Verified ORCID Badge */}
            {orcidUrl && (
              <a
                href={orcidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#a6ce39] hover:text-[#b8e046] font-mono text-[9px] font-bold bg-[#a6ce39]/10 border border-[#a6ce39]/30 px-2 py-0.5 rounded-sm transition-colors"
                title={`Verified ORCID record: ${normalizedOrcid}`}
              >
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M128,0A128,128,0,1,0,256,128,128,128,0,0,0,128,0ZM86.37,186.25H60.08V73.49h26.29Zm-13.14-126a15.35,15.35,0,1,1,15.35-15.35A15.35,15.35,0,0,1,73.23,60.25Zm122.9,91.8c0,22.25-17.75,34.2-46.7,34.2H109.84V73.49h40.35c27.1,0,45.94,14.65,45.94,37.35,0,13.79-8.4,26.47-21.75,32.32C188.08,128.51,196.13,140.48,196.13,152.05Zm-26.65,0c0-12.87-9.5-20.7-25.55-20.7H133.72v41.4h10.21C159.98,172.75,169.48,164.92,169.48,152.05Zm-4.9-46.35c0-11.45-8.5-18.4-22.75-18.4H133.72v36.8h8.11C156.08,124.1,164.58,117.15,164.58,105.7Z"/>
                </svg>
                <span>{normalizedOrcid}</span>
                <ExternalLink size={9} />
              </a>
            )}

            {/* Research Area Tags */}
            {((matchedProfile.researchAreas && matchedProfile.researchAreas.length > 0) ? matchedProfile.researchAreas : (matchedProfile.specializations || [])).slice(0, 4).map((area, idx) => (
              <span 
                key={idx}
                className="font-mono text-[9px] text-paper/50 bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-xs"
              >
                #{area}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MORE BY THIS AUTHOR SECTION */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="mt-8 pt-6 border-t border-paper/15 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blood shrink-0" />
            <h4 className="font-display text-sm sm:text-base font-bold text-paper tracking-wide">
              More by this Author
            </h4>
            <span className="font-mono text-[9px] uppercase tracking-wider bg-blood/10 text-blood-light border border-blood/20 px-2 py-0.5 rounded-xs">
              {otherWorks.length} {otherWorks.length === 1 ? 'Treatise' : 'Treatises'}
            </span>
          </div>

          <span className="font-sans text-[9px] text-paper/40 italic">
            Other published investigations &amp; research papers by {matchedProfile.name}
          </span>
        </div>

        {otherWorks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherWorks.map((work) => {
              const isCoAuthor = Array.isArray(work.coAuthors) && work.coAuthors.some(
                ca => ca.name && ca.name.toLowerCase().trim() === matchedProfile.name.toLowerCase().trim()
              );

              return (
                <div
                  key={work.id}
                  onClick={() => handleArticleClick(work)}
                  className="group bg-paper/[0.02] hover:bg-paper/[0.05] border border-paper/10 hover:border-blood/40 rounded-sm p-4.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Category & Read Time header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-sans text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border ${
                          work.category === 'criminology' 
                            ? 'bg-red-950/20 text-red-400 border-red-900/30' 
                            : work.category === 'psyche'
                            ? 'bg-purple-950/20 text-purple-300 border-purple-900/30'
                            : 'bg-blue-950/20 text-blue-300 border-blue-900/30'
                        }`}>
                          {work.category}
                        </span>

                        {isCoAuthor && (
                          <span className="font-sans text-[8px] font-semibold text-blood-light bg-blood/10 border border-blood/20 px-1.5 py-0.2 rounded-xs">
                            Co-Investigator
                          </span>
                        )}

                        {work.seriesName && (
                          <span className="font-sans text-[8px] text-paper/40 bg-paper/5 px-1.5 py-0.2 rounded-xs">
                            Series: {work.seriesName}
                          </span>
                        )}
                      </div>

                      <span className="font-sans text-[9px] text-paper/40 flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {work.readTime || '8 min read'}
                      </span>
                    </div>

                    {/* Treatise Title */}
                    <h5 className="font-display text-sm font-bold text-paper group-hover:text-blood transition-colors leading-snug mb-1.5 line-clamp-2">
                      {work.title}
                    </h5>

                    {/* Excerpt / Abstract snippet */}
                    {work.excerpt && (
                      <p className="font-serif text-xs text-paper/60 leading-relaxed line-clamp-2 mb-3">
                        {work.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Footer metadata & action prompt */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-paper/5 text-paper/40 font-sans text-[9px]">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {work.publishDate || (work.createdAt ? new Date(work.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Archive Record')}
                    </span>

                    <span className="font-sans font-bold uppercase tracking-wider text-blood group-hover:text-blood-light group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                      <span>Read Treatise</span>
                      <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-paper/[0.02] border border-dashed border-paper/15 rounded-sm p-5 text-center flex flex-col items-center justify-center gap-2">
            <p className="font-serif text-xs text-paper/50 italic max-w-md">
              This is currently the sole registered treatise by {matchedProfile.name} in The Oligarchy research archive.
            </p>
            {onSelectContributor && (
              <button
                onClick={handleViewDossier}
                className="font-sans text-[9px] font-bold uppercase tracking-wider text-blood hover:text-blood-light mt-1 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Browse {matchedProfile.name}&apos;s Profile &amp; Research Focus</span>
                <ArrowRight size={10} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
