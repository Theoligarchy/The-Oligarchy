import { Article } from '../types';
import { INITIAL_SEED_ARTICLES } from '../data/initialSeed';

const CACHE_KEY = 'tol_cached_articles';
const CRASH_DRAFT_KEY = 'tol_autosave_recovery';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache freshness TTL
const CRASH_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days draft recovery TTL

interface CachedArticlesEnvelope {
  timestamp: number;
  version: number;
  articles: Article[];
}

/**
 * Retrieves cached articles from local storage with TTL and schema validation.
 * Eliminates initial content flash (FOIC) while preventing stale drafts from lingering.
 */
export function getCachedArticles(): Article[] {
  try {
    // Periodically clean up stale crash drafts
    cleanStaleCrashDraft();

    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return INITIAL_SEED_ARTICLES;

    const parsed = JSON.parse(raw);

    // Handle envelope wrapper
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.articles)) {
      const envelope = parsed as CachedArticlesEnvelope;
      const isStale = Date.now() - (envelope.timestamp || 0) > CACHE_TTL_MS;
      
      if (isStale) {
        // If cache TTL expired, sanitize and return without lingering stale drafts
        return envelope.articles.filter(a => a.status === 'published');
      }

      return envelope.articles;
    }

    // Handle legacy raw array format
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse cached articles from localStorage:', e);
  }

  return INITIAL_SEED_ARTICLES;
}

/**
 * Saves articles to localStorage with metadata timestamp for revision management.
 */
export function setCachedArticles(articles: Article[]): void {
  try {
    if (!Array.isArray(articles) || articles.length === 0) return;
    
    const envelope: CachedArticlesEnvelope = {
      timestamp: Date.now(),
      version: 2,
      articles
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch (e) {
    console.error('Failed to write articles to local cache:', e);
  }
}

/**
 * Explicitly invalidates the cached articles to guarantee fresh edits are pulled.
 */
export function invalidateArticleCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
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
    // If corrupt, remove safely
    try {
      localStorage.removeItem(CRASH_DRAFT_KEY);
    } catch {}
  }
}
