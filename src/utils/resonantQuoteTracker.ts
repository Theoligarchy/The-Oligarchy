/**
 * Resonant Quotes & Text Interaction Telemetry Engine
 * 
 * Tracks anonymous signals of reader attention and text interaction (highlighting
 * and copying text blocks) strictly within the article body.
 * 
 * PRIVACY GUARANTEE:
 * - NO exact selected text is ever stored or transmitted.
 * - NO clipboard contents are ever read, altered, or saved.
 * - NO email, user identity, IP address, or destination application is recorded.
 * - Only the article ID, stable contentBlockId, interaction type, anonymous session ID,
 *   and timestamp are captured.
 * - This metric measures attention, perceived importance, pedagogical utility,
 *   or debate—NEVER "proof of agreement."
 */

import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { 
  Article, 
  ViewLog, 
  ResonantQuoteEvent, 
  ResonantInteractionType, 
  ParagraphResonanceStats, 
  ArticleResonanceSummary,
  CategoryResonanceSummary,
  SeriesResonanceSummary
} from '../types';
import { sanitizeFirestoreData } from './firestoreSanitizer';
import { getOrCreateVisitorId, getOrCreateSessionId } from './analyticsTracker';
import { extractContentBlocks, ResolvedContentBlock } from './contentBlockIdentifier';

// Collection in Firestore
export const RESONANT_QUOTES_COLLECTION = 'resonant_quote_interactions';

// Minimum character length to count as a genuine selection (avoids accidental cursor clicks)
const MIN_SELECTION_LENGTH = 10;

// Cooldown between repeated copy events on the same content block in the same session (ms)
const COPY_COOLDOWN_MS = 45000;

// In-memory set of tracked interactions for the current tab lifetime
const trackedInteractionsInSession = new Set<string>();
const lastCopyTimestampMap = new Map<string, number>();

// Event buffer queue for batched writes
let pendingEventQueue: ResonantQuoteEvent[] = [];
let batchFlushTimer: number | null = null;

/**
 * Check if an interaction has already occurred in this session (persisted via sessionStorage)
 */
function hasInteractionOccurredInSession(key: string): boolean {
  if (trackedInteractionsInSession.has(key)) return true;
  if (typeof window !== 'undefined') {
    try {
      return sessionStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Record an interaction in the session cache
 */
function recordInteractionInSession(key: string) {
  trackedInteractionsInSession.add(key);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(key, '1');
    } catch {}
  }
}

/**
 * Flush pending resonant quote events to Firestore in a controlled batch
 */
export async function flushResonantQuoteQueue(): Promise<void> {
  if (pendingEventQueue.length === 0) return;

  const eventsToFlush = [...pendingEventQueue];
  pendingEventQueue = [];

  if (batchFlushTimer) {
    clearTimeout(batchFlushTimer);
    batchFlushTimer = null;
  }

  try {
    const colRef = collection(db, RESONANT_QUOTES_COLLECTION);
    
    // Write events sequentially or in parallel batches
    await Promise.all(
      eventsToFlush.map(async (event) => {
        try {
          await addDoc(colRef, sanitizeFirestoreData(event));
        } catch (docErr) {
          console.warn('Resonant quote event write error:', docErr);
        }
      })
    );
  } catch (err) {
    console.warn('Failed to flush resonant quote events to Firestore:', err);
  }
}

/**
 * Enqueue a resonant quote interaction with debounced batch writing
 */
function enqueueResonantQuoteEvent(event: ResonantQuoteEvent) {
  pendingEventQueue.push(event);

  if (!batchFlushTimer && typeof window !== 'undefined') {
    batchFlushTimer = window.setTimeout(() => {
      flushResonantQuoteQueue();
    }, 1200);
  }
}

/**
 * Set up real-time browser highlight and copy event tracking for an active article
 * Returns a teardown cleanup function.
 */
export function setupResonantQuoteTracker(
  article: Article,
  containerId: string = 'article-body-content'
): () => void {
  if (typeof window === 'undefined' || !article?.id) {
    return () => {};
  }

  let selectionDebounceTimer: number | null = null;

  /**
   * Helper: verify if a DOM node or selection is strictly inside the article body
   * and NOT inside buttons, footnotes, navigation, forms, or metadata.
   */
  const isValidArticleContentTarget = (node: Node | null, container: HTMLElement): HTMLElement | null => {
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    if (!element) return null;

    // Must be inside article body container
    if (!container.contains(element)) return null;

    // Ignore interactive controls, citations, marginalia buttons, newsletter forms
    if (
      element.closest('.footnote-ref-btn') ||
      element.closest('button') ||
      element.closest('form') ||
      element.closest('.no-resonance') ||
      element.closest('#marginalia-drawer')
    ) {
      return null;
    }

    // Find closest containing content block with stable block ID
    const contentBlock = element.closest('[data-content-block-id]') as HTMLElement | null;
    return contentBlock;
  };

  /**
   * Handle text highlight / selection
   */
  const handleSelectionProcess = () => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedStr = selection.toString().trim();
    // Enforce minimum character threshold
    if (selectedStr.length < MIN_SELECTION_LENGTH) return;

    // Ensure anchor and focus are inside container
    const anchorBlock = isValidArticleContentTarget(selection.anchorNode, container);
    const focusBlock = isValidArticleContentTarget(selection.focusNode, container);
    const targetBlock = anchorBlock || focusBlock;

    if (!targetBlock) return;

    const contentBlockId = targetBlock.getAttribute('data-content-block-id');
    if (!contentBlockId) return;

    const sessionId = getOrCreateSessionId();
    const { visitorId } = getOrCreateVisitorId();

    // Deduplication: Count a highlight for a specific content block only once per session
    const sessionKey = `tol_rq_hl_${article.id}_${contentBlockId}_${sessionId}`;
    if (hasInteractionOccurredInSession(sessionKey)) {
      return;
    }

    recordInteractionInSession(sessionKey);

    const event: ResonantQuoteEvent = {
      eventType: 'resonant_quote_interaction',
      articleId: article.id,
      articleTitle: article.title,
      category: article.category,
      seriesName: article.seriesName || undefined,
      contentBlockId,
      interactionType: 'highlight',
      sessionId,
      anonymousVisitorId: visitorId,
      timestamp: Date.now(),
      pageVersion: article.updatedAt ? String(article.updatedAt) : (article.publishDate || 'v1')
    };

    enqueueResonantQuoteEvent(event);
  };

  /**
   * Debounced selection change listener
   */
  const onSelectionChange = () => {
    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer);
    }
    selectionDebounceTimer = window.setTimeout(() => {
      handleSelectionProcess();
    }, 700);
  };

  /**
   * Direct mouseup / touchend for instant capture upon release
   */
  const onMouseOrTouchEnd = () => {
    // Delay slightly to let browser complete selection bounds
    window.setTimeout(() => {
      handleSelectionProcess();
    }, 150);
  };

  /**
   * Copy event listener
   * Captures when a reader copies text from the article content
   * DOES NOT ALTER CLIPBOARD, DOES NOT STORE CLIPBOARD TEXT
   */
  const onCopyEvent = (e: ClipboardEvent) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedStr = selection.toString().trim();
    if (selectedStr.length < MIN_SELECTION_LENGTH) return;

    const anchorBlock = isValidArticleContentTarget(selection.anchorNode, container);
    const focusBlock = isValidArticleContentTarget(selection.focusNode, container);
    const targetBlock = anchorBlock || focusBlock;

    if (!targetBlock) return;

    const contentBlockId = targetBlock.getAttribute('data-content-block-id');
    if (!contentBlockId) return;

    const sessionId = getOrCreateSessionId();
    const { visitorId } = getOrCreateVisitorId();
    const now = Date.now();

    // Deduplication & Cooldown: Apply cooldown to repeated copy events for same block
    const cooldownKey = `tol_rq_cp_${article.id}_${contentBlockId}_${sessionId}`;
    const lastCopy = lastCopyTimestampMap.get(cooldownKey) || 0;
    if (now - lastCopy < COPY_COOLDOWN_MS) {
      return;
    }
    lastCopyTimestampMap.set(cooldownKey, now);
    recordInteractionInSession(cooldownKey);

    const event: ResonantQuoteEvent = {
      eventType: 'resonant_quote_interaction',
      articleId: article.id,
      articleTitle: article.title,
      category: article.category,
      seriesName: article.seriesName || undefined,
      contentBlockId,
      interactionType: 'copy',
      sessionId,
      anonymousVisitorId: visitorId,
      timestamp: now,
      pageVersion: article.updatedAt ? String(article.updatedAt) : (article.publishDate || 'v1')
    };

    enqueueResonantQuoteEvent(event);
  };

  // Attach event listeners
  document.addEventListener('selectionchange', onSelectionChange);
  document.addEventListener('mouseup', onMouseOrTouchEnd);
  document.addEventListener('touchend', onMouseOrTouchEnd);
  document.addEventListener('copy', onCopyEvent);

  // Flush on visibility change or page unload
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushResonantQuoteQueue();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', flushResonantQuoteQueue);

  // Return cleanup teardown
  return () => {
    document.removeEventListener('selectionchange', onSelectionChange);
    document.removeEventListener('mouseup', onMouseOrTouchEnd);
    document.removeEventListener('touchend', onMouseOrTouchEnd);
    document.removeEventListener('copy', onCopyEvent);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('beforeunload', flushResonantQuoteQueue);

    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer);
    }
    // Flush any pending events on teardown
    flushResonantQuoteQueue();
  };
}

/**
 * Fetch resonant quote events from Firestore with optional time window filter
 */
export async function fetchResonantQuoteEvents(
  timeRange: 'today' | '7d' | '30d' | 'all' = 'all'
): Promise<ResonantQuoteEvent[]> {
  try {
    const colRef = collection(db, RESONANT_QUOTES_COLLECTION);
    let q = query(colRef, orderBy('timestamp', 'desc'));

    const snap = await getDocs(q);
    const now = Date.now();
    let minTimestamp = 0;

    if (timeRange === 'today') {
      minTimestamp = now - 24 * 60 * 60 * 1000;
    } else if (timeRange === '7d') {
      minTimestamp = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '30d') {
      minTimestamp = now - 30 * 24 * 60 * 60 * 1000;
    }

    const events: ResonantQuoteEvent[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as ResonantQuoteEvent;
      if (minTimestamp > 0 && data.timestamp < minTimestamp) {
        return;
      }
      events.push({ id: docSnap.id, ...data });
    });

    return events;
  } catch (err) {
    console.error('Failed to fetch resonant quote events:', err);
    return [];
  }
}

/**
 * Summary Analytics Structure for Resonant Quotes Dashboard
 */
export interface ResonantQuotesAnalytics {
  totalInteractions: number;
  totalHighlights: number;
  totalCopies: number;
  uniqueInteractingSessions: number;
  totalMeaningfulSessions: number;
  overallResonanceRate: number; // (uniqueInteractingSessions / totalMeaningfulSessions) * 100
  
  paragraphRankings: ParagraphResonanceStats[];
  mostHighlightedParagraphs: ParagraphResonanceStats[];
  mostCopiedParagraphs: ParagraphResonanceStats[];

  articleSummaries: ArticleResonanceSummary[];
  categorySummaries: CategoryResonanceSummary[];
  seriesSummaries: SeriesResonanceSummary[];

  hasData: boolean;
}

/**
 * Compute Resonant Quote Metrics from raw events and views logs
 */
export function computeResonantQuoteMetrics(
  events: ResonantQuoteEvent[],
  allArticles: Article[],
  viewsLogs: ViewLog[]
): ResonantQuotesAnalytics {
  if (!events || events.length === 0) {
    return {
      totalInteractions: 0,
      totalHighlights: 0,
      totalCopies: 0,
      uniqueInteractingSessions: 0,
      totalMeaningfulSessions: 0,
      overallResonanceRate: 0,
      paragraphRankings: [],
      mostHighlightedParagraphs: [],
      mostCopiedParagraphs: [],
      articleSummaries: [],
      categorySummaries: [],
      seriesSummaries: [],
      hasData: false
    };
  }

  // 1. Build an article lookup map and pre-extract content blocks
  const articleMap = new Map<string, Article>();
  const articleBlocksMap = new Map<string, Map<string, ResolvedContentBlock>>();

  allArticles.forEach((art) => {
    articleMap.set(art.id, art);
    const blocks = extractContentBlocks(art.content);
    const blockMap = new Map<string, ResolvedContentBlock>();
    blocks.forEach(b => blockMap.set(b.id, b));
    articleBlocksMap.set(art.id, blockMap);
  });

  // 2. Compute meaningful sessions per article and overall
  // Meaningful session: Active reading time >= 30 seconds OR scroll depth >= 25% (excludes pure bouncers)
  const articleMeaningfulSessions = new Map<string, Set<string>>();
  const allMeaningfulSessions = new Set<string>();

  viewsLogs.forEach((v) => {
    if (!v.articleId || v.articleId.startsWith('page-')) return;
    const isMeaningful = (v.activeReadingSeconds || 0) >= 30 || 
                         (v.readDurationSeconds || 0) >= 30 || 
                         (v.scrollDepthPercent || 0) >= 25;
    
    if (isMeaningful && v.sessionId) {
      allMeaningfulSessions.add(v.sessionId);
      let set = articleMeaningfulSessions.get(v.articleId);
      if (!set) {
        set = new Set<string>();
        articleMeaningfulSessions.set(v.articleId, set);
      }
      set.add(v.sessionId);
    }
  });

  // 3. Aggregate paragraph-level interactions
  // Key: `${articleId}::${contentBlockId}`
  interface ParagraphAgg {
    articleId: string;
    contentBlockId: string;
    highlights: number;
    copies: number;
    sessions: Set<string>;
  }

  const paragraphMap = new Map<string, ParagraphAgg>();
  const articleInteractionsMap = new Map<string, {
    highlights: number;
    copies: number;
    sessions: Set<string>;
  }>();

  const globalSessions = new Set<string>();
  let totalHighlights = 0;
  let totalCopies = 0;

  events.forEach((ev) => {
    if (ev.interactionType === 'highlight') totalHighlights++;
    if (ev.interactionType === 'copy') totalCopies++;
    if (ev.sessionId) globalSessions.add(ev.sessionId);

    // Paragraph agg
    const pKey = `${ev.articleId}::${ev.contentBlockId}`;
    let pAgg = paragraphMap.get(pKey);
    if (!pAgg) {
      pAgg = {
        articleId: ev.articleId,
        contentBlockId: ev.contentBlockId,
        highlights: 0,
        copies: 0,
        sessions: new Set<string>()
      };
      paragraphMap.set(pKey, pAgg);
    }

    if (ev.interactionType === 'highlight') pAgg.highlights++;
    if (ev.interactionType === 'copy') pAgg.copies++;
    if (ev.sessionId) pAgg.sessions.add(ev.sessionId);

    // Article agg
    let aAgg = articleInteractionsMap.get(ev.articleId);
    if (!aAgg) {
      aAgg = {
        highlights: 0,
        copies: 0,
        sessions: new Set<string>()
      };
      articleInteractionsMap.set(ev.articleId, aAgg);
    }
    if (ev.interactionType === 'highlight') aAgg.highlights++;
    if (ev.interactionType === 'copy') aAgg.copies++;
    if (ev.sessionId) aAgg.sessions.add(ev.sessionId);
  });

  // 4. Resolve paragraph details and calculate rates
  const paragraphRankings: ParagraphResonanceStats[] = [];

  paragraphMap.forEach((agg) => {
    const art = articleMap.get(agg.articleId);
    const blockMap = articleBlocksMap.get(agg.articleId);
    const resolvedBlock = blockMap?.get(agg.contentBlockId);

    const articleTitle = art?.title || 'Unknown Investigation';
    const category = art?.category || 'general';
    const seriesName = art?.seriesName;
    const meaningfulCount = articleMeaningfulSessions.get(agg.articleId)?.size || 
                            Math.max(agg.sessions.size, 1);

    const uniqueSessions = agg.sessions.size;
    const resonanceRate = meaningfulCount > 0 
      ? Math.min(100, Math.round((uniqueSessions / meaningfulCount) * 1000) / 10)
      : 0;

    paragraphRankings.push({
      contentBlockId: agg.contentBlockId,
      articleId: agg.articleId,
      articleTitle,
      category,
      seriesName,
      paragraphText: resolvedBlock?.text || 'Text snippet not indexed in published revision.',
      paragraphIndex: resolvedBlock ? resolvedBlock.index : -1,
      tagName: resolvedBlock ? resolvedBlock.tagName : 'p',
      highlightCount: agg.highlights,
      copyCount: agg.copies,
      totalInteractions: agg.highlights + agg.copies,
      uniqueSessionCount: uniqueSessions,
      meaningfulArticleSessions: meaningfulCount,
      resonanceRate
    });
  });

  // Sort overall by total interactions descending
  paragraphRankings.sort((a, b) => b.totalInteractions - a.totalInteractions);

  // Most highlighted paragraphs
  const mostHighlightedParagraphs = [...paragraphRankings]
    .filter(p => p.highlightCount > 0)
    .sort((a, b) => b.highlightCount - a.highlightCount);

  // Most copied paragraphs
  const mostCopiedParagraphs = [...paragraphRankings]
    .filter(p => p.copyCount > 0)
    .sort((a, b) => b.copyCount - a.copyCount);

  // 5. Article Summaries
  const articleSummaries: ArticleResonanceSummary[] = [];

  articleInteractionsMap.forEach((agg, artId) => {
    const art = articleMap.get(artId);
    const meaningfulCount = articleMeaningfulSessions.get(artId)?.size || Math.max(agg.sessions.size, 1);
    const uniqueSessions = agg.sessions.size;
    const resonanceRate = meaningfulCount > 0
      ? Math.min(100, Math.round((uniqueSessions / meaningfulCount) * 1000) / 10)
      : 0;

    // Find top paragraph for this article
    const topPara = paragraphRankings.find(p => p.articleId === artId);

    articleSummaries.push({
      articleId: artId,
      articleTitle: art?.title || 'Unknown Investigation',
      category: art?.category || 'general',
      seriesName: art?.seriesName,
      highlightCount: agg.highlights,
      copyCount: agg.copies,
      totalInteractions: agg.highlights + agg.copies,
      uniqueSessions,
      meaningfulSessions: meaningfulCount,
      resonanceRate,
      topParagraphId: topPara?.contentBlockId
    });
  });

  articleSummaries.sort((a, b) => b.totalInteractions - a.totalInteractions);

  // 6. Category Summaries
  const categoryMap = new Map<string, {
    highlights: number;
    copies: number;
    sessions: Set<string>;
    articles: Set<string>;
  }>();

  events.forEach((ev) => {
    const cat = ev.category || articleMap.get(ev.articleId)?.category || 'general';
    let cAgg = categoryMap.get(cat);
    if (!cAgg) {
      cAgg = {
        highlights: 0,
        copies: 0,
        sessions: new Set<string>(),
        articles: new Set<string>()
      };
      categoryMap.set(cat, cAgg);
    }
    if (ev.interactionType === 'highlight') cAgg.highlights++;
    if (ev.interactionType === 'copy') cAgg.copies++;
    if (ev.sessionId) cAgg.sessions.add(ev.sessionId);
    if (ev.articleId) cAgg.articles.add(ev.articleId);
  });

  const categorySummaries: CategoryResonanceSummary[] = Array.from(categoryMap.entries()).map(([cat, cAgg]) => ({
    category: cat,
    totalInteractions: cAgg.highlights + cAgg.copies,
    highlightCount: cAgg.highlights,
    copyCount: cAgg.copies,
    uniqueSessions: cAgg.sessions.size,
    articleCount: cAgg.articles.size
  })).sort((a, b) => b.totalInteractions - a.totalInteractions);

  // 7. Series Summaries
  const seriesMap = new Map<string, {
    highlights: number;
    copies: number;
    sessions: Set<string>;
    articles: Set<string>;
  }>();

  events.forEach((ev) => {
    const art = articleMap.get(ev.articleId);
    const series = ev.seriesName || art?.seriesName;
    if (!series) return;

    let sAgg = seriesMap.get(series);
    if (!sAgg) {
      sAgg = {
        highlights: 0,
        copies: 0,
        sessions: new Set<string>(),
        articles: new Set<string>()
      };
      seriesMap.set(series, sAgg);
    }
    if (ev.interactionType === 'highlight') sAgg.highlights++;
    if (ev.interactionType === 'copy') sAgg.copies++;
    if (ev.sessionId) sAgg.sessions.add(ev.sessionId);
    if (ev.articleId) sAgg.articles.add(ev.articleId);
  });

  const seriesSummaries: SeriesResonanceSummary[] = Array.from(seriesMap.entries()).map(([ser, sAgg]) => ({
    seriesName: ser,
    totalInteractions: sAgg.highlights + sAgg.copies,
    highlightCount: sAgg.highlights,
    copyCount: sAgg.copies,
    uniqueSessions: sAgg.sessions.size,
    articleCount: sAgg.articles.size
  })).sort((a, b) => b.totalInteractions - a.totalInteractions);

  // Overall Resonance Rate among meaningful sessions across the publication
  const totalMeaningfulCount = allMeaningfulSessions.size || Math.max(globalSessions.size, 1);
  const overallResonanceRate = totalMeaningfulCount > 0
    ? Math.min(100, Math.round((globalSessions.size / totalMeaningfulCount) * 1000) / 10)
    : 0;

  return {
    totalInteractions: totalHighlights + totalCopies,
    totalHighlights,
    totalCopies,
    uniqueInteractingSessions: globalSessions.size,
    totalMeaningfulSessions: totalMeaningfulCount,
    overallResonanceRate,
    paragraphRankings,
    mostHighlightedParagraphs,
    mostCopiedParagraphs,
    articleSummaries,
    categorySummaries,
    seriesSummaries,
    hasData: true
  };
}
