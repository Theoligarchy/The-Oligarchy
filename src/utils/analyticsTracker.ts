import { db } from '../firebase';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Article, ReaderClassification } from '../types';
import { sanitizeFirestoreData } from './firestoreSanitizer';
import { 
  classifyReaderSession, 
  MILESTONE_LEVELS 
} from './readerClassification';
import { recordArticleJourneyStep } from './attributionTracker';

// Storage keys
const VISITOR_ID_KEY = 'tol_visitor_id';
const LAST_VISIT_KEY = 'tol_last_visit_time';
const SESSION_ID_KEY = 'tol_session_id';
const ACTIVE_TAB_COORDINATOR_KEY = 'tol_active_reading_tab';

// Inactivity threshold: 35 seconds without any user input pauses the active reading timer
const INACTIVITY_TIMEOUT_MS = 35000;

// Unique tab session ID for this browser tab instance
const TAB_INSTANCE_ID = typeof window !== 'undefined' 
  ? 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7)
  : 'server_tab';

/**
 * Get or create a persistent anonymous visitor ID
 * Uses anonymous UUID generation. No PII, cookies, or IP addresses collected.
 */
export function getOrCreateVisitorId(): { visitorId: string; isReturning: boolean } {
  if (typeof window === 'undefined') {
    return { visitorId: 'server-visitor', isReturning: false };
  }

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const isReturning = Boolean(visitorId && lastVisit);

  if (!visitorId) {
    visitorId = 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  // Record current visit timestamp
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());

  return { visitorId, isReturning };
}

/**
 * Get or create a session ID for the current browser tab
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Detect client device type accurately
 */
export function detectDeviceType(ua?: string): 'desktop' | 'mobile' | 'tablet' {
  const userAgent = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const lower = userAgent.toLowerCase();
  if (lower.includes('ipad') || lower.includes('tablet') || (lower.includes('android') && !lower.includes('mobile'))) {
    return 'tablet';
  }
  if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('ipod') || lower.includes('android')) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Detect clean browser family name
 */
export function detectBrowser(ua?: string): string {
  const userAgent = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const lower = userAgent.toLowerCase();
  if (lower.includes('edg/')) return 'Microsoft Edge';
  if (lower.includes('opr/') || lower.includes('opera')) return 'Opera';
  if (lower.includes('chrome') && !lower.includes('edg/')) return 'Google Chrome';
  if (lower.includes('safari') && !lower.includes('chrome')) return 'Apple Safari';
  if (lower.includes('firefox')) return 'Mozilla Firefox';
  if (lower.includes('brave')) return 'Brave Browser';
  return 'Other Browser';
}

export interface ActiveSessionRecord {
  sessionId: string;
  visitorId: string;
  page: string;
  articleId?: string;
  articleTitle?: string;
  startedAt: number;
  lastActive: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  referrer: string;
  readDurationSeconds?: number;
  scrollDepthPercent?: number;
  classification?: ReaderClassification | null;
}

// Global active session state
let activeHeartbeatInterval: number | null = null;
let activeSecondTickerInterval: number | null = null;
let currentViewDocId: string | null = null;
let currentActiveSession: ActiveSessionRecord | null = null;

// Telemetry counters for the current article
let currentActiveReadingSeconds = 0;
let currentMaxScrollDepth = 0;
const reachedMilestones = new Set<number>();
let isCurrentArticleSession = false;
let lastUserActivityTime = Date.now();
let lastSyncTimestamp = 0;
let syncDebounceTimeout: number | null = null;

/**
 * Mark user activity (keyboard, mouse, touch, scroll)
 * Resumes active reading time calculation if tab is focused
 */
function recordUserActivity() {
  lastUserActivityTime = Date.now();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_TAB_COORDINATOR_KEY, TAB_INSTANCE_ID);
    } catch {}
  }
}

// Global interaction listeners
if (typeof window !== 'undefined') {
  const activityEvents = ['scroll', 'mousemove', 'mousedown', 'keydown', 'click', 'touchstart', 'touchmove', 'pointerdown', 'wheel'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Immediately flush current metrics when reader switches away
      syncSessionTelemetry(true);
    } else {
      recordUserActivity();
    }
  });

  // Handle window focus/blur for multi-tab coordination
  window.addEventListener('focus', () => {
    recordUserActivity();
  });
}

/**
 * Synchronize the current reading metrics to Firestore
 */
async function syncSessionTelemetry(forceImmediate: boolean = false) {
  if (!currentViewDocId && !currentActiveSession) return;

  const now = Date.now();
  // Throttle updates to at most once every 5 seconds unless forced
  if (!forceImmediate && now - lastSyncTimestamp < 5000) {
    if (!syncDebounceTimeout) {
      syncDebounceTimeout = window.setTimeout(() => {
        syncDebounceTimeout = null;
        syncSessionTelemetry(true);
      }, 5000);
    }
    return;
  }
  lastSyncTimestamp = now;

  const classification = isCurrentArticleSession 
    ? classifyReaderSession(currentActiveReadingSeconds, currentMaxScrollDepth)
    : null;

  const milestonesArray = Array.from(reachedMilestones).sort((a, b) => a - b);

  // 1. Update views_log entry
  if (currentViewDocId) {
    try {
      const viewDocRef = doc(db, 'views_log', currentViewDocId);
      await updateDoc(viewDocRef, sanitizeFirestoreData({
        readDurationSeconds: currentActiveReadingSeconds,
        activeReadingSeconds: currentActiveReadingSeconds,
        scrollDepthPercent: currentMaxScrollDepth,
        maxScrollDepth: currentMaxScrollDepth,
        classification,
        milestones: milestonesArray,
        updatedAt: now
      }));
    } catch {
      // Non-blocking catch for offline/network hiccups
    }
  }

  // 2. Update active_sessions heartbeat
  if (currentActiveSession) {
    try {
      const sessionDocRef = doc(db, 'active_sessions', currentActiveSession.sessionId);
      await setDoc(sessionDocRef, sanitizeFirestoreData({
        ...currentActiveSession,
        lastActive: now,
        readDurationSeconds: currentActiveReadingSeconds,
        scrollDepthPercent: currentMaxScrollDepth,
        classification
      }), { merge: true });
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Start 1-second interval ticker that strictly accumulates active reading time
 * Criteria:
 * - Document must be visible (document.visibilityState === 'visible')
 * - Window must have focus (document.hasFocus())
 * - This tab must be the active tab in localStorage
 * - User must have interacted within the last 35 seconds
 */
function startActiveSecondsTicker() {
  if (activeSecondTickerInterval) {
    clearInterval(activeSecondTickerInterval);
  }

  activeSecondTickerInterval = window.setInterval(() => {
    if (typeof document === 'undefined') return;

    // Check 1: Tab visibility
    if (document.visibilityState === 'hidden') {
      return;
    }

    // Check 2: Window focus
    if (!document.hasFocus()) {
      return;
    }

    // Check 3: Multi-tab coordination - only the active tab counts
    try {
      const activeTabId = localStorage.getItem(ACTIVE_TAB_COORDINATOR_KEY);
      if (activeTabId && activeTabId !== TAB_INSTANCE_ID) {
        return;
      }
    } catch {}

    // Check 4: User activity timeout (inactivity threshold)
    const timeSinceLastActivity = Date.now() - lastUserActivityTime;
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT_MS) {
      return;
    }

    // Only count active reading seconds for article views
    if (!isCurrentArticleSession) {
      return;
    }

    // Increment confirmed active reading seconds
    currentActiveReadingSeconds++;
  }, 1000);
}

/**
 * Calculate container-specific scroll progress for an article
 * Ignores site navigation, headers, commentary, and footers
 */
export function calculateArticleScrollProgress(containerEl: HTMLElement): number {
  if (!containerEl) return 0;

  const rect = containerEl.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const containerHeight = containerEl.offsetHeight || containerEl.scrollHeight;

  if (containerHeight <= 0) return 0;

  // If container hasn't entered viewport yet
  if (rect.top >= windowHeight) {
    return 0;
  }

  // Reading horizon is ~75% of viewport height (natural reading eye focal plane)
  const readingFocalY = windowHeight * 0.75;
  const pixelsScrolledIntoContainer = readingFocalY - rect.top;

  if (pixelsScrolledIntoContainer <= 0) {
    return 0;
  }

  // If the bottom of the article has entered the viewport reading horizon
  if (rect.bottom <= windowHeight) {
    return 100;
  }

  const rawPercent = Math.round((pixelsScrolledIntoContainer / containerHeight) * 100);
  return Math.min(100, Math.max(0, rawPercent));
}

/**
 * Initialize container-specific scroll tracker for research articles
 * Listens for scroll events, checks milestone boundaries [25, 50, 75, 90, 100],
 * and throttles updates to prevent excessive events.
 */
export function setupArticleScrollTracker(
  containerIdOrSelector: string = 'article-body-content',
  onDepthChange?: (depth: number, milestones: number[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let ticking = false;

  const checkScroll = () => {
    ticking = false;
    let container = document.getElementById(containerIdOrSelector);
    if (!container) {
      container = document.querySelector('.article-content') || document.querySelector('article');
    }

    let currentDepth = 0;
    if (container) {
      currentDepth = calculateArticleScrollProgress(container as HTMLElement);
    } else {
      // Fallback if no container is found
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight > 0) {
        currentDepth = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
      }
    }

    if (currentDepth > currentMaxScrollDepth) {
      currentMaxScrollDepth = currentDepth;

      // Check milestones [25, 50, 75, 90, 100]
      let newMilestoneReached = false;
      MILESTONE_LEVELS.forEach(milestone => {
        if (currentMaxScrollDepth >= milestone && !reachedMilestones.has(milestone)) {
          reachedMilestones.add(milestone);
          newMilestoneReached = true;
        }
      });

      if (onDepthChange) {
        onDepthChange(currentMaxScrollDepth, Array.from(reachedMilestones));
      }

      // If a milestone was crossed, sync telemetry
      if (newMilestoneReached) {
        syncSessionTelemetry(false);
      }
    }
  };

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(checkScroll);
      ticking = true;
    }
  };

  // Initial check after render
  window.setTimeout(checkScroll, 300);

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleScroll);
  };
}

/**
 * Backward-compatible general scroll tracker
 */
export function setupScrollTracker(onDepthChange?: (depth: number) => void) {
  return setupArticleScrollTracker('article-body-content', (depth) => {
    if (onDepthChange) onDepthChange(depth);
  });
}

/**
 * Track a page or article view event to Firestore views_log
 */
export async function trackPageView(
  page: string,
  article?: Article | null
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Flush any prior session metrics
  await syncSessionTelemetry(true);

  const { visitorId, isReturning } = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const deviceType = detectDeviceType();
  const browser = detectBrowser();
  const now = Date.now();

  // Reset telemetry state for new article/view
  currentActiveReadingSeconds = 0;
  currentMaxScrollDepth = 0;
  reachedMilestones.clear();
  isCurrentArticleSession = Boolean(article && article.id);
  lastUserActivityTime = now;

  // Mark this tab as active coordinator
  try {
    localStorage.setItem(ACTIVE_TAB_COORDINATOR_KEY, TAB_INSTANCE_ID);
  } catch {}

  // Record article journey step for 7-day conversion attribution
  if (article && article.id && !article.id.startsWith('page-')) {
    recordArticleJourneyStep(article.id, article.title, article.category);
  }

  const viewData: Record<string, any> = {
    articleId: article ? article.id : `page-${page}`,
    articleTitle: article ? article.title : `Page: ${page.charAt(0).toUpperCase() + page.slice(1)}`,
    category: article?.category || 'general',
    timestamp: now,
    visitorId,
    sessionId,
    isReturning,
    deviceType,
    browser,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    referrer: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'direct',
    readDurationSeconds: 0,
    activeReadingSeconds: 0,
    scrollDepthPercent: 0,
    maxScrollDepth: 0,
    classification: null,
    milestones: []
  };

  if (article?.authorId) {
    viewData.authorId = article.authorId;
  }
  if (article?.createdByEmail) {
    viewData.authorEmail = article.createdByEmail;
  }

  try {
    const colRef = collection(db, 'views_log');
    const docRef = await addDoc(colRef, sanitizeFirestoreData(viewData));
    currentViewDocId = docRef.id;

    // Start active reader heartbeat
    const sessionPayload: ActiveSessionRecord = {
      sessionId,
      visitorId,
      page,
      startedAt: now,
      lastActive: now,
      deviceType,
      browser,
      referrer: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'direct',
      readDurationSeconds: 0,
      scrollDepthPercent: 0,
      classification: null
    };
    if (article?.id) sessionPayload.articleId = article.id;
    if (article?.title) sessionPayload.articleTitle = article.title;

    currentActiveSession = sessionPayload;
    startActiveHeartbeat(sessionPayload);
    startActiveSecondsTicker();

    return docRef.id;
  } catch (err) {
    console.warn('Analytics event logging unavailable:', err);
    return null;
  }
}

/**
 * Start heartbeat for live active reader presence
 */
export function startActiveHeartbeat(session: ActiveSessionRecord) {
  if (activeHeartbeatInterval) {
    clearInterval(activeHeartbeatInterval);
    activeHeartbeatInterval = null;
  }
  currentActiveSession = session;

  const sendHeartbeat = async () => {
    syncSessionTelemetry(false);
  };

  // Immediate first heartbeat
  sendHeartbeat();

  // Pulse every 15 seconds to keep active presence fresh and sync metrics
  activeHeartbeatInterval = window.setInterval(sendHeartbeat, 15000);

  // Clean up session on window unload
  if (typeof window !== 'undefined') {
    const cleanupSession = () => {
      syncSessionTelemetry(true);
      if (session.sessionId) {
        try {
          const sessionDocRef = doc(db, 'active_sessions', session.sessionId);
          deleteDoc(sessionDocRef).catch(() => {});
        } catch {}
      }
    };

    window.addEventListener('beforeunload', cleanupSession, { once: true });
    window.addEventListener('pagehide', cleanupSession, { once: true });
  }
}

/**
 * End current active session cleanly (e.g. when navigating away)
 */
export function stopActiveHeartbeat() {
  syncSessionTelemetry(true);

  if (activeHeartbeatInterval) {
    clearInterval(activeHeartbeatInterval);
    activeHeartbeatInterval = null;
  }
  if (activeSecondTickerInterval) {
    clearInterval(activeSecondTickerInterval);
    activeSecondTickerInterval = null;
  }

  isCurrentArticleSession = false;

  const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (sessionId) {
    try {
      const sessionDocRef = doc(db, 'active_sessions', sessionId);
      deleteDoc(sessionDocRef).catch(() => {});
    } catch {}
  }
  currentActiveSession = null;
  currentViewDocId = null;
}

/**
 * Real-time listener for live active visitors
 * Queries active_sessions where lastActive >= Date.now() - 45000 (within last 45 seconds)
 */
export function subscribeToLiveActiveVisitors(
  onUpdate: (activeCount: number, activeSessions: ActiveSessionRecord[]) => void
): Unsubscribe {
  const sessionsCol = collection(db, 'active_sessions');

  const unsubscribe = onSnapshot(sessionsCol, (snapshot) => {
    const now = Date.now();
    const threshold = now - 45000; // 45 seconds timeout for active reader presence

    const liveList: ActiveSessionRecord[] = [];
    const staleDocs: string[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as ActiveSessionRecord;
      if (data.lastActive && data.lastActive >= threshold) {
        liveList.push(data);
      } else {
        staleDocs.push(docSnap.id);
      }
    });

    // Asynchronously prune stale sessions
    if (staleDocs.length > 0) {
      staleDocs.forEach(id => {
        deleteDoc(doc(db, 'active_sessions', id)).catch(() => {});
      });
    }

    onUpdate(liveList.length, liveList);
  }, (error) => {
    console.warn('Live active session subscription error:', error);
    onUpdate(0, []);
  });

  return unsubscribe;
}
