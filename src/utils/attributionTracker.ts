import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  Article, 
  ViewLog, 
  ConversionEvent, 
  SignupLocation, 
  SubscriptionStatus,
  ArticleAttributionBreakdown 
} from '../types';
import { sanitizeFirestoreData } from './firestoreSanitizer';

// Local storage key for cross-session article journey tracking
const JOURNEY_STORAGE_KEY = 'tol_article_journey';
const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface JourneyStep {
  articleId: string;
  articleTitle: string;
  category?: string;
  timestamp: number;
}

/**
 * Record an article visit into the local journey history (up to 7-day retention)
 * This works alongside Firestore views_log to ensure fast, resilient attribution.
 */
export function recordArticleJourneyStep(articleId: string, articleTitle: string, category?: string): void {
  if (typeof window === 'undefined' || !articleId || articleId.startsWith('page-')) return;

  try {
    const now = Date.now();
    const windowCutoff = now - (DEFAULT_ATTRIBUTION_WINDOW_DAYS * MS_PER_DAY);
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    let steps: JourneyStep[] = raw ? JSON.parse(raw) : [];

    // Filter out steps older than the 7-day attribution window
    steps = steps.filter(s => s.timestamp >= windowCutoff);

    // Prevent immediate consecutive duplicate entries within 45 seconds
    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.articleId === articleId && (now - lastStep.timestamp) < 45000) {
      return;
    }

    steps.push({
      articleId,
      articleTitle,
      category,
      timestamp: now
    });

    // Cap at 100 most recent article steps to prevent storage overflow
    if (steps.length > 100) {
      steps = steps.slice(steps.length - 100);
    }

    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(steps));
  } catch (err) {
    console.warn('Could not record local article journey step:', err);
  }
}

/**
 * Get recent article journey steps from localStorage within the given attribution window
 */
export function getLocalArticleJourney(windowDays: number = DEFAULT_ATTRIBUTION_WINDOW_DAYS): JourneyStep[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return [];
    const steps: JourneyStep[] = JSON.parse(raw);
    const cutoff = Date.now() - (windowDays * MS_PER_DAY);
    return steps.filter(s => s.timestamp >= cutoff);
  } catch {
    return [];
  }
}

/**
 * Resolve the First-Touch, Last-Touch, and Direct Conversion articles
 * for a visitor subscribing to the newsletter within the 7-day window.
 */
export async function resolveSubscriberAttribution(
  visitorId: string,
  currentArticle?: Article | null,
  signupLocation: SignupLocation = 'homepage',
  windowDays: number = DEFAULT_ATTRIBUTION_WINDOW_DAYS
): Promise<{
  firstTouchArticleId: string | null;
  firstTouchArticleTitle: string | null;
  lastTouchArticleId: string | null;
  lastTouchArticleTitle: string | null;
  conversionArticleId: string | null;
  conversionArticleTitle: string | null;
}> {
  const now = Date.now();
  const windowCutoff = now - (windowDays * MS_PER_DAY);

  // 1. Check local journey steps
  const localSteps = getLocalArticleJourney(windowDays);

  // 2. Query Firestore views_log for this visitor in the 7-day window
  const firestoreArticles: Array<{ articleId: string; articleTitle: string; timestamp: number }> = [];
  if (visitorId) {
    try {
      const viewsCol = collection(db, 'views_log');
      const q = query(
        viewsCol,
        where('visitorId', '==', visitorId),
        where('timestamp', '>=', windowCutoff),
        orderBy('timestamp', 'asc'),
        limit(50)
      );
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.articleId && !data.articleId.startsWith('page-')) {
          firestoreArticles.push({
            articleId: data.articleId,
            articleTitle: data.articleTitle || 'Untitled Study',
            timestamp: data.timestamp || 0
          });
        }
      });
    } catch {
      // Fall back safely to local storage journey if offline or index building
    }
  }

  // Combine and sort chronologically by timestamp
  const combinedStepsMap = new Map<string, { articleId: string; articleTitle: string; timestamp: number }>();
  
  // Add local steps
  localSteps.forEach(s => {
    combinedStepsMap.set(`${s.articleId}_${s.timestamp}`, s);
  });
  
  // Add firestore steps
  firestoreArticles.forEach(s => {
    combinedStepsMap.set(`${s.articleId}_${s.timestamp}`, s);
  });

  const sortedJourney = Array.from(combinedStepsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // 3. Resolve Conversion Article
  let conversionArticleId: string | null = null;
  let conversionArticleTitle: string | null = null;

  if (signupLocation === 'in-article' && currentArticle?.id) {
    conversionArticleId = currentArticle.id;
    conversionArticleTitle = currentArticle.title;
  } else if (currentArticle?.id && signupLocation !== 'footer' && signupLocation !== 'homepage') {
    conversionArticleId = currentArticle.id;
    conversionArticleTitle = currentArticle.title;
  }

  // If currently on an article and not yet logged, append currentArticle as active touchpoint
  if (currentArticle?.id && (!sortedJourney.length || sortedJourney[sortedJourney.length - 1].articleId !== currentArticle.id)) {
    sortedJourney.push({
      articleId: currentArticle.id,
      articleTitle: currentArticle.title,
      timestamp: now
    });
  }

  // 4. Resolve First-Touch Article
  let firstTouchArticleId: string | null = null;
  let firstTouchArticleTitle: string | null = null;
  if (sortedJourney.length > 0) {
    firstTouchArticleId = sortedJourney[0].articleId;
    firstTouchArticleTitle = sortedJourney[0].articleTitle;
  }

  // 5. Resolve Last-Touch Article
  let lastTouchArticleId: string | null = null;
  let lastTouchArticleTitle: string | null = null;
  if (sortedJourney.length > 0) {
    const lastStep = sortedJourney[sortedJourney.length - 1];
    lastTouchArticleId = lastStep.articleId;
    lastTouchArticleTitle = lastStep.articleTitle;
  }

  return {
    firstTouchArticleId,
    firstTouchArticleTitle,
    lastTouchArticleId,
    lastTouchArticleTitle,
    conversionArticleId,
    conversionArticleTitle
  };
}

/**
 * Record a privacy-safe newsletter conversion event in Firestore
 * Strictly Zero-PII: No email address, name, or raw IP address is recorded.
 */
export async function trackNewsletterConversion(params: {
  visitorId: string;
  sessionId: string;
  signupLocation: SignupLocation;
  currentArticle?: Article | null;
  referrer?: string;
  status?: SubscriptionStatus;
  attributionWindowDays?: number;
}): Promise<ConversionEvent | null> {
  if (typeof window === 'undefined') return null;

  const windowDays = params.attributionWindowDays || DEFAULT_ATTRIBUTION_WINDOW_DAYS;
  const now = Date.now();

  try {
    const attribution = await resolveSubscriberAttribution(
      params.visitorId,
      params.currentArticle,
      params.signupLocation,
      windowDays
    );

    const ref = params.referrer || 
      (typeof document !== 'undefined' && document.referrer ? document.referrer : 'direct');

    const eventPayload: ConversionEvent = {
      eventType: 'newsletter_signup',
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      firstTouchArticleId: attribution.firstTouchArticleId,
      firstTouchArticleTitle: attribution.firstTouchArticleTitle,
      lastTouchArticleId: attribution.lastTouchArticleId,
      lastTouchArticleTitle: attribution.lastTouchArticleTitle,
      conversionArticleId: attribution.conversionArticleId,
      conversionArticleTitle: attribution.conversionArticleTitle,
      signupLocation: params.signupLocation,
      referrer: ref,
      timestamp: now,
      attributionWindowDays: windowDays,
      subscriptionStatus: params.status || 'confirmed'
    };

    const colRef = collection(db, 'conversion_events');
    const docRef = await addDoc(colRef, sanitizeFirestoreData(eventPayload));

    return {
      ...eventPayload,
      id: docRef.id
    };
  } catch (err) {
    console.warn('Could not record conversion attribution event:', err);
    return null;
  }
}

/**
 * Aggregated analytics metrics derived from Conversion Events
 */
export interface AttributionAnalyticsSummary {
  totalSignups: number;
  directArticleSignups: number;
  assistedSignups: number;
  unattributedSignups: number;
  locationBreakdown: Record<SignupLocation, number>;
  topFirstTouchArticles: ArticleAttributionBreakdown[];
  topLastTouchArticles: ArticleAttributionBreakdown[];
  topDirectConversionArticles: ArticleAttributionBreakdown[];
  allAttributedArticles: ArticleAttributionBreakdown[];
  recentEvents: ConversionEvent[];
  overallConversionRatePer1kViews: number;
  overallConversionRatePer1kReads: number;
}

/**
 * Computes multi-model conversion attribution metrics across all articles and views
 */
export function computeAttributionMetrics(
  events: ConversionEvent[],
  allArticles: Article[],
  viewsLogs: ViewLog[] = []
): AttributionAnalyticsSummary {
  const totalSignups = events.length;

  let directArticleSignups = 0;
  let assistedSignups = 0;
  let unattributedSignups = 0;

  const locationBreakdown: Record<SignupLocation, number> = {
    'in-article': 0,
    'homepage': 0,
    'footer': 0,
    'drawer': 0,
    'modal': 0,
    'unknown': 0
  };

  // Build views and deep reads map by article ID
  const viewsByArticle: Record<string, number> = {};
  const deepReadsByArticle: Record<string, number> = {};

  viewsLogs.forEach(v => {
    if (v.articleId && !v.articleId.startsWith('page-')) {
      viewsByArticle[v.articleId] = (viewsByArticle[v.articleId] || 0) + 1;
      const activeSec = typeof v.activeReadingSeconds === 'number' ? v.activeReadingSeconds : (v.readDurationSeconds || 0);
      const scroll = typeof v.maxScrollDepth === 'number' ? v.maxScrollDepth : (v.scrollDepthPercent || 0);
      if (activeSec >= 180 && scroll >= 75) {
        deepReadsByArticle[v.articleId] = (deepReadsByArticle[v.articleId] || 0) + 1;
      }
    }
  });

  // Track counts per article
  const breakdownMap: Record<string, {
    articleId: string;
    articleTitle: string;
    category: string;
    firstTouchCount: number;
    lastTouchCount: number;
    directConversionCount: number;
    touchedVisitorIds: Set<string>;
  }> = {};

  // Initialize with all known articles
  allArticles.forEach(a => {
    breakdownMap[a.id] = {
      articleId: a.id,
      articleTitle: a.title,
      category: a.category || 'general',
      firstTouchCount: 0,
      lastTouchCount: 0,
      directConversionCount: 0,
      touchedVisitorIds: new Set()
    };
  });

  events.forEach(ev => {
    // Location breakdown
    const loc = ev.signupLocation || 'unknown';
    if (loc in locationBreakdown) {
      locationBreakdown[loc]++;
    } else {
      locationBreakdown['unknown']++;
    }

    const hasDirect = Boolean(ev.conversionArticleId);
    const hasAssisted = Boolean(ev.firstTouchArticleId || ev.lastTouchArticleId);

    if (hasDirect) {
      directArticleSignups++;
    } else if (hasAssisted) {
      assistedSignups++;
    } else {
      unattributedSignups++;
    }

    // First touch credit
    if (ev.firstTouchArticleId) {
      if (!breakdownMap[ev.firstTouchArticleId]) {
        breakdownMap[ev.firstTouchArticleId] = {
          articleId: ev.firstTouchArticleId,
          articleTitle: ev.firstTouchArticleTitle || ev.firstTouchArticleId,
          category: 'general',
          firstTouchCount: 0,
          lastTouchCount: 0,
          directConversionCount: 0,
          touchedVisitorIds: new Set()
        };
      }
      breakdownMap[ev.firstTouchArticleId].firstTouchCount++;
      if (ev.visitorId) breakdownMap[ev.firstTouchArticleId].touchedVisitorIds.add(ev.visitorId);
    }

    // Last touch credit
    if (ev.lastTouchArticleId) {
      if (!breakdownMap[ev.lastTouchArticleId]) {
        breakdownMap[ev.lastTouchArticleId] = {
          articleId: ev.lastTouchArticleId,
          articleTitle: ev.lastTouchArticleTitle || ev.lastTouchArticleId,
          category: 'general',
          firstTouchCount: 0,
          lastTouchCount: 0,
          directConversionCount: 0,
          touchedVisitorIds: new Set()
        };
      }
      breakdownMap[ev.lastTouchArticleId].lastTouchCount++;
      if (ev.visitorId) breakdownMap[ev.lastTouchArticleId].touchedVisitorIds.add(ev.visitorId);
    }

    // Direct conversion credit
    if (ev.conversionArticleId) {
      if (!breakdownMap[ev.conversionArticleId]) {
        breakdownMap[ev.conversionArticleId] = {
          articleId: ev.conversionArticleId,
          articleTitle: ev.conversionArticleTitle || ev.conversionArticleId,
          category: 'general',
          firstTouchCount: 0,
          lastTouchCount: 0,
          directConversionCount: 0,
          touchedVisitorIds: new Set()
        };
      }
      breakdownMap[ev.conversionArticleId].directConversionCount++;
      if (ev.visitorId) breakdownMap[ev.conversionArticleId].touchedVisitorIds.add(ev.visitorId);
    }
  });

  // Calculate rates per article
  const allAttributedArticles: ArticleAttributionBreakdown[] = Object.values(breakdownMap).map(b => {
    const totalViews = viewsByArticle[b.articleId] || 0;
    const totalDeepReads = deepReadsByArticle[b.articleId] || 0;
    const totalTouchpoints = b.touchedVisitorIds.size || (b.firstTouchCount + b.lastTouchCount + b.directConversionCount);

    const conversionRatePerThousandViews = totalViews > 0 
      ? Math.round((b.directConversionCount / totalViews) * 1000 * 10) / 10 
      : 0;

    const conversionRatePerThousandReads = totalDeepReads > 0 
      ? Math.round((b.directConversionCount / totalDeepReads) * 1000 * 10) / 10 
      : 0;

    return {
      articleId: b.articleId,
      articleTitle: b.articleTitle,
      category: b.category,
      firstTouchCount: b.firstTouchCount,
      lastTouchCount: b.lastTouchCount,
      directConversionCount: b.directConversionCount,
      totalTouchpoints,
      totalViews,
      totalDeepReads,
      conversionRatePerThousandViews,
      conversionRatePerThousandReads
    };
  });

  // Sort lists
  const topFirstTouchArticles = [...allAttributedArticles]
    .filter(a => a.firstTouchCount > 0)
    .sort((a, b) => b.firstTouchCount - a.firstTouchCount);

  const topLastTouchArticles = [...allAttributedArticles]
    .filter(a => a.lastTouchCount > 0)
    .sort((a, b) => b.lastTouchCount - a.lastTouchCount);

  const topDirectConversionArticles = [...allAttributedArticles]
    .filter(a => a.directConversionCount > 0)
    .sort((a, b) => b.directConversionCount - a.directConversionCount);

  const totalViewsAcrossArticles = Object.values(viewsByArticle).reduce((sum, v) => sum + v, 0);
  const totalDeepReadsAcrossArticles = Object.values(deepReadsByArticle).reduce((sum, r) => sum + r, 0);

  const overallConversionRatePer1kViews = totalViewsAcrossArticles > 0
    ? Math.round((directArticleSignups / totalViewsAcrossArticles) * 1000 * 10) / 10
    : 0;

  const overallConversionRatePer1kReads = totalDeepReadsAcrossArticles > 0
    ? Math.round((directArticleSignups / totalDeepReadsAcrossArticles) * 1000 * 10) / 10
    : 0;

  const recentEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return {
    totalSignups,
    directArticleSignups,
    assistedSignups,
    unattributedSignups,
    locationBreakdown,
    topFirstTouchArticles,
    topLastTouchArticles,
    topDirectConversionArticles,
    allAttributedArticles,
    recentEvents,
    overallConversionRatePer1kViews,
    overallConversionRatePer1kReads
  };
}
