import { ReaderClassification, ViewLog } from '../types';
export type { ReaderClassification };

/**
 * READER COMMITMENT CLASSIFICATION CONFIGURATION
 * 
 * Strict non-overlapping boundaries for research article readership:
 * 1. Bouncer / Skimmer: Active reading time < 45s OR max scroll depth < 25%
 * 2. Engaged Browser: Active reading time 45s–180s AND max scroll depth 25%–75% (and transitional states)
 * 3. Deep Reader / Estimated True Read: Active reading time >= 180s AND max scroll depth >= 75%
 */
export const CLASSIFICATION_THRESHOLDS = {
  BOUNCER_MAX_ACTIVE_SECONDS: 45,
  BOUNCER_MAX_SCROLL_PERCENT: 25,
  DEEP_MIN_ACTIVE_SECONDS: 180, // 3 minutes of confirmed active engagement
  DEEP_MIN_SCROLL_PERCENT: 75,
  COMPLETION_SCROLL_PERCENT: 90 // Reaching conclusion and peer references
} as const;

export const MILESTONE_LEVELS = [25, 50, 75, 90, 100] as const;

export interface ClassificationMeta {
  id: ReaderClassification;
  label: string;
  shortLabel: string;
  badgeText: string;
  description: string;
  color: string;
  textColor: string;
  badgeBg: string;
  borderColor: string;
}

export const CLASSIFICATION_META: Record<ReaderClassification, ClassificationMeta> = {
  bouncer_skimmer: {
    id: 'bouncer_skimmer',
    label: 'Bouncer / Skimmer',
    shortLabel: 'Bouncer',
    badgeText: 'Bouncer / Skimmer',
    description: 'Active reading time under 45 seconds OR maximum scroll depth below 25%',
    color: '#e11d48', // rose-600
    textColor: 'text-rose-400',
    badgeBg: 'bg-rose-950/40',
    borderColor: 'border-rose-900/40'
  },
  engaged_browser: {
    id: 'engaged_browser',
    label: 'Engaged Browser',
    shortLabel: 'Engaged',
    badgeText: 'Engaged Browser',
    description: 'Active reading time between 45s and 180s, scroll depth between 25% and 75%',
    color: '#f59e0b', // amber-500
    textColor: 'text-amber-400',
    badgeBg: 'bg-amber-950/40',
    borderColor: 'border-amber-900/40'
  },
  deep_reader: {
    id: 'deep_reader',
    label: 'Deep Reader / Estimated True Read',
    shortLabel: 'Deep Reader',
    badgeText: 'Estimated True Read',
    description: 'Active reading time of at least 180 seconds AND maximum scroll depth of at least 75%',
    color: '#10b981', // emerald-500
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/40',
    borderColor: 'border-emerald-900/40'
  }
};

/**
 * Determine the Reader Commitment Classification using strictly non-overlapping logic.
 * 
 * @param activeSeconds Number of seconds the tab was active, focused, and non-idle
 * @param maxScrollPercent Maximum scroll depth percentage reached within the article container
 * @returns 'deep_reader' | 'bouncer_skimmer' | 'engaged_browser' | null (if session has 0 telemetry data)
 */
export function classifyReaderSession(
  activeSeconds: number,
  maxScrollPercent: number
): ReaderClassification | null {
  // If session has no telemetry recorded at all, classify as insufficient data
  if ((!activeSeconds || activeSeconds <= 0) && (!maxScrollPercent || maxScrollPercent <= 0)) {
    return null;
  }

  const safeSeconds = Math.max(0, activeSeconds || 0);
  const safeScroll = Math.max(0, Math.min(100, maxScrollPercent || 0));

  // 1. Deep Reader / Estimated True Read:
  // Active reading time >= 180 seconds AND max scroll depth >= 75%
  if (
    safeSeconds >= CLASSIFICATION_THRESHOLDS.DEEP_MIN_ACTIVE_SECONDS &&
    safeScroll >= CLASSIFICATION_THRESHOLDS.DEEP_MIN_SCROLL_PERCENT
  ) {
    return 'deep_reader';
  }

  // 2. Bouncer / Skimmer:
  // Active reading time < 45 seconds OR max scroll depth < 25%
  if (
    safeSeconds < CLASSIFICATION_THRESHOLDS.BOUNCER_MAX_ACTIVE_SECONDS ||
    safeScroll < CLASSIFICATION_THRESHOLDS.BOUNCER_MAX_SCROLL_PERCENT
  ) {
    return 'bouncer_skimmer';
  }

  // 3. Engaged Browser:
  // Active reading time between 45s and 180s, max scroll depth between 25% and 75%
  // (and any visitor who exceeded bouncer thresholds but has not met both deep reader requirements)
  return 'engaged_browser';
}

/**
 * Check if a classification constitutes meaningful engagement (not a bounce/skim)
 */
export function isMeaningfulSession(classification: ReaderClassification | null): boolean {
  return classification === 'engaged_browser' || classification === 'deep_reader';
}

/**
 * Check if an article view qualifies as an article completion (reached conclusion >= 90%)
 */
export function isArticleCompleted(scrollPercent?: number): boolean {
  if (typeof scrollPercent !== 'number') return false;
  return scrollPercent >= CLASSIFICATION_THRESHOLDS.COMPLETION_SCROLL_PERCENT;
}

/**
 * Calculate the exact median of an array of numbers
 */
export function calculateMedian(numbers: number[]): number {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

/**
 * Format active reading duration into human-readable minutes and seconds
 */
export function formatActiveReadingTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Aggregated analytics for a single article or subset of view logs
 */
export interface ArticleCommitmentMetrics {
  articleId: string;
  articleTitle: string;
  category: string;
  totalViews: number;
  classifiableViews: number;
  
  // Counts
  bouncersCount: number;
  engagedCount: number;
  deepReadersCount: number;
  completedViewsCount: number; // reached >= 90% scroll
  meaningfulCount: number; // engaged + deep
  
  // Rates (percentages)
  bounceRate: number;
  engagedRate: number;
  deepReadRate: number;
  meaningfulRate: number;
  completionRate: number;
  
  // Time and scroll metrics
  avgActiveSeconds: number;
  medianActiveSeconds: number;
  avgScrollDepth: number;
  medianScrollDepth: number;

  // New vs returning
  newVisitorsCount: number;
  returningVisitorsCount: number;

  // Milestone breakdown
  milestones: {
    reached25: number;
    reached50: number;
    reached75: number;
    reached90: number;
    reached100: number;
  };

  // Integrity indicator
  hasSufficientData: boolean;
  dataStatusText: string;
}

/**
 * Compute commitment metrics from an array of ViewLog entries
 */
export function computeCommitmentMetrics(
  logs: ViewLog[],
  articleId?: string,
  articleTitle?: string,
  category?: string
): ArticleCommitmentMetrics {
  // Filter out non-article views (e.g. page-home) if calculating for article corpus
  const articleLogs = logs.filter(l => !l.articleId.startsWith('page-'));
  const totalViews = articleLogs.length;

  const activeTimes: number[] = [];
  const scrollDepths: number[] = [];
  
  let bouncers = 0;
  let engaged = 0;
  let deepReaders = 0;
  let completed = 0;
  let classifiable = 0;
  let newVisitors = 0;
  let returningVisitors = 0;

  const milestoneCounts = {
    reached25: 0,
    reached50: 0,
    reached75: 0,
    reached90: 0,
    reached100: 0
  };

  articleLogs.forEach(log => {
    const activeSec = typeof log.activeReadingSeconds === 'number' 
      ? log.activeReadingSeconds 
      : (log.readDurationSeconds || 0);
    const scroll = typeof log.maxScrollDepth === 'number'
      ? log.maxScrollDepth
      : (log.scrollDepthPercent || 0);

    if (activeSec > 0 || scroll > 0) {
      activeTimes.push(activeSec);
      scrollDepths.push(scroll);
    }

    if (log.isReturning) {
      returningVisitors++;
    } else {
      newVisitors++;
    }

    // Check milestones
    if (scroll >= 25) milestoneCounts.reached25++;
    if (scroll >= 50) milestoneCounts.reached50++;
    if (scroll >= 75) milestoneCounts.reached75++;
    if (scroll >= 90) milestoneCounts.reached90++;
    if (scroll >= 100) milestoneCounts.reached100++;

    if (scroll >= CLASSIFICATION_THRESHOLDS.COMPLETION_SCROLL_PERCENT) {
      completed++;
    }

    // Determine classification
    const classification = log.classification || classifyReaderSession(activeSec, scroll);
    if (classification) {
      classifiable++;
      if (classification === 'bouncer_skimmer') bouncers++;
      else if (classification === 'engaged_browser') engaged++;
      else if (classification === 'deep_reader') deepReaders++;
    }
  });

  const avgActiveSeconds = activeTimes.length > 0
    ? Math.round(activeTimes.reduce((a, b) => a + b, 0) / activeTimes.length)
    : 0;
  const medianActiveSeconds = calculateMedian(activeTimes);

  const avgScrollDepth = scrollDepths.length > 0
    ? Math.round(scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length)
    : 0;
  const medianScrollDepth = calculateMedian(scrollDepths);

  const meaningful = engaged + deepReaders;

  const baseCount = classifiable > 0 ? classifiable : (totalViews > 0 ? totalViews : 1);
  const totalBase = totalViews > 0 ? totalViews : 1;

  const bounceRate = totalViews > 0 ? Number(((bouncers / baseCount) * 100).toFixed(1)) : 0;
  const engagedRate = totalViews > 0 ? Number(((engaged / baseCount) * 100).toFixed(1)) : 0;
  const deepReadRate = totalViews > 0 ? Number(((deepReaders / baseCount) * 100).toFixed(1)) : 0;
  const meaningfulRate = totalViews > 0 ? Number(((meaningful / baseCount) * 100).toFixed(1)) : 0;
  const completionRate = totalViews > 0 ? Number(((completed / totalBase) * 100).toFixed(1)) : 0;

  let hasSufficientData = false;
  let dataStatusText = 'No data yet';

  if (totalViews === 0) {
    dataStatusText = 'No data yet';
  } else if (totalViews < 3) {
    dataStatusText = 'Not enough sessions';
  } else if (classifiable === 0) {
    dataStatusText = 'Insufficient data for classification';
  } else {
    hasSufficientData = true;
    dataStatusText = 'Sufficient data';
  }

  return {
    articleId: articleId || 'all_articles',
    articleTitle: articleTitle || 'All Articles Corpus',
    category: category || 'general',
    totalViews,
    classifiableViews: classifiable,
    bouncersCount: bouncers,
    engagedCount: engaged,
    deepReadersCount: deepReaders,
    completedViewsCount: completed,
    meaningfulCount: meaningful,
    bounceRate,
    engagedRate,
    deepReadRate,
    meaningfulRate,
    completionRate,
    avgActiveSeconds,
    medianActiveSeconds,
    avgScrollDepth,
    medianScrollDepth,
    newVisitorsCount: newVisitors,
    returningVisitorsCount: returningVisitors,
    milestones: milestoneCounts,
    hasSufficientData,
    dataStatusText
  };
}
