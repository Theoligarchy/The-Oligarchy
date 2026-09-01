import { db } from '../firebase';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Article } from '../types';

// Storage keys
const VISITOR_ID_KEY = 'tol_visitor_id';
const LAST_VISIT_KEY = 'tol_last_visit_time';
const SESSION_ID_KEY = 'tol_session_id';

/**
 * Get or create a persistent anonymous visitor ID
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
}

let activeHeartbeatInterval: number | null = null;
let currentViewDocId: string | null = null;
let currentSessionStartTime: number = Date.now();
let maxScrollDepth: number = 0;

/**
 * Initialize page scroll tracking for the active view
 */
export function setupScrollTracker(onDepthChange?: (depth: number) => void) {
  if (typeof window === 'undefined') return () => {};

  maxScrollDepth = 0;

  const handleScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight > 0) {
      const currentDepth = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
      if (currentDepth > maxScrollDepth) {
        maxScrollDepth = currentDepth;
        if (onDepthChange) onDepthChange(maxScrollDepth);
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

/**
 * Log a genuine page or article view event to Firestore views_log
 */
export async function trackPageView(
  page: string,
  article?: Article | null
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const { visitorId, isReturning } = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const deviceType = detectDeviceType();
  const browser = detectBrowser();
  const now = Date.now();
  currentSessionStartTime = now;
  maxScrollDepth = 0;

  const viewData = {
    articleId: article ? article.id : `page-${page}`,
    articleTitle: article ? article.title : `Page: ${page.charAt(0).toUpperCase() + page.slice(1)}`,
    category: article?.category || 'general',
    timestamp: now,
    visitorId,
    sessionId,
    isReturning,
    deviceType,
    browser,
    userAgent: navigator.userAgent,
    referrer: document.referrer || 'direct',
    readDurationSeconds: 0,
    scrollDepthPercent: 0,
    authorId: article?.authorId || undefined,
    authorEmail: article?.createdByEmail || undefined
  };

  try {
    const colRef = collection(db, 'views_log');
    const docRef = await addDoc(colRef, viewData);
    currentViewDocId = docRef.id;

    // Start active reader heartbeat
    startActiveHeartbeat({
      sessionId,
      visitorId,
      page,
      articleId: article?.id,
      articleTitle: article?.title,
      startedAt: now,
      lastActive: now,
      deviceType,
      browser,
      referrer: document.referrer || 'direct'
    });

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

  const sendHeartbeat = async () => {
    // Only send heartbeat if document is visible
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - currentSessionStartTime) / 1000));
    
    try {
      // 1. Update active session doc
      const sessionDocRef = doc(db, 'active_sessions', session.sessionId);
      await setDoc(sessionDocRef, {
        ...session,
        lastActive: Date.now(),
        readDurationSeconds: elapsedSeconds,
        scrollDepthPercent: maxScrollDepth
      }, { merge: true });

      // 2. Incrementally update read duration on the view log doc
      if (currentViewDocId) {
        const viewDocRef = doc(db, 'views_log', currentViewDocId);
        await updateDoc(viewDocRef, {
          readDurationSeconds: elapsedSeconds,
          scrollDepthPercent: maxScrollDepth
        });
      }
    } catch {
      // Silent catch for network drops
    }
  };

  // Immediate first heartbeat
  sendHeartbeat();

  // Pulse every 20 seconds
  activeHeartbeatInterval = window.setInterval(sendHeartbeat, 20000);

  // Clean up session on window unload
  if (typeof window !== 'undefined') {
    const cleanupSession = () => {
      try {
        const sessionDocRef = doc(db, 'active_sessions', session.sessionId);
        deleteDoc(sessionDocRef).catch(() => {});
      } catch {}
    };

    window.addEventListener('beforeunload', cleanupSession, { once: true });
    window.addEventListener('pagehide', cleanupSession, { once: true });
  }
}

/**
 * End current active session cleanly (e.g. when navigating away)
 */
export function stopActiveHeartbeat() {
  if (activeHeartbeatInterval) {
    clearInterval(activeHeartbeatInterval);
    activeHeartbeatInterval = null;
  }

  const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (sessionId) {
    try {
      const sessionDocRef = doc(db, 'active_sessions', sessionId);
      deleteDoc(sessionDocRef).catch(() => {});
    } catch {}
  }
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
