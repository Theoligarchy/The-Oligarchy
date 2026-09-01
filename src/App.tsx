import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { db, auth, seedInitialDataIfEmpty, fetchArticlePreviews, fetchFullArticle } from './firebase';
import { INITIAL_SEED_ARTICLES, INITIAL_SEED_READING } from './data/initialSeed';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  addDoc,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Article, ReadingItem, AuthorProfile, SavedArticle, SiteSettings } from './types';
import { fetchSiteSettings, getCachedSiteSettings, DEFAULT_SITE_SETTINGS } from './utils/siteSettings';

// Import modular subcomponents
import Header from './components/Header';
import Footer, { SOCIAL_LINKS } from './components/Footer';
import ArticleCard from './components/ArticleCard';
import FeaturedResearch from './components/FeaturedResearch';
import SourcesSection from './components/SourcesSection';
import ReadingStack from './components/ReadingStack';
import AboutSection from './components/AboutSection';
import EditorialPrinciples from './components/EditorialPrinciples';
import ContactSection from './components/ContactSection';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import CanvaEmbed from './components/CanvaEmbed';
import ShareMenu from './components/ShareMenu';
import ContributorsSection from './components/ContributorsSection';
import ReadingListDashboard from './components/ReadingListDashboard';
import BookmarkButton from './components/BookmarkButton';
import ArticleSkeleton from './components/ArticleSkeleton';
import ManuscriptSubmissionPortal from './components/ManuscriptSubmissionPortal';
import CitationGenerator from './components/CitationGenerator';
import MultiAuthorAttribution from './components/MultiAuthorAttribution';
import ContributorDashboard from './components/ContributorDashboard';
import { 
  fetchUserSavedArticles, 
  saveArticleToReadingList, 
  removeArticleFromReadingList, 
  toggleArticleReadStatus, 
  updateArticleNote 
} from './utils/savedArticles';
import { motion, AnimatePresence } from 'motion/react';
import { getOptimizedImageUrl } from './utils/imageOptimizer';
import { getCachedArticles, setCachedArticles } from './utils/articleCache';
import { fetchContributors } from './utils/contributors';


import { 
  BookOpen, 
  Newspaper, 
  Eye, 
  Clock, 
  Mail, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Download, 
  FileText, 
  ArrowLeft,
  Search,
  CheckCircle2,
  Calendar,
  Award,
  MessageSquare,
  Link,
  AlertCircle
} from 'lucide-react';

import MarginaliaPanel from './components/MarginaliaPanel';
import FloatingShareMenu from './components/FloatingShareMenu';
import FootnotePopover, { ActiveFootnoteState } from './components/FootnotePopover';
import AuthorBioCard from './components/AuthorBioCard';
import { transformFootnotesInHtml } from './utils/footnoteTransformer';
import { compileScholarlyPDF } from './utils/pdfCompiler';
import { trackPageView, setupScrollTracker, stopActiveHeartbeat } from './utils/analyticsTracker';

// Log view entries to firestore views_log with real device, session, and reading duration tracking
const logViewEntry = async (art: Article) => {
  try {
    await trackPageView('article', art);
  } catch (e) {
    console.error("Failed to write views log:", e);
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateSortOrder, setDateSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedContributorId, setSelectedContributorId] = useState<string | null>(null);
  const [dashboardContributorId, setDashboardContributorId] = useState<string | null>(null);
  
  // Theme State
  const theme = 'dark';

  // Firebase Datastore States with Instant Local Storage Cache (0ms load time)
  const [articles, setArticles] = useState<Article[]>(() => getCachedArticles());
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isArticleViewLoading, setIsArticleViewLoading] = useState<boolean>(false);
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [contributors, setContributors] = useState<AuthorProfile[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => getCachedSiteSettings());


  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterTouched, setNewsletterTouched] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);

  // Pagination count
  const [articlesPerPage, setArticlesPerPage] = useState<number>(6);

  // Marginalia / Peer-Review State
  const [isMarginaliaOpen, setIsMarginaliaOpen] = useState(false);
  const [annotationParagraphIndex, setAnnotationParagraphIndex] = useState<number>(-1);
  const [annotationParagraphText, setAnnotationParagraphText] = useState<string | undefined>(undefined);

  // Clickable Citation Footnote Popover State
  const [activeFootnote, setActiveFootnote] = useState<ActiveFootnoteState | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Network Connectivity State for Graceful Offline Fallbacks
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage('Network restored. Reconnected to live archives.');
      setTimeout(() => setToastMessage(null), 3500);
      loadData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage('Network unavailable. Switched to offline local cache mode.');
      setTimeout(() => setToastMessage(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Helper to copy direct deep link URL
  const handleCopyLink = async (art: Article) => {
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

    const shareUrl = art.slug
      ? `${baseOrigin}/post/${slugify(art.slug)}`
      : `${baseOrigin}/post/${art.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('Link copied to clipboard successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    // Apply permanent dark theme selection to HTML element
    const html = document.documentElement;
    html.classList.add('dark');
    html.style.backgroundColor = '#080808';
    html.style.color = '#e0e0e0';
  }, []);

  // Synchronize SEO & Open Graph / Twitter Meta Tags dynamically in browser
  useEffect(() => {
    let title = "The Oligarchy : Independent Publication";
    let desc = "Independent research platform exploring crime, human behaviour, and systems of power. The Oligarchy : Independent Publication";
    let image = "https://theoligarchy.in/logo_highres.png";
    let url = "https://theoligarchy.in";

    if (activeTab === 'article-view' && selectedArticle) {
      title = selectedArticle.seoTitle || selectedArticle.metaTitle || `${selectedArticle.title} : The Oligarchy`;
      desc = selectedArticle.seoDescription || selectedArticle.metaDescription || selectedArticle.excerpt || desc;
      image = selectedArticle.featuredImage || image;
      url = selectedArticle.canonicalUrl || `https://theoligarchy.in/?article=${selectedArticle.id}`;
    } else if (activeTab === 'about') {
      title = "About Us : The Oligarchy";
      desc = "Learn about our mission, editorial policy, and investigative methodologies.";
    } else if (activeTab === 'editorial') {
      title = "Editorial Principles : The Oligarchy";
      desc = "Our strict journalistic values, verification protocols, and ethical principles.";
    } else if (activeTab === 'contact') {
      title = "Submit a Tip : The Oligarchy";
      desc = "Submit highly classified tips, leaks, or research material to our investigators.";
    }

    // Update document title
    document.title = title;

    // Helper function to update meta attributes safely
    const updateMeta = (selector: string, attr: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        // Parse the selector and create the element if it doesn't exist
        if (selector.startsWith('meta[name=')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) {
            element = document.createElement('meta');
            element.setAttribute('name', name);
            document.head.appendChild(element);
          }
        } else if (selector.startsWith('meta[property=')) {
          const prop = selector.match(/property="([^"]+)"/)?.[1];
          if (prop) {
            element = document.createElement('meta');
            element.setAttribute('property', prop);
            document.head.appendChild(element);
          }
        }
      }
      if (element) {
        element.setAttribute(attr, value);
      }
    };

    // Standard description
    updateMeta('meta[name="description"]', 'content', desc);

    // Open Graph meta tags
    updateMeta('meta[property="og:title"]', 'content', title);
    updateMeta('meta[property="og:description"]', 'content', desc);
    updateMeta('meta[property="og:image"]', 'content', image);
    updateMeta('meta[property="og:url"]', 'content', url);

    // Twitter meta tags
    updateMeta('meta[name="twitter:title"]', 'content', title);
    updateMeta('meta[name="twitter:description"]', 'content', desc);
    updateMeta('meta[name="twitter:image"]', 'content', image);
    updateMeta('meta[name="twitter:url"]', 'content', url);

  }, [activeTab, selectedArticle]);

  // Real-Time Analytics Page Tracking & Active Session Lifecycle
  useEffect(() => {
    // Only track non-article page views here (article views are tracked in handleArticleClick)
    if (activeTab !== 'article-view') {
      trackPageView(activeTab, null);
    }
    
    // Setup scroll tracking for attention calculation
    const cleanupScroll = setupScrollTracker();

    return () => {
      cleanupScroll();
    };
  }, [activeTab]);

  const loadData = async () => {
    try {
      const readingCol = collection(db, 'reading');
      const contributorsCol = collection(db, 'contributors');

      // Fetch lightweight preview feed and auxiliary collections with graceful fallback handling
      const [previewsResult, readingSnapshot, contributorsSnapshot] = await Promise.all([
        fetchArticlePreviews({ status: 'all', sortBy: 'createdAt', limitCount: 60 }),
        getDocs(readingCol).catch((err) => {
          console.warn("Could not fetch reading items, using seed:", err);
          return { docs: [] };
        }),
        getDocs(contributorsCol).catch((err) => {
          console.warn("Could not fetch contributors, using default registry:", err);
          return { docs: [] };
        })
      ]);

      const articlesList = previewsResult.articles;

      // Sort: pinned first, then newest
      const sortedArticles = articlesList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });

      setArticles(sortedArticles);
      setIsInitialLoading(false);

      // Persist to local cache with timestamp & TTL validation for 0ms instant load on subsequent visits
      setCachedArticles(sortedArticles);

      const readingList = readingSnapshot.docs.length > 0 
        ? readingSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ReadingItem))
        : INITIAL_SEED_READING;
      
      setReadingItems(readingList.sort((a,b) => b.addedAt - a.addedAt));

      try {
        const contributorsList = await fetchContributors();
        setContributors(contributorsList);
      } catch (err) {
        console.warn("Could not fetch contributors list:", err);
      }

      // Fetch user saved research reading list safely
      try {
        const userSavedList = await fetchUserSavedArticles();
        setSavedArticles(userSavedList);
      } catch (err) {
        console.warn("Error fetching user saved articles:", err);
      }

      // Fetch dynamic site-wide CMS settings
      try {
        const settings = await fetchSiteSettings();
        setSiteSettings(settings);
      } catch (err) {
        console.warn("Error fetching site settings:", err);
      }

      // Direct Deep-Linking URL query parameter or path-based support on initial load
      const params = new URLSearchParams(window.location.search);
      let urlArticleId = params.get('article') || params.get('art') || params.get('p');
      
      if (!urlArticleId) {
        // Try to parse path-based deep-linking: /post/:slug or /article/:id or ?/post/:slug
        const fullUrlStr = window.location.pathname + window.location.search + window.location.hash;
        const postMatch = fullUrlStr.match(/[\/?#]post\/([^\/?#&]+)/i);
        const articleMatch = fullUrlStr.match(/[\/?#]article\/([^\/?#&]+)/i);
        if (postMatch) {
          urlArticleId = postMatch[1];
        } else if (articleMatch) {
          urlArticleId = articleMatch[1];
        }
      }

      if (urlArticleId) {
        let decodedId = urlArticleId;
        try {
          decodedId = decodeURIComponent(urlArticleId).trim();
        } catch (e) {
          // ignore
        }

        // Find article matching by id, slug, or slugified title (with robust fallback for spaces vs hyphens)
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
        const normalizedTarget = normalize(decodedId);

        const sharedArticle = sortedArticles.find(a => 
          a.id === decodedId || 
          a.id === urlArticleId ||
          (a.slug && a.slug.trim() === decodedId) ||
          (a.slug && normalize(a.slug) === normalizedTarget) ||
          (a.title && normalize(a.title) === normalizedTarget)
        );
        
        if (sharedArticle) {
          setSelectedArticle(sharedArticle);
          setActiveTab('article-view');
          setIsArticleViewLoading(true);

          // Lazy load full content payload on deep-link arrival
          fetchFullArticle(sharedArticle.id || sharedArticle.slug).then(full => {
            if (full) {
              setSelectedArticle(full);
              setArticles(prev => prev.map(a => a.id === full.id ? { ...a, ...full } : a));
            }
            setIsArticleViewLoading(false);
          }).catch(() => {
            setIsArticleViewLoading(false);
          });
          
          // Increment views for deep-linked loading
          try {
            const artRef = doc(db, 'articles', sharedArticle.id);
            await updateDoc(artRef, {
              views: increment(1)
            });
            // Update the views count in the sorted list so it displays correctly on load
            sharedArticle.views = (sharedArticle.views || 0) + 1;
            // Log analytics view event
            logViewEntry(sharedArticle);
          } catch (e) {
            console.error("Failed to increment views on deep-link load:", e);
          }
        }
      }

    } catch (e) {
      console.error("Error loading application data:", e);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Immediate deep-link resolution from instant local cache/seed
  useEffect(() => {
    if (selectedArticle && selectedArticle.content && selectedArticle.content.length > 50) return;
    const params = new URLSearchParams(window.location.search);
    let urlArticleId = params.get('article') || params.get('art') || params.get('p');
    if (!urlArticleId) {
      const fullUrlStr = window.location.pathname + window.location.search + window.location.hash;
      const postMatch = fullUrlStr.match(/[\/?#]post\/([^\/?#&]+)/i);
      const articleMatch = fullUrlStr.match(/[\/?#]article\/([^\/?#&]+)/i);
      if (postMatch) urlArticleId = postMatch[1];
      else if (articleMatch) urlArticleId = articleMatch[1];
    }
    if (urlArticleId && articles.length > 0) {
      let decodedId = urlArticleId;
      try { decodedId = decodeURIComponent(urlArticleId).trim(); } catch (e) {}
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
      const normalizedTarget = normalize(decodedId);
      const matched = articles.find(a => 
        a.id === decodedId || 
        a.id === urlArticleId ||
        (a.slug && a.slug.trim() === decodedId) ||
        (a.slug && normalize(a.slug) === normalizedTarget) ||
        (a.title && normalize(a.title) === normalizedTarget)
      );
      if (matched) {
        setSelectedArticle(matched);
        setActiveTab('article-view');
        if (!matched.content || matched.content.length < 50) {
          setIsArticleViewLoading(true);
          fetchFullArticle(matched.id || matched.slug).then(full => {
            if (full) {
              setSelectedArticle(full);
            }
            setIsArticleViewLoading(false);
          }).catch(() => {
            setIsArticleViewLoading(false);
          });
        }
      }
    }
  }, [articles]);

  useEffect(() => {
    loadData();

    // Track active authentication session state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAdminUser(user);
      } else {
        const localSession = localStorage.getItem('local_admin_session');
        if (localSession) {
          try {
            setAdminUser(JSON.parse(localSession));
          } catch (e) {
            localStorage.removeItem('local_admin_session');
            setAdminUser(null);
          }
        } else {
          setAdminUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Saved Reading List Action Handlers
  const handleToggleSaveArticle = async (article: Article) => {
    const exists = savedArticles.some(a => a.articleId === article.id);
    if (exists) {
      const updated = await removeArticleFromReadingList(article.id);
      setSavedArticles(updated);
      setToastMessage(`Removed "${article.title}" from saved reading list.`);
    } else {
      const updated = await saveArticleToReadingList(article);
      setSavedArticles(updated);
      setToastMessage(`Saved "${article.title}" to reading list.`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveSavedArticle = async (articleId: string) => {
    const target = savedArticles.find(a => a.articleId === articleId);
    const updated = await removeArticleFromReadingList(articleId);
    setSavedArticles(updated);
    if (target) {
      setToastMessage(`Removed "${target.title}" from reading list.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleToggleReadStatus = async (articleId: string, currentStatus: boolean) => {
    const updated = await toggleArticleReadStatus(articleId, !currentStatus);
    setSavedArticles(updated);
  };

  const handleUpdateNote = async (articleId: string, note: string) => {
    const updated = await updateArticleNote(articleId, note);
    setSavedArticles(updated);
  };

  // Synchronize browser history navigation (Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const fullUrlStr = window.location.pathname + window.location.search + window.location.hash;
      const postMatch = fullUrlStr.match(/[\/?#]post\/([^\/?#&]+)/i);
      const articleMatch = fullUrlStr.match(/[\/?#]article\/([^\/?#&]+)/i);
      const urlArticleId = postMatch ? postMatch[1] : (articleMatch ? articleMatch[1] : null);

      if (urlArticleId && articles.length > 0) {
        let decodedId = urlArticleId;
        try {
          decodedId = decodeURIComponent(urlArticleId).trim();
        } catch (e) {}

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
        const normalizedTarget = normalize(decodedId);

        const found = articles.find(a => 
          a.id === decodedId || 
          a.id === urlArticleId ||
          (a.slug && a.slug.trim() === decodedId) ||
          (a.slug && normalize(a.slug) === normalizedTarget) ||
          (a.title && normalize(a.title) === normalizedTarget)
        );

        if (found) {
          setSelectedArticle(found);
          setActiveTab('article-view');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      if (!urlArticleId && activeTab === 'article-view') {
        setSelectedArticle(null);
        setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [articles, activeTab]);

  // Handle article clicks (and increment read views in Firestore)
  const handleArticleClick = async (art: Article) => {
    setActiveFootnote(null);
    setIsArticleViewLoading(true);
    setSelectedArticle(art);
    setActiveTab('article-view');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Synchronize URL with active article for direct deep-linking support using pretty paths
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };
    const urlSlug = art.slug ? slugify(art.slug) : art.id;
    const newUrl = `${window.location.origin}/post/${urlSlug}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    try {
      // If full content is not loaded in memory, fetch it on demand from Firestore
      let fullArticleObj = art;
      if (!art.content || art.content.length < 50 || !art.sources || art.sources.length === 0) {
        const fetchedFull = await fetchFullArticle(art.id || art.slug);
        if (fetchedFull) {
          fullArticleObj = fetchedFull;
          setSelectedArticle(fetchedFull);
          setArticles(prev => prev.map(a => a.id === fetchedFull.id ? { ...a, ...fetchedFull } : a));
        }
      }

      const artRef = doc(db, 'articles', art.id);
      await updateDoc(artRef, {
        views: increment(1)
      });
      // Update local state views counter immediately
      setArticles(prev => prev.map(a => a.id === art.id ? { ...a, views: (a.views || 0) + 1 } : a));
      // Log analytics view event
      logViewEntry(fullArticleObj);
    } catch (e) {
      console.error("Failed to increment views or fetch full article:", e);
    } finally {
      setIsArticleViewLoading(false);
    }
  };

  // Validate email format with standard email regex
  const validateEmailFormat = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewsletterEmail(value);

    // Live validation if field has been interacted with or previously errored
    if (newsletterError || newsletterTouched) {
      if (!value.trim()) {
        setNewsletterError('Email address cannot be empty.');
      } else if (!validateEmailFormat(value)) {
        setNewsletterError('Please enter a valid email address (e.g., scholar@domain.edu).');
      } else {
        setNewsletterError(null);
      }
    }
  };

  const handleEmailBlur = () => {
    setNewsletterTouched(true);
    if (!newsletterEmail.trim()) {
      setNewsletterError('Email address cannot be empty.');
      setShakeTrigger(prev => prev + 1);
    } else if (!validateEmailFormat(newsletterEmail)) {
      setNewsletterError('Please enter a valid email address (e.g., scholar@domain.edu).');
      setShakeTrigger(prev => prev + 1);
    } else {
      setNewsletterError(null);
    }
  };

  // Handle Newsletter Registration
  const handleSubscribeNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterTouched(true);

    const trimmed = newsletterEmail.trim();
    if (!trimmed) {
      setNewsletterError('Email address cannot be empty.');
      setShakeTrigger(prev => prev + 1);
      return;
    }

    if (!validateEmailFormat(trimmed)) {
      setNewsletterError('Please enter a valid email address (e.g., scholar@domain.edu).');
      setShakeTrigger(prev => prev + 1);
      return;
    }

    setNewsletterError(null);
    setIsSubmittingNewsletter(true);

    try {
      const subsCol = collection(db, 'subscribers');
      await addDoc(subsCol, {
        email: trimmed,
        subscribedAt: Date.now()
      });
      setNewsletterEmail('');
      setNewsletterSuccess(true);
      setNewsletterTouched(false);
      setTimeout(() => setNewsletterSuccess(false), 8000);
    } catch (err) {
      console.error('Newsletter error:', err);
      setNewsletterError('A database error occurred. Please try again.');
      setShakeTrigger(prev => prev + 1);
    } finally {
      setIsSubmittingNewsletter(false);
    }
  };

  // Jump to specific reference in bibliography and trigger highlight glow
  const handleJumpToBibliography = (index: number) => {
    const el = document.getElementById(`reference-${index}`) || document.getElementById('article-references-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('reference-highlight-pulse');
      void el.offsetWidth; // force browser layout reflow
      el.classList.add('reference-highlight-pulse');
    }
  };

  // Footnote and citation click handler on the article content body
  const handleArticleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.footnote-ref-btn, [data-footnote-index], sup, a[href^="#ref"], a[href^="#fn"], a[href^="#footnote"], a[href^="#citation"]');
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    let footnoteIndex = 1;
    const datasetIdx = target.getAttribute('data-footnote-index');
    if (datasetIdx) {
      footnoteIndex = parseInt(datasetIdx, 10) || 1;
    } else {
      const match = target.textContent?.match(/\d+/);
      if (match) footnoteIndex = parseInt(match[0], 10) || 1;
    }

    const rect = target.getBoundingClientRect();
    const matchedSource = selectedArticle?.sources && selectedArticle.sources[footnoteIndex - 1]
      ? selectedArticle.sources[footnoteIndex - 1]
      : undefined;

    setActiveFootnote({
      index: footnoteIndex,
      targetRect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        right: rect.right + window.scrollX,
        width: rect.width,
        height: rect.height,
        clientX: rect.left,
        clientY: rect.top,
      },
      source: matchedSource
    });
  };

  // Helper to parse HTML content into interactive paragraphs and section nodes with clickable citation footnotes
  const renderInteractiveContent = (contentHtml: string) => {
    if (!contentHtml) return null;
    const transformedHtml = transformFootnotesInHtml(contentHtml);

    return (
      <div 
        className="article-content select-text selection:bg-blood selection:text-paper"
        onClick={handleArticleBodyClick}
        dangerouslySetInnerHTML={{ __html: transformedHtml }}
      />
    );
  };

  // 1. Memoized list of published articles
  const publishedArticles = useMemo(() => {
    return articles.filter(art => art.status !== 'draft');
  }, [articles]);

  // 2. Pre-indexed Fuse.js instance memoized against published articles
  // Prevents rebuilding the inverted index on every search input keystroke
  const searchIndex = useMemo(() => {
    return new Fuse(publishedArticles, {
      keys: [
        { name: 'title', weight: 0.45 },
        { name: 'subtitle', weight: 0.25 },
        { name: 'excerpt', weight: 0.2 },
        { name: 'tags', weight: 0.3 },
        { name: 'category', weight: 0.2 },
        { name: 'authorName', weight: 0.15 }
      ],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
  }, [publishedArticles]);

  // 3. Fast filter calculations utilizing the memoized search index and published date sorting
  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim();
    let list = publishedArticles;

    // Apply memoized fuzzy search if query is entered
    if (query) {
      list = searchIndex.search(query).map(result => result.item);
    }

    // Apply Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'criminology' || categoryFilter === 'psyche' || categoryFilter === 'politics') {
        list = list.filter(art => art.category === categoryFilter);
      } else if (categoryFilter === 'case-studies') {
        list = list.filter(art => (art.tags || []).some(t => t.toLowerCase().includes('case study')));
      } else if (categoryFilter === 'research-notes') {
        list = list.filter(art => (art.tags || []).some(t => t.toLowerCase().includes('research note')) || (art.readTime && (art.readTime.includes('3 min') || art.readTime.includes('4 min'))));
      }
    }

    // Helper for robust article timestamp resolution (publishDate parsed or fallback to createdAt)
    const getArticleTimestamp = (art: Article): number => {
      if (art.publishDate) {
        const parsed = Date.parse(art.publishDate);
        if (!isNaN(parsed)) return parsed;
      }
      return art.createdAt || 0;
    };

    // Sort research by Published Date (Newest vs Oldest)
    const sorted = [...list].sort((a, b) => {
      const timeA = getArticleTimestamp(a);
      const timeB = getArticleTimestamp(b);
      return dateSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return sorted;
  }, [publishedArticles, searchIndex, categoryFilter, searchQuery, dateSortOrder]);

  // Extract all unique tags across published articles to enable cross-document tracing
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    articles.forEach(art => {
      if (art.status === 'published' && art.tags) {
        art.tags.forEach(tag => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      }
    });
    return Array.from(tagsSet).slice(0, 15); // Top 15 tags
  }, [articles]);

  // Calculate Related Investigations & Recommended Articles dynamically with weighted scoring (Tags + Authorship)
  const relatedInvestigations = useMemo(() => {
    if (!selectedArticle) return [];
    
    const currentTags = (selectedArticle.tags || []).map(t => t.toLowerCase().trim());
    const currentAuthorId = selectedArticle.authorId;
    const currentAuthorName = (selectedArticle.authorName || '').toLowerCase().trim();
    
    return articles
      .filter(art => art.status === 'published' && art.id !== selectedArticle.id)
      .map(art => {
        let score = 0;
        
        // 1. Matching Tags Weighting (+3 points per matching tag)
        const sharedTags = (art.tags || []).filter(tag => 
          currentTags.includes(tag.toLowerCase().trim())
        );
        const tagScore = sharedTags.length * 3;
        score += tagScore;
        
        // 2. Overlapping Authorship Weighting (+5 points for shared author)
        let isSameAuthor = false;
        let authorMatchName = art.authorName || '';
        if (currentAuthorId && art.authorId && currentAuthorId === art.authorId) {
          isSameAuthor = true;
        } else if (currentAuthorName && art.authorName && art.authorName.toLowerCase().trim() === currentAuthorName) {
          isSameAuthor = true;
        } else if (currentAuthorName && art.authorName) {
          // Check for co-authorship or author name overlap
          const currentParts = currentAuthorName.split(/[,&]/).map(s => s.trim()).filter(Boolean);
          const artParts = art.authorName.toLowerCase().split(/[,&]/).map(s => s.trim()).filter(Boolean);
          const hasOverlap = currentParts.some(cp => artParts.some(ap => ap.includes(cp) || cp.includes(ap)));
          if (hasOverlap) {
            isSameAuthor = true;
          }
        }
        if (isSameAuthor) {
          score += 5;
        }
        
        // 3. Category Alignment (+2 points)
        if (art.category === selectedArticle.category) {
          score += 2;
        }
        
        // 4. Shared Series Alignment (+6 points)
        let isSameSeries = false;
        if (selectedArticle.seriesName && art.seriesName && selectedArticle.seriesName === art.seriesName) {
          score += 6;
          isSameSeries = true;
        }
        
        // 5. Explicitly linked articles (+8 points)
        if (selectedArticle.relatedArticles?.includes(art.id) || art.relatedArticles?.includes(selectedArticle.id)) {
          score += 8;
        }
        
        return { 
          article: art, 
          score, 
          sharedTags,
          isSameAuthor,
          authorMatchName,
          isSameSeries
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [selectedArticle, articles]);

  const featuredPost = (siteSettings?.heroFeaturedArticleId ? articles.find(art => art.id === siteSettings.heroFeaturedArticleId) : null) || articles.find(art => art.isFeatured && art.status === 'published') || articles.find(art => art.status === 'published');

  const handleSearch = (queryText: string) => {
    setSearchQuery(queryText);
    setSelectedArticle(null);
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#080808] text-[#e0e0e0]">
      
      {/* Scroll Progress Indicator Bar */}
      <div className="fixed top-0 left-0 w-full h-[3px] bg-blood z-[999]" id="scroll-bar" />

      {/* Decorative Dark Gothic Academic Watermark Rail */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-12 pr-6 pointer-events-none z-10 select-none">
        <div className="[writing-mode:vertical-rl] text-[9px] uppercase tracking-[0.55em] text-paper/10 font-extrabold">
          ANALYTIC • RIGOROUS • HUMAN
        </div>
      </div>

      {/* Main Gothic Masthead Header */}
      {activeTab !== 'admin' && (
        <Header 
          activeTab={activeTab === 'article-view' ? 'research' : activeTab} 
          setActiveTab={(tab) => {
            setSelectedArticle(null);
            setActiveTab(tab);
            // Clear parameter on any tab change
            const newUrl = window.location.origin;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }}
          onSearch={handleSearch}
          savedCount={savedArticles.length}
          siteSettings={siteSettings}
        />
      )}

      {/* Offline Mode Graceful Fallback Banner */}
      {!isOnline && (
        <div className="bg-amber-950/60 border-b border-amber-800/40 px-4 py-2 text-center text-xs font-sans text-amber-200/90 flex items-center justify-center gap-2 sticky top-0 z-50 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Offline Archival Mode Active — Full research library and bookmarked papers remain available from instant local storage.</span>
        </div>
      )}


      {/* Core Dynamic Screen Routing */}
      <main className="flex-1">
        
        {/* ══ VIEW: HOME / DISCOVER ══ */}
        {activeTab === 'home' && (
          <div className="fade-in">
            {/* HERO INTRODUCTION */}
            <section className="relative overflow-hidden py-16 md:py-24 px-6 border-b border-paper/10 text-center flex flex-col items-center justify-center bg-gradient-to-b from-navy/30 to-transparent">
              <div className="font-sans text-[10px] font-bold tracking-[0.4em] uppercase text-blood mb-4 flex items-center gap-2">
                <span className="w-6 h-px bg-blood" />
                {siteSettings?.tagline || 'Journal of critical inquiry'}
                <span className="w-6 h-px bg-blood" />
              </div>
              
              <h2 className="font-display text-4xl md:text-6xl font-extrabold text-paper max-w-4xl leading-tight mb-6 select-text selection:bg-blood selection:text-paper">
                {siteSettings?.subheading || 'The stories behind systems of power.'}
              </h2>
              
              <p className="font-serif text-base md:text-lg text-paper/60 max-w-2xl leading-relaxed mb-10 select-text selection:bg-blood selection:text-paper">
                {siteSettings?.missionStatement || 'Independent research into crime, psychology, politics, and systems of power, prioritising understanding over outrage and analysis over headlines.'}
              </p>

              <div className="flex gap-4 flex-wrap justify-center">
                <button 
                  onClick={() => {
                    const anchor = document.getElementById('analyses-anchor');
                    if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm shadow-md transition-all cursor-pointer"
                >
                  Read Research
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-transparent border border-paper/20 hover:border-blood hover:text-paper text-paper/60 font-sans text-xs font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm transition-all cursor-pointer"
                >
                  About The Publication
                </button>
              </div>
            </section>

            {/* WHAT IS THE OLIGARCHY BRIEF BANNER */}
            <section className="py-12 px-6 border-b border-paper/5 max-w-4xl mx-auto text-center select-text selection:bg-blood selection:text-paper">
              <h3 className="font-display text-2xl font-bold italic mb-5 text-paper">What is {siteSettings?.siteName || 'The Oligarchy'}?</h3>
              <p className="font-serif text-sm leading-relaxed text-paper/50 max-w-2xl mx-auto">
                {siteSettings?.missionStatement || 'The Oligarchy is an independent research publication exploring crime, human behavior, and institutions. Power is rarely distributed equally; decisions are shaped by hidden incentives, structures, and organizational rules. We seek strictly to study these operations with calm scholarly detachment.'}
              </p>
            </section>

            {/* FEATURED PINNED ESSAY */}
            {featuredPost && (
              <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto border-b border-paper/10">
                <div className="font-sans text-[10px] font-bold tracking-[0.35em] text-blood uppercase mb-6 text-center">
                  Focus Research Paper
                </div>
                <FeaturedResearch 
                  article={featuredPost} 
                  onClick={() => handleArticleClick(featuredPost)} 
                  isSaved={savedArticles.some(a => a.articleId === featuredPost.id)}
                  onToggleSave={handleToggleSaveArticle}
                />

              </section>
            )}

            {/* RESEARCH PORTFOLIO CATEGORY GRID */}
            <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto border-b border-paper/5">
              <div className="font-sans text-[10px] font-bold tracking-[0.35em] text-blood uppercase mb-8 text-center">
                Primary Focus Columns
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 'criminology',
                    title: 'Criminology',
                    desc: siteSettings?.criminologyDescription || 'Research into criminal behaviour, organised crime, corruption, fraud, financial crime, and justice systems.',
                    emoji: '⚖️'
                  },
                  {
                    id: 'psyche',
                    title: 'Psychology',
                    desc: siteSettings?.psycheDescription || 'Research into behaviour, persuasion, ideology, cognition, identity, and decision making.',
                    emoji: '🧠'
                  },
                  {
                    id: 'politics',
                    title: 'Politics',
                    desc: siteSettings?.politicsDescription || 'Research into institutions, governance, elites, incentives, and political systems.',
                    emoji: '🌐'
                  }
                ].map((col) => (
                  <div 
                    key={col.id} 
                    onClick={() => {
                      setCategoryFilter(col.id);
                      const anchor = document.getElementById('analyses-anchor');
                      if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-navy border border-paper/10 p-8 rounded-sm hover:border-blood hover:bg-paper/[0.01] transition-all duration-300 cursor-pointer flex flex-col gap-3 select-none"
                  >
                    <span className="text-3xl leading-none">{col.emoji}</span>
                    <h4 className="font-display text-lg font-bold text-paper/95">{col.title}</h4>
                    <p className="font-serif text-sm text-paper/50 leading-relaxed">{col.desc}</p>
                    <span className="font-sans text-[9px] uppercase tracking-widest text-blood mt-auto pt-4 group-hover:underline">
                      Access records &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* TWO-COLUMN GRID: RESEARCH ARCHIVES & SIDEBAR WIDGETS */}
            <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10" id="analyses-anchor">
              
              {/* Left Column: List of Latest Articles */}
              <div className="md:col-span-8 flex flex-col gap-6">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-paper/10 pb-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold italic text-paper">
                      {categoryFilter === 'all' ? 'Latest Research & Analyses' : `${categoryFilter} Archives`}
                    </h3>
                  </div>
                  
                  {/* Category & Date filters bar */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-between xl:justify-end">
                    {/* Category filters */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'criminology', label: 'Criminology' },
                        { id: 'psyche', label: 'Psyche' },
                        { id: 'politics', label: 'Politics' },
                        { id: 'case-studies', label: 'Studies' },
                        { id: 'research-notes', label: 'Notes' }
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => setCategoryFilter(btn.id)}
                          className={`font-sans text-[9px] font-semibold tracking-wider uppercase py-1 px-3 border transition-colors cursor-pointer rounded-sm ${
                            categoryFilter === btn.id 
                              ? 'bg-blood border-blood text-paper shadow-xs font-bold' 
                              : 'border-paper/10 text-paper/40 hover:border-blood hover:text-paper'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Published Date Filter (Newest vs Oldest) */}
                    <div className="flex items-center bg-navy border border-paper/10 rounded-sm p-0.5">
                      <span className="font-sans text-[8px] font-bold tracking-wider uppercase text-paper/40 px-2 flex items-center gap-1 select-none">
                        <Calendar size={10} className="text-blood" />
                        <span>Date:</span>
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setDateSortOrder('newest')}
                          title="Filter and sort by newest published date"
                          className={`font-sans text-[9px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-xs transition-all cursor-pointer flex items-center gap-1 ${
                            dateSortOrder === 'newest'
                              ? 'bg-blood text-paper shadow-xs font-bold'
                              : 'text-paper/40 hover:text-paper hover:bg-paper/5'
                          }`}
                        >
                          Newest
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateSortOrder('oldest')}
                          title="Filter and sort by oldest published date"
                          className={`font-sans text-[9px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-xs transition-all cursor-pointer flex items-center gap-1 ${
                            dateSortOrder === 'oldest'
                              ? 'bg-blood text-paper shadow-xs font-bold'
                              : 'text-paper/40 hover:text-paper hover:bg-paper/5'
                          }`}
                        >
                          Oldest
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ DYNAMIC UNIFIED DEEP SEARCH & ANALYTICAL THEME TRACKER ══ */}
                <div className="bg-navy/20 border border-paper/10 p-5 rounded-sm flex flex-col gap-4">
                  <div className="relative flex items-center bg-[#050505] border border-paper/10 focus-within:border-blood/50 rounded-sm px-3.5 py-2.5 transition-all">
                    <Search size={16} className="text-paper/30 mr-2.5" />
                    <input
                      type="text"
                      placeholder="Query deep archives, key concepts, tags, or full texts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent text-paper font-serif text-sm focus:outline-none w-full placeholder-paper/20"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-paper/40 hover:text-blood text-[10px] font-sans uppercase tracking-widest font-bold ml-2 cursor-pointer transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Real-time search status metadata */}
                  {searchQuery.trim() && (
                    <div className="flex justify-between items-center bg-blood/5 border border-blood/20 py-2 px-3 rounded-sm">
                      <span className="font-sans text-[10px] uppercase tracking-wider text-blood font-bold">
                        Deep Query active
                      </span>
                      <span className="font-mono text-[10px] text-paper/50">
                        Found {filteredArticles.length} matching analytical documents
                      </span>
                    </div>
                  )}

                  {/* Cross-Document Theme Tracing Tags Cloud */}
                  {allUniqueTags.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-paper/30">
                        Trace Overlapping Themes across Documents:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {allUniqueTags.map((tag) => {
                          const isActive = searchQuery.toLowerCase().trim() === tag.toLowerCase().trim();
                          return (
                            <button
                              key={tag}
                              onClick={() => {
                                // Toggle tag selection
                                if (isActive) {
                                  setSearchQuery('');
                                } else {
                                  setSearchQuery(tag);
                                }
                              }}
                              className={`font-sans text-[9px] tracking-wider uppercase px-2.5 py-1 border rounded-sm cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-blood border-blood text-paper font-bold shadow' 
                                  : 'border-paper/10 bg-paper/5 text-paper/40 hover:border-blood/40 hover:text-paper hover:bg-paper/10'
                              }`}
                            >
                              #{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* List Grid */}
                <div className="flex flex-col gap-5 select-text">
                  {isInitialLoading && articles.length === 0 ? (
                    <div className="flex flex-col gap-5">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-navy/40 border border-paper/10 p-6 rounded-sm animate-pulse flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div className="h-3 bg-paper/10 rounded w-1/5"></div>
                            <div className="h-3 bg-paper/10 rounded w-16"></div>
                          </div>
                          <div className="h-6 bg-paper/20 rounded w-3/4"></div>
                          <div className="h-4 bg-paper/10 rounded w-full"></div>
                          <div className="h-4 bg-paper/10 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredArticles.length === 0 ? (
                    <div className="border border-dashed border-paper/10 p-12 text-center text-paper/30 italic rounded-sm">
                      No analyses logged matching this selection currently. Check back soon.
                    </div>
                  ) : (
                    filteredArticles.slice(0, articlesPerPage).map((art) => (
                      <ArticleCard 
                        key={art.id} 
                        article={art} 
                        onClick={() => handleArticleClick(art)} 
                        isSaved={savedArticles.some(a => a.articleId === art.id)}
                        onToggleSave={handleToggleSaveArticle}
                      />
                    ))

                  )}
                </div>

                {/* Pagination "Load More" */}
                {filteredArticles.length > articlesPerPage && (
                  <div className="text-center pt-4">
                    <button 
                      onClick={() => setArticlesPerPage(prev => prev + 4)}
                      className="font-sans text-[10px] font-bold tracking-widest uppercase border border-paper/15 text-paper/50 hover:border-blood hover:text-paper py-3 px-8 transition-colors rounded-sm"
                    >
                      Load More Research
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Reading Stack sidebar & Social triggers */}
              <aside className="md:col-span-4 flex flex-col gap-6">
                
                {/* Reading Stack widget */}
                <ReadingStack 
                  items={readingItems} 
                  savedArticles={savedArticles}
                  articles={articles}
                  onOpenReadingList={() => setActiveTab('reading-list')}
                  onSelectArticle={handleArticleClick}
                  onRemoveSaved={handleRemoveSavedArticle}
                />


                {/* Follow Socials widget */}
                <div className="bg-navy border border-paper/10 rounded-sm overflow-hidden select-none">
                  <div className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-paper bg-blood py-2 px-4 border-b border-paper/10">
                    🔗 Follow Publications
                  </div>
                  <div className="p-4 flex flex-col gap-2.5">
                    <a 
                      href={SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-paper/10 p-3 flex items-center gap-3 hover:border-blood hover:bg-paper/[0.01] transition-colors"
                    >
                      <Instagram size={14} className="text-pink-400" />
                      <div className="flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80">Instagram</span>
                        <span className="font-serif text-xs text-paper/35">@theoligarchy.in</span>
                      </div>
                    </a>
                    <a 
                      href={SOCIAL_LINKS.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-paper/10 p-3 flex items-center gap-3 hover:border-blood hover:bg-paper/[0.01] transition-colors"
                    >
                      <Twitter size={14} className="text-blue-400" />
                      <div className="flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80">Twitter / X</span>
                        <span className="font-serif text-xs text-paper/35">@TheOligarchy_</span>
                      </div>
                    </a>
                    <a 
                      href={SOCIAL_LINKS.linkedinCompany}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-paper/10 p-3 flex items-center gap-3 hover:border-blood hover:bg-paper/[0.01] transition-colors"
                    >
                      <Linkedin size={14} className="text-blue-300" />
                      <div className="flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80">LinkedIn Company Page</span>
                        <span className="font-serif text-xs text-paper/35">linkedin.com/company/the-oligarchy</span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Static Editorial Principle Callout Card */}
                <div className="border border-paper/10 p-6 rounded-sm bg-gradient-to-br from-navy to-transparent flex flex-col gap-3 select-text">
                  <span className="font-mono text-[10px] text-blood font-bold uppercase">Philosophy</span>
                  <h4 className="font-display text-base font-semibold italic text-paper/90">Complexity Over Certainty</h4>
                  <p className="font-serif text-xs text-paper/40 leading-relaxed">
                    Systems of power are rarely simple. We reject binary narratives, embracing the nuanced, multi-faceted nature of organizational behavior and human psyche.
                  </p>
                </div>
              </aside>
            </section>

            {/* THE RESEARCH BRIEF NEWSLETTER CARD */}
            <section className="bg-navy border-y border-paper/10 py-16 px-6 text-center select-none">
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <span className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-blood">Stay Informed</span>
                <h3 className="font-display text-2xl md:text-3xl font-semibold italic text-paper">The Research Brief</h3>
                <p className="font-serif text-sm text-paper/50 max-w-lg mx-auto leading-relaxed">
                  Scholarly essays, case studies, and research briefings, dispatched directly to your inbox. No corporate advertising. Unsubscribe anytime.
                </p>

                {newsletterSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-950/20 border border-green-500/30 text-[#8bc4a8] font-serif text-sm p-4 rounded-sm mt-4 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} className="text-[#8bc4a8]" />
                    <span>You have successfully subscribed to The Research Brief list. Welcome to The Oligarchy.</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={shakeTrigger}
                    animate={shakeTrigger > 0 ? { x: [-10, 10, -8, 8, -4, 4, -2, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="w-full max-w-md mx-auto mt-4"
                  >
                    <form onSubmit={handleSubscribeNewsletter} noValidate className="flex flex-col gap-2 select-text w-full">
                      <div className={`relative flex w-full rounded-sm transition-all duration-300 ${
                        newsletterError 
                          ? 'ring-2 ring-blood/80 shadow-[0_0_15px_rgba(139,26,26,0.35)]' 
                          : 'focus-within:ring-1 focus-within:ring-paper/30'
                      }`}>
                        <input
                          type="email"
                          placeholder="Your academic email address..."
                          value={newsletterEmail}
                          onChange={handleEmailChange}
                          onBlur={handleEmailBlur}
                          aria-invalid={Boolean(newsletterError)}
                          className={`bg-midnight border py-3 px-4 text-paper font-serif text-sm focus:outline-none w-full transition-all rounded-l-sm border-r-0 ${
                            newsletterError 
                              ? 'border-blood text-paper placeholder-paper/40 bg-blood/10' 
                              : 'border-paper/10 text-paper placeholder-paper/40 focus:border-paper/30'
                          }`}
                        />
                        <button 
                          type="submit"
                          disabled={isSubmittingNewsletter}
                          className="bg-blood hover:bg-blood-light disabled:opacity-50 text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-6 rounded-r-sm shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-2"
                        >
                          {isSubmittingNewsletter ? (
                            <span className="inline-block animate-spin border-2 border-paper/30 border-t-paper rounded-full w-3.5 h-3.5" />
                          ) : (
                            'Subscribe'
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {newsletterError && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="flex items-center gap-2 text-blood-light font-serif text-xs px-1 text-left mt-1"
                          >
                            <AlertCircle size={14} className="shrink-0 text-blood-light" />
                            <span>{newsletterError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </form>
                  </motion.div>
                )}
              </div>
            </section>

            {/* FROM THE EDITOR PHILOSOPHY HERO CALLOUT */}
            <section className="py-16 px-6 max-w-4xl mx-auto text-center border-b border-paper/5 select-text selection:bg-blood selection:text-paper">
              <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/30 block mb-3">Founding manifesto</span>
              <h3 className="font-display text-xl md:text-2xl italic font-semibold text-paper/90 mb-4">"From the Editor"</h3>
              <p className="font-serif text-sm text-paper/50 leading-relaxed max-w-2xl mx-auto italic">
                "The Oligarchy was founded to examine crime, psychology, politics, and systems of power through research rather than outrage. 
                This publication values complexity over certainty and understanding over sensationalism."
              </p>
              <span className="font-gothic text-lg text-blood block mt-6">The Oligarchy</span>
            </section>
          </div>
        )}

        {/* ══ VIEW: SAVED READING LIST DASHBOARD ══ */}
        {activeTab === 'reading-list' && (
          <ReadingListDashboard
            savedArticles={savedArticles}
            articles={articles}
            onSelectArticle={handleArticleClick}
            onRemoveSaved={handleRemoveSavedArticle}
            onToggleRead={handleToggleReadStatus}
            onUpdateNote={handleUpdateNote}
            onBrowseResearch={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ══ VIEW: RESEARCH CONTRIBUTORS PAGE ══ */}
        {activeTab === 'contributors' && (
          <ContributorsSection 
            articles={articles}
            contributors={contributors}
            selectedContributorId={selectedContributorId}
            onCloseContributorModal={() => setSelectedContributorId(null)}
            onSelectArticle={(art) => {
              setSelectedArticle(art);
              setActiveTab('article-view');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenContact={() => {
              setActiveTab('contact');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenSubmitInvestigation={() => {
              setActiveTab('submit-investigation');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenContributorDashboard={(id) => {
              setDashboardContributorId(id);
              setActiveTab('contributor-dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ══ VIEW: CONTRIBUTOR DASHBOARD (GUEST RESEARCHERS & SCHOLARS) ══ */}
        {(activeTab === 'contributor-dashboard' || activeTab === 'contributor-hub') && (
          <div className="py-8 md:py-12 px-4 md:px-8 max-w-7xl mx-auto">
            <ContributorDashboard 
              currentUser={adminUser ? {
                uid: adminUser.uid,
                email: adminUser.email || 'theoligarchy.ppj@gmail.com',
                displayName: adminUser.displayName || 'Priyasha Priyal Jena',
                role: 'admin',
                authorId: 'priyasha-priyal-jena'
              } : null}
              currentUserRole={adminUser ? 'admin' : 'author'}
              articles={articles}
              contributors={contributors}
              initialContributorId={dashboardContributorId}
              onNavigateHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectArticle={(art) => {
                setSelectedArticle(art);
                setActiveTab('article-view');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onComposeNew={() => {
                setActiveTab('submit-investigation');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ══ VIEW: PUBLIC MANUSCRIPT & INVESTIGATION SUBMISSION PORTAL ══ */}
        {activeTab === 'submit-investigation' && (
          <ManuscriptSubmissionPortal 
            onNavigateHome={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ══ VIEW: ABOUT PAGE ══ */}
        {activeTab === 'about' && (
          <AboutSection 
            onViewContributors={() => {
              setActiveTab('contributors');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ══ VIEW: EDITORIAL PRINCIPLES PAGE ══ */}
        {activeTab === 'principles' && <EditorialPrinciples />}

        {/* ══ VIEW: CONTACT & RESEARCH TIPS PAGE ══ */}
        {activeTab === 'contact' && <ContactSection />}

        {/* ══ VIEW: SECURE EDITORIAL PANEL (ADMIN) ══ */}
        {activeTab === 'admin' && (
          <div className="fade-in">
            {adminUser ? (
              <AdminDashboard 
                onLogout={() => setAdminUser(null)} 
                allArticles={articles}
                refreshArticles={loadData}
              />
            ) : (
              <div className="py-12">
                <div className="text-center mb-8">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="font-sans text-[9px] uppercase tracking-widest bg-paper/5 border border-paper/10 hover:border-blood hover:text-paper text-paper/40 px-4 py-2 cursor-pointer transition-colors"
                  >
                    &larr; Back to Public Platform
                  </button>
                </div>
                <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />
              </div>
            )}
          </div>
        )}

        {/* ══ VIEW: FULL SCHOLARLY ARTICLE PAGE ══ */}
        {activeTab === 'article-view' && (
          isArticleViewLoading || !selectedArticle ? (
            <ArticleSkeleton />
          ) : (
            <div className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto fade-in select-text">
            {/* Back to Home Navigation */}
            <button 
              onClick={() => {
                setSelectedArticle(null);
                setActiveTab('home');
                // Clear parameter on return
                const newUrl = window.location.origin;
                window.history.pushState({ path: newUrl }, '', newUrl);
              }}
              className="font-sans text-[9px] font-bold tracking-widest uppercase border border-paper/10 text-paper/45 hover:border-blood hover:text-paper py-2 px-5 mb-10 inline-flex items-center gap-1.5 cursor-pointer rounded-sm"
            >
              <ArrowLeft size={10} /> Back to Analyses
            </button>

            {/* Article Container Block */}
            <article className="flex flex-col gap-6 select-text selection:bg-blood selection:text-paper">
              
              {/* Image banner display */}
              {selectedArticle.featuredImage && !selectedArticle.canvaEmbed && (
                <div className="article-banner-container overflow-hidden rounded-sm border border-paper/10 mb-2 relative">
                  <img 
                    src={getOptimizedImageUrl(selectedArticle.featuredImage, 'banner')} 
                    alt={selectedArticle.title} 
                    className="article-banner-img select-none"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="article-banner-gradient absolute inset-0 pointer-events-none bg-gradient-to-t from-midnight/40 to-transparent" />
                </div>
              )}

              {/* Article Upper Metadata */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border ${
                  selectedArticle.category === 'criminology' 
                    ? 'bg-red-950/10 text-red-400 border-red-900/30' 
                    : selectedArticle.category === 'psyche'
                    ? 'bg-purple-950/10 text-purple-300 border-purple-900/30'
                    : 'bg-blue-950/10 text-blue-300 border-blue-900/30'
                }`}>
                  {selectedArticle.category}
                </span>

                {selectedArticle.seriesName && (
                  <span className="font-sans text-[9px] tracking-widest uppercase text-paper/40">
                    Series: {selectedArticle.seriesName} {selectedArticle.seriesPart && `(Part ${selectedArticle.seriesPart})`}
                  </span>
                )}
                
                <span className="font-sans text-[10px] text-paper/20">•</span>
                <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1">
                  <Calendar size={11} />
                  {selectedArticle.publishDate || new Date(selectedArticle.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                
                <span className="font-sans text-[10px] text-paper/20">•</span>
                <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1"><Eye size={12} /> {selectedArticle.views || 0} hits</span>
                <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1"><Clock size={12} /> {selectedArticle.readTime || '5 min read'}</span>
              </div>

              {/* Action Row: Reference Report PDF & Sharing Menu */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-paper/10 pb-4 mt-2">
                <div className="flex flex-wrap gap-2.5">
                  {selectedArticle.pdfLink && (
                    <a 
                      href={selectedArticle.pdfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-paper/5 border border-paper/15 hover:bg-paper/10 text-paper/80 hover:text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download the static original pre-compiled PDF report"
                    >
                      <FileText size={10} /> Original File
                    </a>
                  )}
                  <button 
                    onClick={() => compileScholarlyPDF(selectedArticle)}
                    className="bg-blood/15 border border-blood/40 hover:bg-blood/25 text-paper/90 hover:text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Compile a fresh, beautifully typeset scholarly PDF offprint in multi-column format with bibliography"
                  >
                    <FileText size={10} /> Compile Scholarly PDF <Download size={10} />
                  </button>
                </div>

                {/* Custom sharing widget with beautiful dropdown, bookmark button & Instagram guide */}
                <div className="flex items-center gap-2">
                  <BookmarkButton
                    article={selectedArticle}
                    isSaved={savedArticles.some(a => a.articleId === selectedArticle.id)}
                    onToggleSave={handleToggleSaveArticle}
                    variant="button"
                  />
                  <button
                    onClick={() => handleCopyLink(selectedArticle)}
                    className="bg-navy/80 hover:bg-blood/20 border border-paper/10 hover:border-blood text-paper/80 hover:text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-sm flex items-center gap-1.5 transition-all duration-300 cursor-pointer shadow-sm select-none"
                    title="Copy direct deep link to clipboard"
                    id="copy-link-article-detail"
                  >
                    <Link size={12} className="text-blood-light" />
                    Copy Link
                  </button>
                  <ShareMenu article={selectedArticle} />
                </div>

              </div>

              {/* Big Display Headings */}
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-paper leading-tight tracking-tight mt-2">
                {selectedArticle.title}
              </h1>

              {selectedArticle.subtitle && (
                <h2 className="font-display text-lg md:text-xl italic text-paper/50 leading-relaxed -mt-2">
                  {selectedArticle.subtitle}
                </h2>
              )}

              {/* Scholarly journal style multi-author attribution banner */}
              <div className="my-2">
                <MultiAuthorAttribution 
                  article={selectedArticle}
                  onSelectContributor={(authorId) => {
                    setSelectedContributorId(authorId);
                    setActiveTab('contributors');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>

              {/* ARTICLE BODY OR RESPONSIVE CANVA ENGINE EMBED */}
              {!selectedArticle.canvaEmbed && (
                <div className="flex flex-col sm:flex-row justify-between items-center bg-navy/20 border border-paper/10 p-4 rounded-sm mb-4 select-none gap-4">
                  <div className="flex items-center gap-3">
                    <Award size={18} className="text-blood shrink-0" />
                    <div>
                      <h3 className="font-display text-xs font-bold text-paper/90 uppercase tracking-wider leading-none">
                        Academic Peer-Review Board
                      </h3>
                      <p className="font-serif text-[11px] text-paper/40 mt-1 leading-none">
                        Line-by-line marginalia and formal critique database.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAnnotationParagraphIndex(-1);
                      setAnnotationParagraphText(undefined);
                      setIsMarginaliaOpen(true);
                    }}
                    className="font-sans text-[9px] uppercase tracking-widest bg-blood hover:bg-blood-light text-paper py-2 px-4 rounded-sm font-bold shadow transition-all cursor-pointer shrink-0"
                  >
                    Access Debate Portal
                  </button>
                </div>
              )}

              {/* ARTICLE BODY OR RESPONSIVE CANVA ENGINE EMBED */}
              {selectedArticle.canvaEmbed ? (
                // If Canva Embed field is populated, mount responsive iframe container & hide text blocks
                <div className="my-4">
                  <CanvaEmbed embedSource={selectedArticle.canvaEmbed} />
                </div>
              ) : (
                // Interactively parsed body content with inline annotations
                renderInteractiveContent(selectedArticle.content)
              )}

              {/* Custom Tags chips footer */}
              {(selectedArticle.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-paper/5">
                  {selectedArticle.tags.map((tag) => (
                    <span 
                      key={tag} 
                      onClick={() => {
                        setCategoryFilter('all');
                        setSearchQuery(tag);
                        setActiveTab('home');
                        setTimeout(() => {
                          const anchor = document.getElementById('analyses-anchor');
                          if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="font-sans text-[9px] tracking-wider uppercase bg-paper/5 border border-paper/10 hover:border-blood hover:text-paper text-paper/40 px-3 py-1 rounded-sm cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Related scholarly references citation index bibliography */}
              <SourcesSection sources={selectedArticle.sources || []} />

              {/* Automated Citation Generator for Academics & Researchers */}
              <CitationGenerator article={selectedArticle} />

              {/* Automated "Recommended for You" / Related Investigations Footer */}
              {relatedInvestigations.length > 0 && (
                <div className="border border-paper/10 bg-[#0a0a0a] p-6 rounded-sm mt-10 select-none shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-5 border-b border-paper/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-blood bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-sm">
                          Recommended For You
                        </span>
                        <span className="font-mono text-[9px] text-paper/40">
                          Weighted Relevance Algorithm
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-paper tracking-wide">
                        Related Investigations &amp; Syntheses
                      </h3>
                      <p className="font-serif text-xs text-paper/50 italic mt-0.5">
                        Selected using a weighted relevance algorithm analyzing matching search tags, shared authorship, and series continuity.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {relatedInvestigations.map(({ article: relArt, score, sharedTags, isSameAuthor, authorMatchName, isSameSeries }) => (
                      <div 
                        key={relArt.id}
                        onClick={() => {
                          handleArticleClick(relArt);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="group border border-paper/10 hover:border-blood/60 rounded-sm bg-navy/40 hover:bg-navy/80 cursor-pointer transition-all flex flex-col justify-between shadow-sm overflow-hidden"
                      >
                        {relArt.featuredImage && (
                          <div className="w-full h-28 overflow-hidden relative bg-ink/60 border-b border-paper/10">
                            <img 
                              src={getOptimizedImageUrl(relArt.featuredImage, 'thumbnail')}
                              alt={relArt.title}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-transparent to-transparent" />
                          </div>
                        )}

                        <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center gap-2 mb-2">
                              <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40">
                                {relArt.category} · {relArt.readTime || '5 min read'}
                              </span>
                              <span className="font-mono text-[8px] bg-blood/20 border border-blood/40 text-amber-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                                Match score: {score}
                              </span>
                            </div>
                            
                            <h4 className="font-display text-sm font-bold text-paper/90 group-hover:text-blood transition-colors line-clamp-2 leading-snug">
                              {relArt.title}
                            </h4>
                            
                            <p className="font-serif text-[11px] text-paper/50 line-clamp-2 leading-relaxed mt-1">
                              {relArt.excerpt || relArt.subtitle}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-paper/10 space-y-2">
                            {/* Reason indicators: Author and Series badges */}
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {isSameAuthor && (
                                <span className="font-sans text-[8px] font-semibold bg-paper/10 border border-paper/20 text-paper/80 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                  ✍️ {authorMatchName ? `Author: ${authorMatchName}` : 'Same Author'}
                                </span>
                              )}
                              {isSameSeries && (
                                <span className="font-sans text-[8px] font-semibold bg-blood/20 border border-blood/40 text-red-300 px-1.5 py-0.5 rounded-sm">
                                  📚 Series Companion
                                </span>
                              )}
                            </div>

                            {/* Shared Tags */}
                            {sharedTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="font-sans text-[8px] text-blood uppercase tracking-wider font-semibold">Shared Themes:</span>
                                {sharedTags.slice(0, 3).map(tag => (
                                  <span key={tag} className="font-mono text-[9px] text-paper/50 bg-paper/5 px-1 py-0.2 rounded-xs">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-1 text-right font-sans text-[8px] font-bold uppercase tracking-wider text-paper/30 group-hover:text-blood transition-colors">
                              Trace Investigation Overlap →
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scholarly Author Bio Card & More By This Author Section */}
              <AuthorBioCard
                currentArticle={selectedArticle}
                allArticles={articles}
                contributors={contributors}
                onSelectArticle={handleArticleClick}
                onSelectContributor={(contributorIdOrName) => {
                  setSelectedContributorId(contributorIdOrName);
                  setActiveTab('contributors');
                }}
              />

            </article>
          </div>
          )
        )}

      </main>

      {/* Global Academic footer */}
      {activeTab !== 'admin' && (
        <Footer 
          setActiveTab={setActiveTab} 
          setCategoryFilter={setCategoryFilter} 
          siteSettings={siteSettings}
        />
      )}

      {/* Interactive Marginalia Side Drawer / Debate Portal Panel */}
      {selectedArticle && (
        <MarginaliaPanel 
          isOpen={isMarginaliaOpen}
          onClose={() => setIsMarginaliaOpen(false)}
          articleId={selectedArticle.id}
          articleTitle={selectedArticle.title}
          paragraphIndex={annotationParagraphIndex}
          paragraphText={annotationParagraphText}
        />
      )}

      {/* Floating Share Action Menu for Active Article Reading */}
      {activeTab === 'article-view' && selectedArticle && (
        <FloatingShareMenu
          article={selectedArticle}
          isBookmarked={savedArticles.some(a => a.articleId === selectedArticle.id)}
          onBookmarkToggle={() => handleToggleSaveArticle(selectedArticle)}
          onCopyLinkNotification={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}

      {/* Interactive Citation Footnote Popover Overlay */}
      {activeTab === 'article-view' && activeFootnote && (
        <FootnotePopover
          footnote={activeFootnote}
          onClose={() => setActiveFootnote(null)}
          onJumpToBibliography={handleJumpToBibliography}
        />
      )}

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#0c0c0c] border border-blood/50 text-paper px-4 py-3 rounded-sm shadow-2xl flex items-center gap-2.5 font-sans text-xs select-none max-w-sm"
            id="toast-notification-banner"
          >
            <CheckCircle2 size={16} className="text-blood-light" />
            <span className="font-serif italic text-paper/90">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
