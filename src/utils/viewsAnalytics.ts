import { db } from '../firebase';
import { 
  collection, 
  getDocs
} from 'firebase/firestore';
import { Article, ViewLog } from '../types';
import { detectDeviceType, detectBrowser, trackPageView } from './analyticsTracker';

export const logArticleReadEvent = async (
  article: Article,
  _readDurationSecs?: number,
  _scrollDepth?: number
) => {
  return trackPageView('article', article);
};

export interface ExtendedViewLog extends ViewLog {
  id?: string;
  articleId: string;
  articleTitle: string;
  category: string;
  timestamp: number;
  readDurationSeconds?: number;
  scrollDepthPercent?: number;
  authorId?: string;
  authorEmail?: string;
  visitorId?: string;
  sessionId?: string;
  isReturning?: boolean;
  userAgent?: string;
  referrer?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
}

export interface DailyReadershipTrend {
  dateKey: string;       // YYYY-MM-DD
  label: string;         // 'Mon 14', 'Feb 20'
  viewCount: number;
  readMinutes: number;
}

export interface ArticleLogAnalytics {
  articleId: string;
  title: string;
  category: string;
  readTimeEstimateStr: string;
  estimatedMinutes: number;
  loggedViews: number;
  uniqueReaders: number;
  totalReadMinutes: number;
  avgReadMinutes: number;
  avgReadDurationSeconds: number;
  avgScrollDepthPercent: number;
  lastViewedAt: number | null;
  topReferrers: Array<{ source: string; count: number }>;
}

export interface ContributorViewsAnalytics {
  totalLoggedViews: number;
  uniqueVisitorsCount: number;
  returningVisitorsCount: number;
  totalReadTimeMinutes: number;
  totalReadHours: number;
  avgReadDurationMinutes: number;
  avgReadDurationSeconds: number;
  avgScrollDepthPercent: number;
  dailyTrends7D: DailyReadershipTrend[];
  dailyTrends14D: DailyReadershipTrend[];
  dailyTrends30D: DailyReadershipTrend[];
  perArticleAnalytics: Record<string, ArticleLogAnalytics>;
  referrersList: Array<{ source: string; count: number; percentage: number }>;
  browserBreakdown: Array<{ browser: string; count: number; percentage: number }>;
  hourlyDistribution: Array<{ hour: number; label: string; count: number }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
    desktopPercent: number;
    mobilePercent: number;
    tabletPercent: number;
  };
  recentLogs: ExtendedViewLog[];
  lastUpdated: number;
  isLiveConnection: boolean;
  hasData: boolean;
}

/**
 * Extract reading duration in minutes from article readTime string or text length
 */
export function extractArticleMinutes(readTimeStr?: string, content?: string): number {
  if (readTimeStr) {
    const match = readTimeStr.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  if (content) {
    const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(wordCount / 200));
  }
  return 5;
}

/**
 * Parse referrer into clean human-readable source category
 */
export function normalizeReferrer(ref?: string): string {
  if (!ref || ref === '' || ref === 'direct' || ref.includes('localhost') || ref.includes('theoligarchy')) {
    return 'Direct Access';
  }
  const r = ref.toLowerCase();
  if (r.includes('google') || r.includes('scholar') || r.includes('bing') || r.includes('duckduckgo')) {
    return 'Search Engines (Google/Scholar)';
  }
  if (r.includes('twitter') || r.includes('t.co') || r.includes('x.com')) {
    return 'X (Twitter)';
  }
  if (r.includes('linkedin')) {
    return 'LinkedIn';
  }
  if (r.includes('facebook') || r.includes('fb')) {
    return 'Facebook';
  }
  if (r.includes('reddit')) {
    return 'Reddit';
  }
  if (r.includes('substack')) {
    return 'Substack';
  }
  if (r.includes('doi') || r.includes('crossref') || r.includes('zenodo') || r.includes('researchgate') || r.includes('ssrn')) {
    return 'DOI & Academic Cross-Ref';
  }
  return 'External Referral';
}

/**
 * Fetch and aggregate views_log collection for a specific contributor's articles or all articles
 * STRICT ZERO-FABRICATION: If 0 logs exist, all counts are 0 with no synthetic fallbacks.
 */
export async function fetchContributorViewsLogAnalytics(
  authorArticles: Article[],
  contributorId?: string,
  contributorEmail?: string
): Promise<ContributorViewsAnalytics> {
  const articleMap = new Map<string, Article>();
  const authorArticleIds = new Set<string>();

  authorArticles.forEach(art => {
    articleMap.set(art.id, art);
    authorArticleIds.add(art.id);
  });

  const rawLogs: ExtendedViewLog[] = [];
  let isLive = true;

  try {
    const viewsLogRef = collection(db, 'views_log');
    const snapshot = await getDocs(viewsLogRef);

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Partial<ExtendedViewLog>;
      const logItem: ExtendedViewLog = {
        id: docSnap.id,
        articleId: data.articleId || '',
        articleTitle: data.articleTitle || '',
        category: data.category || 'general',
        timestamp: Number(data.timestamp) || Date.now(),
        readDurationSeconds: typeof data.readDurationSeconds === 'number' ? data.readDurationSeconds : 0,
        scrollDepthPercent: typeof data.scrollDepthPercent === 'number' ? data.scrollDepthPercent : 0,
        authorId: data.authorId,
        authorEmail: data.authorEmail,
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        isReturning: Boolean(data.isReturning),
        userAgent: data.userAgent,
        referrer: data.referrer,
        deviceType: data.deviceType || detectDeviceType(data.userAgent),
        browser: data.browser || detectBrowser(data.userAgent)
      };

      // Filter to author's articles if specified
      if (authorArticleIds.size > 0) {
        const matchesArticle = authorArticleIds.has(logItem.articleId);
        const matchesAuthor = (contributorId && logItem.authorId === contributorId) ||
                              (contributorEmail && logItem.authorEmail?.toLowerCase() === contributorEmail.toLowerCase());

        if (matchesArticle || matchesAuthor) {
          rawLogs.push(logItem);
        }
      } else {
        rawLogs.push(logItem);
      }
    });
  } catch (err) {
    console.warn('Could not query views_log from Firestore:', err);
    isLive = false;
  }

  const now = Date.now();
  const dayMs = 86400000;

  // Sort logs chronologically descending
  rawLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // 1. Per Article Aggregates
  const perArticleAnalytics: Record<string, ArticleLogAnalytics> = {};
  
  authorArticles.forEach(art => {
    const estMins = extractArticleMinutes(art.readTime, art.content);
    perArticleAnalytics[art.id] = {
      articleId: art.id,
      title: art.title,
      category: art.category || 'general',
      readTimeEstimateStr: art.readTime || `${estMins} min read`,
      estimatedMinutes: estMins,
      loggedViews: 0,
      uniqueReaders: 0,
      totalReadMinutes: 0,
      avgReadMinutes: 0,
      avgReadDurationSeconds: 0,
      avgScrollDepthPercent: 0,
      lastViewedAt: null,
      topReferrers: []
    };
  });

  const refCountsOverall: Record<string, number> = {};
  const browserCountsOverall: Record<string, number> = {};
  const hourCounts: number[] = new Array(24).fill(0);
  let desktopCount = 0;
  let mobileCount = 0;
  let tabletCount = 0;

  const articleReferrerCounts: Record<string, Record<string, number>> = {};
  const articleVisitors: Record<string, Set<string>> = {};
  const articleScrollDepths: Record<string, number[]> = {};
  const articleReadDurations: Record<string, number[]> = {};
  const allUniqueVisitors = new Set<string>();
  let returningCount = 0;

  rawLogs.forEach(log => {
    const readSeconds = log.readDurationSeconds || 0;
    const readMins = readSeconds / 60;

    if (log.visitorId) {
      allUniqueVisitors.add(log.visitorId);
    }
    if (log.isReturning) {
      returningCount++;
    }

    // Update per article
    if (perArticleAnalytics[log.articleId]) {
      const artStats = perArticleAnalytics[log.articleId];
      artStats.loggedViews += 1;
      artStats.totalReadMinutes += readMins;
      
      if (!articleVisitors[log.articleId]) {
        articleVisitors[log.articleId] = new Set<string>();
      }
      if (log.visitorId) {
        articleVisitors[log.articleId].add(log.visitorId);
      }

      if (!articleScrollDepths[log.articleId]) {
        articleScrollDepths[log.articleId] = [];
      }
      if (typeof log.scrollDepthPercent === 'number' && log.scrollDepthPercent > 0) {
        articleScrollDepths[log.articleId].push(log.scrollDepthPercent);
      }

      if (!articleReadDurations[log.articleId]) {
        articleReadDurations[log.articleId] = [];
      }
      articleReadDurations[log.articleId].push(readSeconds);

      if (!artStats.lastViewedAt || log.timestamp > artStats.lastViewedAt) {
        artStats.lastViewedAt = log.timestamp;
      }

      if (!articleReferrerCounts[log.articleId]) {
        articleReferrerCounts[log.articleId] = {};
      }
      const normRef = normalizeReferrer(log.referrer);
      articleReferrerCounts[log.articleId][normRef] = (articleReferrerCounts[log.articleId][normRef] || 0) + 1;
    }

    // Overall Referrers
    const normSource = normalizeReferrer(log.referrer);
    refCountsOverall[normSource] = (refCountsOverall[normSource] || 0) + 1;

    // Overall Browsers
    const browserName = log.browser || detectBrowser(log.userAgent);
    browserCountsOverall[browserName] = (browserCountsOverall[browserName] || 0) + 1;

    // Hourly distribution
    const d = new Date(log.timestamp);
    const h = d.getHours();
    if (h >= 0 && h < 24) {
      hourCounts[h] += 1;
    }

    // Devices
    if (log.deviceType === 'desktop') desktopCount++;
    else if (log.deviceType === 'mobile') mobileCount++;
    else if (log.deviceType === 'tablet') tabletCount++;
    else desktopCount++;
  });

  // Calculate averages per article
  Object.values(perArticleAnalytics).forEach(stat => {
    const vSet = articleVisitors[stat.articleId];
    stat.uniqueReaders = vSet ? vSet.size : (stat.loggedViews > 0 ? stat.loggedViews : 0);

    const scrolls = articleScrollDepths[stat.articleId] || [];
    stat.avgScrollDepthPercent = scrolls.length > 0 
      ? Math.round(scrolls.reduce((a, b) => a + b, 0) / scrolls.length)
      : 0;

    const durations = articleReadDurations[stat.articleId] || [];
    const totalSecs = durations.reduce((a, b) => a + b, 0);
    stat.avgReadDurationSeconds = durations.length > 0 ? Math.round(totalSecs / durations.length) : 0;
    stat.avgReadMinutes = Number((stat.avgReadDurationSeconds / 60).toFixed(1));
    stat.totalReadMinutes = Number((totalSecs / 60).toFixed(1));

    const refMap = articleReferrerCounts[stat.articleId] || {};
    stat.topReferrers = Object.entries(refMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  // 2. Timeline Trends (7D, 14D, 30D)
  const buildTrendDays = (daysCount: number): DailyReadershipTrend[] => {
    const result: DailyReadershipTrend[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = new Date(now - (i * dayMs));
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const dayLabel = dayDate.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });

      let dayViews = 0;
      let dayReadSeconds = 0;

      rawLogs.forEach(log => {
        const logDate = new Date(log.timestamp);
        const logYMD = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
        if (logYMD === dateKey) {
          dayViews++;
          dayReadSeconds += (log.readDurationSeconds || 0);
        }
      });

      result.push({
        dateKey,
        label: dayLabel,
        viewCount: dayViews,
        readMinutes: Math.round(dayReadSeconds / 60)
      });
    }
    return result;
  };

  const dailyTrends7D = buildTrendDays(7);
  const dailyTrends14D = buildTrendDays(14);
  const dailyTrends30D = buildTrendDays(30);

  // Overall totals
  const totalLoggedViews = rawLogs.length;
  const uniqueVisitorsCount = allUniqueVisitors.size || (totalLoggedViews > 0 ? totalLoggedViews : 0);
  const totalReadTimeSeconds = rawLogs.reduce((sum, l) => sum + (l.readDurationSeconds || 0), 0);
  const totalReadTimeMinutes = Math.round(totalReadTimeSeconds / 60);
  const totalReadHours = Number((totalReadTimeMinutes / 60).toFixed(1));
  const avgReadDurationSeconds = totalLoggedViews > 0 ? Math.round(totalReadTimeSeconds / totalLoggedViews) : 0;
  const avgReadDurationMinutes = Number((avgReadDurationSeconds / 60).toFixed(1));

  const allScrolls = rawLogs.map(l => l.scrollDepthPercent || 0).filter(s => s > 0);
  const avgScrollDepthPercent = allScrolls.length > 0 
    ? Math.round(allScrolls.reduce((a, b) => a + b, 0) / allScrolls.length) 
    : 0;

  // Referrers List - ZERO FABRICATION (empty if no logs)
  const totalRefs = Object.values(refCountsOverall).reduce((a, b) => a + b, 0);
  const referrersList = totalRefs > 0
    ? Object.entries(refCountsOverall)
        .map(([source, count]) => ({
          source,
          count,
          percentage: Number(((count / totalRefs) * 100).toFixed(1))
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  // Browser Breakdown
  const totalBrowsers = Object.values(browserCountsOverall).reduce((a, b) => a + b, 0);
  const browserBreakdown = totalBrowsers > 0
    ? Object.entries(browserCountsOverall)
        .map(([browser, count]) => ({
          browser,
          count,
          percentage: Number(((count / totalBrowsers) * 100).toFixed(1))
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  // Hourly Distribution
  const hourlyDistribution = hourCounts.map((count, hour) => {
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
    return { hour, label: hourLabel, count };
  });

  const totalDevices = desktopCount + mobileCount + tabletCount;
  const deviceBreakdown = {
    desktop: desktopCount,
    mobile: mobileCount,
    tablet: tabletCount,
    desktopPercent: totalDevices > 0 ? Math.round((desktopCount / totalDevices) * 100) : 0,
    mobilePercent: totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0,
    tabletPercent: totalDevices > 0 ? Math.round((tabletCount / totalDevices) * 100) : 0
  };

  return {
    totalLoggedViews,
    uniqueVisitorsCount,
    returningVisitorsCount: returningCount,
    totalReadTimeMinutes,
    totalReadHours,
    avgReadDurationMinutes,
    avgReadDurationSeconds,
    avgScrollDepthPercent,
    dailyTrends7D,
    dailyTrends14D,
    dailyTrends30D,
    perArticleAnalytics,
    referrersList,
    browserBreakdown,
    hourlyDistribution,
    deviceBreakdown,
    recentLogs: rawLogs.slice(0, 20),
    lastUpdated: now,
    isLiveConnection: isLive,
    hasData: totalLoggedViews > 0
  };
}
