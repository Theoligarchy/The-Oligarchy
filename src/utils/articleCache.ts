import { Article } from '../types';
import { INITIAL_SEED_ARTICLES } from '../data/initialSeed';
import { clearFullArticlesCache } from '../firebase';

const CACHE_KEY = 'tol_cached_articles';
const CRASH_DRAFT_KEY = 'tol_autosave_recovery';
// Cache freshness threshold: 2 minutes for active freshness, with instant fallback
const CACHE_FRESHNESS_TTL_MS = 2 * 60 * 1000;
const CRASH_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days draft recovery TTL

export interface CachedArticlesEnvelope {
  timestamp: number;
  version: number;
  isStale?: boolean;
  articles: Article[];
}

/**
 * Checks whether the current local cache is stale and requires server revalidation.
 */
export function isArticleCacheStale(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.timestamp) {
      return Date.now() - parsed.timestamp > CACHE_FRESHNESS_TTL_MS;
    }
  } catch {
    return true;
  }
  return true;
}

/**
 * Retrieves cached articles from local storage.
 * Eliminates initial content flash (FOIC) while flagging articles with fromCache metadata.
 */
export function getCachedArticles(): Article[] {
  try {
    cleanStaleCrashDraft();

    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return INITIAL_SEED_ARTICLES;

    const parsed = JSON.parse(raw);

    // Handle envelope wrapper
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.articles)) {
      const envelope = parsed as CachedArticlesEnvelope;
      const isStale = Date.now() - (envelope.timestamp || 0) > CACHE_FRESHNESS_TTL_MS;

      // Mark articles as loaded from cache
      return envelope.articles.map(art => ({
        ...art,
        fromCache: true
      }));
    }

    // Handle legacy raw array format
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(art => ({ ...art, fromCache: true }));
    }
  } catch (e) {
    console.warn('Failed to parse cached articles from localStorage:', e);
  }

  return INITIAL_SEED_ARTICLES;
}

/**
 * Saves articles to localStorage with metadata timestamp for revision management.
 */
export function setCachedArticles(articles: Article[], isFromServer: boolean = true): void {
  try {
    if (!Array.isArray(articles) || articles.length === 0) return;
    
    // Clean and tag documents
    const sanitizedArticles = articles.map(art => ({
      ...art,
      fromCache: !isFromServer
    }));

    const envelope: CachedArticlesEnvelope = {
      timestamp: Date.now(),
      version: 3,
      articles: sanitizedArticles
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch (e) {
    console.error('Failed to write articles to local cache:', e);
  }
}

/**
 * Explicitly invalidates the cached articles and notifies all active listeners
 * (Service Worker, other tabs, React components) to guarantee fresh edits are pulled.
 */
export function invalidateArticleCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    clearFullArticlesCache();
    
    // Broadcast cross-tab and in-window cache invalidation event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tol_article_cache_invalidated', { detail: { timestamp: Date.now() } }));
      
      // Notify Service Worker to clear article and image caches
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ARTICLE_CACHE' });
      }
    }
  } catch (e) {
    console.error('Failed to invalidate article cache:', e);
  }
}

/**
 * Periodically cleans up stale crash recovery drafts if they exceed TTL.
 */
export function cleanStaleCrashDraft(): void {
  try {
    const raw = localStorage.getItem(CRASH_DRAFT_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.savedAt) {
      const age = Date.now() - new Date(parsed.savedAt).getTime();
      if (age > CRASH_DRAFT_TTL_MS) {
        localStorage.removeItem(CRASH_DRAFT_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(CRASH_DRAFT_KEY);
    } catch {}
  }
}

