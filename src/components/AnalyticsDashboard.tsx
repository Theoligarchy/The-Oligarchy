import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Article, ViewLog } from '../types';
import { 
  TrendingUp, 
  Eye, 
  Users, 
  Calendar, 
  RefreshCw,
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  Activity,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Radio,
  Compass,
  Filter,
  BarChart3,
  UserCheck,
  Timer,
  BookOpen,
  Award,
  ShieldCheck,
  Info,
  Layers,
  ArrowUpDown,
  Search,
  CheckCircle,
  HelpCircle,
  X,
  ExternalLink,
  Target,
  Quote
} from 'lucide-react';
import AttributedSignupsSection from './AttributedSignupsSection';
import ResonantQuotesSection from './ResonantQuotesSection';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  subscribeToLiveActiveVisitors, 
  ActiveSessionRecord,
  detectDeviceType,
  detectBrowser
} from '../utils/analyticsTracker';
import { normalizeReferrer } from '../utils/viewsAnalytics';
import {
  ReaderClassification,
  classifyReaderSession,
  CLASSIFICATION_META,
  CLASSIFICATION_THRESHOLDS,
  computeCommitmentMetrics,
  formatActiveReadingTime,
  calculateMedian,
  ArticleCommitmentMetrics
} from '../utils/readerClassification';

interface AnalyticsDashboardProps {
  allArticles: Article[];
  subscribersCount: number;
}

type TimeRangeFilter = 'today' | '7d' | '30d' | 'all';
type ChartViewMode = 'commitment' | 'milestones' | 'volume' | 'domains';

export default function AnalyticsDashboard({ allArticles, subscribersCount }: AnalyticsDashboardProps) {
  const [logs, setLogs] = useState<ViewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [chartMode, setChartMode] = useState<ChartViewMode>('commitment');
  const [cleaningStatus, setCleaningStatus] = useState<'idle' | 'cleaning' | 'success'>('idle');
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');
  const [articleSortBy, setArticleSortBy] = useState<'views' | 'deep_rate' | 'active_time' | 'completion'>('views');
  const [dashboardTab, setDashboardTab] = useState<'all' | 'commitment' | 'attribution' | 'resonance'>('all');

  // Real-Time Active Readers Presence (zero fabrication)
  const [activeVisitorCount, setActiveVisitorCount] = useState<number>(0);
  const [liveSessions, setLiveSessions] = useState<ActiveSessionRecord[]>([]);

  // 1. Subscribe to Live Active Readers in real-time
  useEffect(() => {
    const unsubscribe = subscribeToLiveActiveVisitors((count, sessions) => {
      setActiveVisitorCount(count);
      setLiveSessions(sessions);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Load historical view logs from Firestore
  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const colRef = collection(db, 'views_log');
      let snap;
      try {
        const q = query(colRef, orderBy('timestamp', 'desc'));
        snap = await getDocs(q);
      } catch (orderErr) {
        console.warn("Falling back to un-ordered views_log query:", orderErr);
        snap = await getDocs(colRef);
      }
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ViewLog));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(list);
    } catch (e: any) {
      console.warn("Failed to load analytics view logs from database:", e);
      // Fallback gracefully without blocking the entire dashboard
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [allArticles]);

  // 3. Filter logs based on selected time range and dimensional filters
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    let result = logs;

    // Time window filter
    if (timeRange === 'today') {
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      result = result.filter(l => (l.timestamp || 0) >= oneDayAgo);
    } else if (timeRange === '7d') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      result = result.filter(l => (l.timestamp || 0) >= sevenDaysAgo);
    } else if (timeRange === '30d') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(l => (l.timestamp || 0) >= thirtyDaysAgo);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(l => l.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Specific article filter
    if (selectedArticleId !== 'all') {
      result = result.filter(l => l.articleId === selectedArticleId);
    }

    // Classification filter
    if (selectedClassification !== 'all') {
      result = result.filter(l => {
        const activeSec = typeof l.activeReadingSeconds === 'number' ? l.activeReadingSeconds : (l.readDurationSeconds || 0);
        const scroll = typeof l.maxScrollDepth === 'number' ? l.maxScrollDepth : (l.scrollDepthPercent || 0);
        const cls = l.classification || classifyReaderSession(activeSec, scroll);
        return cls === selectedClassification;
      });
    }

    return result;
  }, [logs, timeRange, selectedCategory, selectedArticleId, selectedClassification]);

  // Total accumulated views across all articles in the scholarly corpus (from Firestore 'articles' collection)
  const totalArticleCorpusViews = useMemo(() => {
    return allArticles.reduce((sum, a) => sum + (a.views || 0), 0);
  }, [allArticles]);

  // 4. Overall Article Commitment Metrics (calculated strictly from authentic telemetry logs)
  const overallMetrics = useMemo(() => {
    const computed = computeCommitmentMetrics(filteredLogs);
    // If no telemetry session logs have been captured yet for this window,
    // preserve authentic cumulative views if available without fabricating ratios
    if (computed.totalViews === 0 && totalArticleCorpusViews > 0) {
      computed.totalViews = totalArticleCorpusViews;
    }
    return computed;
  }, [filteredLogs, totalArticleCorpusViews]);

  // Raw page view counts (including non-article pages like home or reading shelf)
  const totalRawImpressions = Math.max(filteredLogs.length, totalArticleCorpusViews);

  // Unique visitors in range based strictly on actual unique IDs recorded
  const uniqueVisitorsCount = useMemo(() => {
    const set = new Set<string>();
    filteredLogs.forEach(l => {
      if (l.visitorId) set.add(l.visitorId);
      else if (l.sessionId) set.add(l.sessionId);
      else if (l.id) set.add(l.id);
    });
    return set.size;
  }, [filteredLogs]);

  // 5. Per-Article Commitment Table Data
  const perArticleCommitmentData = useMemo(() => {
    const articleMap = new Map<string, Article>();
    allArticles.forEach(a => articleMap.set(a.id, a));

    // Group filtered logs by articleId
    const logsByArticle: Record<string, ViewLog[]> = {};
    filteredLogs.forEach(l => {
      if (l.articleId && !l.articleId.startsWith('page-')) {
        if (!logsByArticle[l.articleId]) {
          logsByArticle[l.articleId] = [];
        }
        logsByArticle[l.articleId].push(l);
      }
    });

    // Compute metrics for all published articles based strictly on authentic logs
    const results: ArticleCommitmentMetrics[] = [];

    allArticles.forEach(art => {
      const artLogs = logsByArticle[art.id] || [];
      const metrics = computeCommitmentMetrics(artLogs, art.id, art.title, art.category);
      // If telemetry logs for this article haven't been captured yet, show authentic recorded art.views
      if (metrics.totalViews === 0 && (art.views || 0) > 0) {
        metrics.totalViews = art.views || 0;
      }
      results.push(metrics);
    });

    // Filter by search query if present
    let filtered = results;
    if (articleSearchQuery.trim()) {
      const q = articleSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.articleTitle.toLowerCase().includes(q) || 
        m.category.toLowerCase().includes(q)
      );
    }

    // Sort
    return filtered.sort((a, b) => {
      if (articleSortBy === 'deep_rate') {
        return b.deepReadRate - a.deepReadRate;
      }
      if (articleSortBy === 'active_time') {
        return b.avgActiveSeconds - a.avgActiveSeconds;
      }
      if (articleSortBy === 'completion') {
        return b.completionRate - a.completionRate;
      }
      return b.totalViews - a.totalViews;
    });
  }, [allArticles, filteredLogs, articleSearchQuery, articleSortBy]);

  // 6. Reader Commitment Trends Over Time (Daily / Hourly Stacked Chart)
  const commitmentTrendsData = useMemo(() => {
    const now = Date.now();
    const isToday = timeRange === 'today';
    const daysCount = isToday ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30;

    if (isToday) {
      // 24-hour breakdown
      const hoursMap: Record<number, {
        label: string;
        hour: number;
        bouncers: number;
        engaged: number;
        deepReaders: number;
        totalViews: number;
      }> = {};

      for (let h = 0; h < 24; h++) {
        hoursMap[h] = {
          label: `${h.toString().padStart(2, '0')}:00`,
          hour: h,
          bouncers: 0,
          engaged: 0,
          deepReaders: 0,
          totalViews: 0
        };
      }

      filteredLogs.forEach(l => {
        if (l.articleId?.startsWith('page-')) return;
        const d = new Date(l.timestamp);
        const h = d.getHours();
        if (hoursMap[h]) {
          hoursMap[h].totalViews++;
          const activeSec = typeof l.activeReadingSeconds === 'number' ? l.activeReadingSeconds : (l.readDurationSeconds || 0);
          const scroll = typeof l.maxScrollDepth === 'number' ? l.maxScrollDepth : (l.scrollDepthPercent || 0);
          const cls = l.classification || classifyReaderSession(activeSec, scroll);
          if (cls === 'deep_reader') hoursMap[h].deepReaders++;
          else if (cls === 'engaged_browser') hoursMap[h].engaged++;
          else if (cls === 'bouncer_skimmer') hoursMap[h].bouncers++;
        }
      });

      return Object.values(hoursMap);
    }

    // Daily breakdown for 7d, 30d, all
    const dataMap: Record<string, {
      date: string;
      timestamp: number;
      bouncers: number;
      engaged: number;
      deepReaders: number;
      totalViews: number;
    }> = {};

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dataMap[key] = {
        date: dateStr,
        timestamp: d.setHours(0, 0, 0, 0),
        bouncers: 0,
        engaged: 0,
        deepReaders: 0,
        totalViews: 0
      };
    }

    filteredLogs.forEach(log => {
      if (log.articleId?.startsWith('page-')) return;
      const logDate = new Date(log.timestamp);
      const key = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      if (dataMap[key]) {
        dataMap[key].totalViews++;
        const activeSec = typeof log.activeReadingSeconds === 'number' ? log.activeReadingSeconds : (log.readDurationSeconds || 0);
        const scroll = typeof log.maxScrollDepth === 'number' ? log.maxScrollDepth : (log.scrollDepthPercent || 0);
        const cls = log.classification || classifyReaderSession(activeSec, scroll);
        if (cls === 'deep_reader') dataMap[key].deepReaders++;
        else if (cls === 'engaged_browser') dataMap[key].engaged++;
        else if (cls === 'bouncer_skimmer') dataMap[key].bouncers++;
      }
    });

    return Object.values(dataMap).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredLogs, timeRange]);

  // 7. Milestone Funnel Data
  const milestoneFunnelData = useMemo(() => {
    const m = overallMetrics.milestones;
    const base = overallMetrics.totalViews > 0 ? overallMetrics.totalViews : 1;
    return [
      { name: '25% Scroll', count: m.reached25, pct: Math.round((m.reached25 / base) * 100), desc: 'Introductory Argument' },
      { name: '50% Scroll', count: m.reached50, pct: Math.round((m.reached50 / base) * 100), desc: 'Core Methodology & Evidence' },
      { name: '75% Scroll', count: m.reached75, pct: Math.round((m.reached75 / base) * 100), desc: 'Deep Reader Threshold' },
      { name: '90% Scroll', count: m.reached90, pct: Math.round((m.reached90 / base) * 100), desc: 'Full Completion / References' },
      { name: '100% Scroll', count: m.reached100, pct: Math.round((m.reached100 / base) * 100), desc: 'End of Manuscript' }
    ];
  }, [overallMetrics]);

  // 8. Academic Domain Breakdown
  const categoryData = useMemo(() => {
    const cats: Record<string, { views: number; deepReaders: number }> = {};
    filteredLogs.forEach(l => {
      if (l.category) {
        const cat = l.category.toLowerCase();
        if (!cats[cat]) cats[cat] = { views: 0, deepReaders: 0 };
        cats[cat].views++;
        const activeSec = typeof l.activeReadingSeconds === 'number' ? l.activeReadingSeconds : (l.readDurationSeconds || 0);
        const scroll = typeof l.maxScrollDepth === 'number' ? l.maxScrollDepth : (l.scrollDepthPercent || 0);
        const cls = l.classification || classifyReaderSession(activeSec, scroll);
        if (cls === 'deep_reader') cats[cat].deepReaders++;
      }
    });

    return Object.keys(cats).map(name => ({
      name: name.toUpperCase(),
      views: cats[name].views,
      deepReaders: cats[name].deepReaders
    }));
  }, [filteredLogs]);

  // 9. Referrers Distribution
  const referrerDistribution = useMemo(() => {
    if (filteredLogs.length === 0) return [];
    const counts: Record<string, number> = {};
    filteredLogs.forEach(l => {
      const src = normalizeReferrer(l.referrer);
      counts[src] = (counts[src] || 0) + 1;
    });

    const total = filteredLogs.length;
    return Object.keys(counts)
      .map(key => ({
        name: key,
        count: counts[key],
        pct: total > 0 ? Number(((counts[key] / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  // 10. Device Distribution
  const deviceDistribution = useMemo(() => {
    if (filteredLogs.length === 0) return [];
    const counts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    filteredLogs.forEach(l => {
      const dev = l.deviceType ? (l.deviceType.charAt(0).toUpperCase() + l.deviceType.slice(1)) : (detectDeviceType(l.userAgent).charAt(0).toUpperCase() + detectDeviceType(l.userAgent).slice(1));
      if (counts[dev] !== undefined) counts[dev]++;
      else counts['Desktop']++;
    });

    const total = filteredLogs.length;
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key],
      percentage: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
      icon: key === 'Mobile' ? <Smartphone size={13} className="text-blood-light" /> : key === 'Tablet' ? <Tablet size={13} className="text-paper/60" /> : <Laptop size={13} className="text-paper/80" />
    })).filter(d => d.count > 0);
  }, [filteredLogs]);

  // 11. Clear / Reset logs action
  const handleClearAllLogs = async () => {
    if (!window.confirm("Are you sure you want to delete all historical analytics logs? This will reset all telemetry records.")) {
      return;
    }

    setCleaningStatus('cleaning');
    try {
      const colRef = collection(db, 'views_log');
      const snap = await getDocs(colRef);
      const promises = snap.docs.map(d => deleteDoc(doc(db, 'views_log', d.id)));
      await Promise.all(promises);

      setCleaningStatus('success');
      setLogs([]);
      setTimeout(() => setCleaningStatus('idle'), 3000);
    } catch (e) {
      console.error("Failed to delete logs:", e);
      setCleaningStatus('idle');
    }
  };

  // Helper icons for devices
  const getDeviceIcon = (devType?: string) => {
    if (devType === 'mobile') return <Smartphone size={13} className="text-blood-light" />;
    if (devType === 'tablet') return <Tablet size={13} className="text-paper/60" />;
    return <Laptop size={13} className="text-paper/80" />;
  };

  if (error) {
    return (
      <div className="bg-navy border border-red-900/30 p-8 rounded-sm text-center flex flex-col items-center justify-center gap-4">
        <AlertCircle size={36} className="text-red-400" />
        <div>
          <h3 className="font-display text-lg font-bold text-paper">Analytics Temporarily Unavailable</h3>
          <p className="font-serif text-sm text-paper/60 mt-1 max-w-md">
            Unable to retrieve telemetry records from the database. Please verify your connection or retry.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="bg-blood text-paper px-4 py-2 text-xs font-sans uppercase tracking-wider rounded-xs cursor-pointer hover:bg-blood-light transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} /> Retry Telemetry Fetch
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 select-text">
      
      {/* 1. HEADER & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-paper/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-blood-light bg-blood/10 px-2 py-0.5 border border-blood/20 rounded-xs font-bold flex items-center gap-1.5">
              <Award size={11} /> Reader Commitment Classification Engine
            </span>
            {activeVisitorCount > 0 ? (
              <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-800/40 rounded-xs flex items-center gap-1.5 animate-pulse">
                <Radio size={10} className="text-emerald-400" /> {activeVisitorCount} Active Reader{activeVisitorCount === 1 ? '' : 's'} Now
              </span>
            ) : (
              <span className="font-mono text-[9px] text-paper/40 bg-midnight px-2 py-0.5 border border-paper/5 rounded-xs flex items-center gap-1.5">
                <Radio size={10} className="text-paper/30" /> 0 Live Active Now
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-bold text-paper tracking-tight mt-1.5 flex items-center gap-2">
            Readership Engagement & Telemetry
          </h2>
          <p className="font-serif text-xs text-paper/50 mt-0.5 max-w-2xl">
            Distinguishing raw page impressions from substantive academic engagement. Classifies readers into Bouncers, Engaged Browsers, and Deep Readers based on active visible attention and container scroll depth.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Methodology modal toggle */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="border border-paper/15 hover:border-paper/30 bg-midnight/60 hover:bg-midnight text-paper/80 px-3 py-1.5 text-xs font-sans rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Classification methodology and zero-PII privacy architecture"
          >
            <ShieldCheck size={13} className="text-paper/60" />
            <span>Methodology & Privacy</span>
          </button>

          {/* Time range selector */}
          <div className="flex items-center bg-midnight border border-paper/10 p-0.5 rounded-xs">
            {(['today', '7d', '30d', 'all'] as TimeRangeFilter[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer rounded-xs ${
                  timeRange === range
                    ? 'bg-blood text-paper font-bold shadow-xs'
                    : 'text-paper/40 hover:text-paper/80'
                }`}
              >
                {range === 'today' ? '24h' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={loadLogs}
            disabled={loading}
            className="border border-paper/15 hover:border-paper/30 bg-midnight text-paper/60 hover:text-paper p-1.5 rounded-xs transition-colors cursor-pointer"
            title="Refresh logs from Firestore"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blood-light" : ""} />
          </button>
        </div>
      </div>

      {/* MODULE NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-paper/10 pb-2">
        <button
          onClick={() => setDashboardTab('all')}
          className={`px-3 py-1.5 rounded-xs font-sans text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            dashboardTab === 'all'
              ? 'bg-paper/15 text-paper border border-paper/20 shadow-xs'
              : 'text-paper/50 hover:text-paper hover:bg-paper/5'
          }`}
        >
          <Activity size={13} />
          <span>Unified Telemetry</span>
        </button>
        <button
          onClick={() => setDashboardTab('commitment')}
          className={`px-3 py-1.5 rounded-xs font-sans text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            dashboardTab === 'commitment'
              ? 'bg-paper/15 text-paper border border-paper/20 shadow-xs'
              : 'text-paper/50 hover:text-paper hover:bg-paper/5'
          }`}
        >
          <Award size={13} className="text-blood-light" />
          <span>Reader Commitment</span>
        </button>
        <button
          onClick={() => setDashboardTab('attribution')}
          className={`px-3 py-1.5 rounded-xs font-sans text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            dashboardTab === 'attribution'
              ? 'bg-blood text-paper border border-blood font-bold shadow-xs'
              : 'text-paper/50 hover:text-paper hover:bg-paper/5'
          }`}
        >
          <Target size={13} className="text-emerald-400" />
          <span>Attributed Signups</span>
        </button>
        <button
          onClick={() => setDashboardTab('resonance')}
          className={`px-3 py-1.5 rounded-xs font-sans text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            dashboardTab === 'resonance'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-xs'
              : 'text-paper/50 hover:text-paper hover:bg-paper/5'
          }`}
        >
          <Quote size={13} className="text-amber-400" />
          <span>Resonant Quotes</span>
        </button>
      </div>

      {(dashboardTab === 'all' || dashboardTab === 'commitment') && (
        <>
          {/* 2. MULTI-DIMENSIONAL FILTERS ROW */}
          <div className="bg-midnight/70 border border-paper/10 p-3 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
            <Filter size={12} /> Filter Telemetry:
          </span>

          {/* Domain Category Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-paper/50 font-serif">Domain:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-navy border border-paper/15 text-paper px-2 py-1 rounded-xs font-sans text-xs focus:outline-none focus:border-blood"
            >
              <option value="all">All Disciplines</option>
              <option value="criminology">Criminology</option>
              <option value="psyche">Psyche & Pathologies</option>
              <option value="politics">Politics & Hegemony</option>
            </select>
          </div>

          {/* Specific Article Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-paper/50 font-serif">Investigation:</label>
            <select
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="bg-navy border border-paper/15 text-paper px-2 py-1 rounded-xs font-sans text-xs focus:outline-none focus:border-blood max-w-[200px] truncate"
            >
              <option value="all">All Articles ({allArticles.length})</option>
              {allArticles.map(art => (
                <option key={art.id} value={art.id}>
                  {art.title.length > 35 ? art.title.substring(0, 35) + '...' : art.title}
                </option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-paper/50 font-serif">Commitment:</label>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="bg-navy border border-paper/15 text-paper px-2 py-1 rounded-xs font-sans text-xs focus:outline-none focus:border-blood"
            >
              <option value="all">All Readers</option>
              <option value="deep_reader">Deep Readers (Estimated True Reads)</option>
              <option value="engaged_browser">Engaged Browsers</option>
              <option value="bouncer_skimmer">Bouncers / Skimmers</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Reset */}
        {(selectedCategory !== 'all' || selectedArticleId !== 'all' || selectedClassification !== 'all') && (
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedArticleId('all');
              setSelectedClassification('all');
            }}
            className="text-blood-light hover:text-paper font-sans text-[11px] underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 3. EXECUTIVE READER COMMITMENT KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Total Article Views */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold">
              Total Article Views
            </span>
            <div className="p-1.5 bg-midnight rounded-xs text-paper/60">
              <Eye size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-paper">
              {overallMetrics.totalViews.toLocaleString()}
            </div>
            <div className="font-serif text-xs text-paper/40 mt-0.5">
              {totalRawImpressions} raw events across platform
            </div>
          </div>
          <div className="pt-2 border-t border-paper/5 flex justify-between items-center text-[10px] font-mono text-paper/40">
            <span>Unique Readers:</span>
            <span className="text-paper/80 font-bold">{uniqueVisitorsCount}</span>
          </div>
        </div>

        {/* Card 2: Deep Readers / Estimated True Reads (PRIMARY REQUIREMENT) */}
        <div className="bg-navy border border-emerald-900/40 p-4 rounded-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
              <Award size={11} /> Deep Readers (Estimated True Read)
            </span>
            <div className="p-1.5 bg-emerald-950/50 rounded-xs text-emerald-400 border border-emerald-800/30">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-emerald-400 flex items-baseline gap-2">
              {overallMetrics.deepReadersCount.toLocaleString()}
              <span className="text-xs font-mono font-normal text-emerald-400/70">
                ({overallMetrics.deepReadRate}%)
              </span>
            </div>
            <div className="font-serif text-xs text-paper/40 mt-0.5">
              Active time ≥ 180s <span className="text-emerald-400/80 font-bold">&</span> scroll ≥ 75%
            </div>
          </div>
          <div className="pt-2 border-t border-paper/5 flex justify-between items-center text-[10px] font-mono text-paper/40">
            <span>Deep-Read Rate:</span>
            <span className="text-emerald-400 font-bold">{overallMetrics.deepReadRate}%</span>
          </div>
        </div>

        {/* Card 3: Engaged Browsers */}
        <div className="bg-navy border border-amber-900/40 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-bold">
              Engaged Browsers
            </span>
            <div className="p-1.5 bg-amber-950/50 rounded-xs text-amber-400 border border-amber-800/30">
              <BookOpen size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-amber-400 flex items-baseline gap-2">
              {overallMetrics.engagedCount.toLocaleString()}
              <span className="text-xs font-mono font-normal text-amber-400/70">
                ({overallMetrics.engagedRate}%)
              </span>
            </div>
            <div className="font-serif text-xs text-paper/40 mt-0.5">
              Active time 45–180s <span className="text-amber-400/80 font-bold">&</span> scroll 25–75%
            </div>
          </div>
          <div className="pt-2 border-t border-paper/5 flex justify-between items-center text-[10px] font-mono text-paper/40">
            <span>Meaningful Sessions:</span>
            <span className="text-amber-400 font-bold">{overallMetrics.meaningfulRate}%</span>
          </div>
        </div>

        {/* Card 4: Bouncers / Skimmers */}
        <div className="bg-navy border border-rose-950/40 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-rose-400 font-bold">
              Bouncers / Skimmers
            </span>
            <div className="p-1.5 bg-rose-950/50 rounded-xs text-rose-400 border border-rose-800/30">
              <Clock size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-rose-400 flex items-baseline gap-2">
              {overallMetrics.bouncersCount.toLocaleString()}
              <span className="text-xs font-mono font-normal text-rose-400/70">
                ({overallMetrics.bounceRate}%)
              </span>
            </div>
            <div className="font-serif text-xs text-paper/40 mt-0.5">
              Active time &lt; 45s <span className="text-rose-400/80 font-bold">OR</span> scroll &lt; 25%
            </div>
          </div>
          <div className="pt-2 border-t border-paper/5 flex justify-between items-center text-[10px] font-mono text-paper/40">
            <span>Bounce Ratio:</span>
            <span className="text-rose-400 font-bold">{overallMetrics.bounceRate}%</span>
          </div>
        </div>

      </div>

      {/* 4. ACTIVE READING ATTENTION & COMPLETION BENCHMARKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Active Reading Duration (Average & Median) */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-paper/5 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold flex items-center gap-1.5">
                <Timer size={12} className="text-blood-light" /> Active Reading Attention
              </span>
              <span className="font-mono text-[8px] bg-midnight text-paper/40 px-1.5 py-0.5 rounded-xs">
                Inactivity Pauses
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <span className="font-serif text-[11px] text-paper/40 block">Average Active Time</span>
                <span className="font-display text-xl font-bold text-paper">
                  {overallMetrics.totalViews > 0 
                    ? formatActiveReadingTime(overallMetrics.avgActiveSeconds)
                    : '0s'}
                </span>
              </div>
              <div>
                <span className="font-serif text-[11px] text-paper/40 block">Median Active Time</span>
                <span className="font-display text-xl font-bold text-blood-light">
                  {overallMetrics.totalViews > 0 
                    ? formatActiveReadingTime(overallMetrics.medianActiveSeconds)
                    : '0s'}
                </span>
              </div>
            </div>
          </div>
          <p className="font-serif text-[11px] text-paper/40 mt-3 pt-2 border-t border-paper/5 leading-relaxed">
            Measures confirmed reading time while the tab is focused and visible. Ticker automatically pauses after 35s of inactivity.
          </p>
        </div>

        {/* Scroll Depth & Article Completion Rate */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-paper/5 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold flex items-center gap-1.5">
                <BarChart3 size={12} className="text-blood-light" /> Container Scroll & Completion
              </span>
              <span className="font-mono text-[8px] bg-midnight text-paper/40 px-1.5 py-0.5 rounded-xs">
                Article Body Only
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <span className="font-serif text-[11px] text-paper/40 block">Avg Max Scroll Depth</span>
                <span className="font-display text-xl font-bold text-paper">
                  {overallMetrics.totalViews > 0 ? `${overallMetrics.avgScrollDepth}%` : '0%'}
                </span>
              </div>
              <div>
                <span className="font-serif text-[11px] text-paper/40 block">Article Completion Rate</span>
                <span className="font-display text-xl font-bold text-emerald-400">
                  {overallMetrics.totalViews > 0 ? `${overallMetrics.completionRate}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
          <p className="font-serif text-[11px] text-paper/40 mt-3 pt-2 border-t border-paper/5 leading-relaxed">
            Calculated strictly on the article content container. Excludes headers, navigation, footer, and discourse threads.
          </p>
        </div>

        {/* Audience Loyalty & New vs. Returning Readers */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-paper/5 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold flex items-center gap-1.5">
                <Users size={12} className="text-blood-light" /> Audience Loyalty
              </span>
              <span className="font-mono text-[8px] bg-midnight text-paper/40 px-1.5 py-0.5 rounded-xs">
                Anonymous UUID
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <span className="font-serif text-[11px] text-paper/40 block">First-Time Visitors</span>
                <span className="font-display text-xl font-bold text-paper">
                  {overallMetrics.newVisitorsCount}
                </span>
              </div>
              <div>
                <span className="font-serif text-[11px] text-paper/40 block">Returning Readers</span>
                <span className="font-display text-xl font-bold text-paper">
                  {overallMetrics.returningVisitorsCount}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-paper/5 flex justify-between items-center text-[10px] font-mono text-paper/40">
            <span>Returning Ratio:</span>
            <span className="text-paper/80 font-bold">
              {overallMetrics.totalViews > 0 
                ? `${Math.round((overallMetrics.returningVisitorsCount / overallMetrics.totalViews) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

      </div>

      {/* 5. VISUAL CHART ENGINE: COMMITMENT TRENDS & FUNNELS */}
      <div className="bg-navy border border-paper/10 rounded-sm p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-paper/5 pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-paper flex items-center gap-2">
              <TrendingUp size={15} className="text-blood-light" />
              {chartMode === 'commitment' && "Reader Commitment Classification Trends"}
              {chartMode === 'milestones' && "Article Scroll Depth Milestone Funnel"}
              {chartMode === 'volume' && "Total Readership Volume & Active Minutes"}
              {chartMode === 'domains' && "Commitment by Academic Discipline"}
            </h3>
            <p className="font-serif text-xs text-paper/40 mt-0.5">
              {chartMode === 'commitment' && "Daily breakdown of Deep Readers vs. Engaged Browsers vs. Bouncers."}
              {chartMode === 'milestones' && "Percentage of reader sessions crossing each progressive milestone."}
              {chartMode === 'volume' && "Overall page views and aggregate attention minutes."}
              {chartMode === 'domains' && "Criminology, Psyche, and Politics readership comparison."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center bg-midnight border border-paper/10 p-0.5 rounded-xs text-xs font-sans">
            <button
              onClick={() => setChartMode('commitment')}
              className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                chartMode === 'commitment' ? 'bg-blood text-paper font-bold' : 'text-paper/40 hover:text-paper'
              }`}
            >
              Commitment
            </button>
            <button
              onClick={() => setChartMode('milestones')}
              className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                chartMode === 'milestones' ? 'bg-blood text-paper font-bold' : 'text-paper/40 hover:text-paper'
              }`}
            >
              Milestone Funnel
            </button>
            <button
              onClick={() => setChartMode('volume')}
              className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                chartMode === 'volume' ? 'bg-blood text-paper font-bold' : 'text-paper/40 hover:text-paper'
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setChartMode('domains')}
              className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                chartMode === 'domains' ? 'bg-blood text-paper font-bold' : 'text-paper/40 hover:text-paper'
              }`}
            >
              Domains
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        <div className="h-[280px] w-full">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-paper/30 font-serif italic text-sm gap-2">
              <Activity size={24} className="text-paper/20 animate-pulse" />
              No genuine view events recorded for the selected filter window.
            </div>
          ) : chartMode === 'commitment' ? (
            /* 1. Stacked Commitment Breakdown Chart */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commitmentTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#e6d5b8" 
                  opacity={0.5} 
                  tick={{ fontSize: 10, fill: '#e6d5b8' }} 
                />
                <YAxis 
                  stroke="#e6d5b8" 
                  opacity={0.5} 
                  tick={{ fontSize: 10, fill: '#e6d5b8' }} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0f18', 
                    borderColor: 'rgba(230, 213, 184, 0.2)', 
                    color: '#e6d5b8',
                    fontFamily: 'serif',
                    fontSize: '11px',
                    borderRadius: '2px'
                  }} 
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif', paddingTop: '8px' }}
                />
                <Bar dataKey="deepReaders" name="Deep Reader (True Read)" stackId="a" fill="#10b981" />
                <Bar dataKey="engaged" name="Engaged Browser" stackId="a" fill="#f59e0b" />
                <Bar dataKey="bouncers" name="Bouncer / Skimmer" stackId="a" fill="#e11d48" />
              </BarChart>
            </ResponsiveContainer>
          ) : chartMode === 'milestones' ? (
            /* 2. Milestone Funnel Bar Chart */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={milestoneFunnelData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" opacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="#e6d5b8" opacity={0.5} tick={{ fontSize: 10, fill: '#e6d5b8' }} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#e6d5b8" opacity={0.7} tick={{ fontSize: 11, fill: '#e6d5b8' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0f18', 
                    borderColor: 'rgba(230, 213, 184, 0.2)', 
                    color: '#e6d5b8',
                    fontFamily: 'serif',
                    fontSize: '11px',
                    borderRadius: '2px'
                  }}
                  formatter={(val: any, name: any, item: any) => [`${val}% (${item.payload.count} readers)`, item.payload.desc]}
                />
                <Bar dataKey="pct" name="Completion %" fill="#8b1a1a" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : chartMode === 'volume' ? (
            /* 3. Volume Area Chart */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commitmentTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b1a1a" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#8b1a1a" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" opacity={0.3} vertical={false} />
                <XAxis dataKey="date" stroke="#e6d5b8" opacity={0.5} tick={{ fontSize: 10, fill: '#e6d5b8' }} />
                <YAxis stroke="#e6d5b8" opacity={0.5} tick={{ fontSize: 10, fill: '#e6d5b8' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0f18', 
                    borderColor: 'rgba(230, 213, 184, 0.2)', 
                    color: '#e6d5b8',
                    fontFamily: 'serif',
                    fontSize: '11px',
                    borderRadius: '2px'
                  }} 
                />
                <Area type="monotone" dataKey="totalViews" name="Article Views" stroke="#8b1a1a" fillOpacity={1} fill="url(#volColor)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            /* 4. Domain Bar Chart */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" stroke="#e6d5b8" opacity={0.5} tick={{ fontSize: 10, fill: '#e6d5b8' }} />
                <YAxis stroke="#e6d5b8" opacity={0.5} tick={{ fontSize: 10, fill: '#e6d5b8' }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0f18', 
                    borderColor: 'rgba(230, 213, 184, 0.2)', 
                    color: '#e6d5b8',
                    fontFamily: 'serif',
                    fontSize: '11px',
                    borderRadius: '2px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }} />
                <Bar dataKey="views" name="Total Views" fill="#3c5a6b" />
                <Bar dataKey="deepReaders" name="Deep Readers" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 6. PER-ARTICLE COMMITMENT CLASSIFICATION BREAKDOWN */}
      <div className="bg-navy border border-paper/10 rounded-sm p-5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-paper/5 pb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-paper flex items-center gap-2">
              <BookOpen size={15} className="text-blood-light" />
              Article-by-Article Commitment Analysis
            </h3>
            <p className="font-serif text-xs text-paper/40 mt-0.5">
              Granular metrics distinguishing bouncers from genuine research reads across each publication.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search within articles */}
            <div className="relative flex-1 md:w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-paper/40" />
              <input
                type="text"
                placeholder="Search articles..."
                value={articleSearchQuery}
                onChange={(e) => setArticleSearchQuery(e.target.value)}
                className="w-full bg-midnight border border-paper/15 text-paper text-xs pl-7 pr-2.5 py-1.5 rounded-xs focus:outline-none focus:border-blood"
              />
            </div>

            {/* Sort by dropdown */}
            <select
              value={articleSortBy}
              onChange={(e) => setArticleSortBy(e.target.value as any)}
              className="bg-midnight border border-paper/15 text-paper px-2 py-1.5 rounded-xs text-xs font-sans focus:outline-none focus:border-blood"
            >
              <option value="views">Sort by Views</option>
              <option value="deep_rate">Sort by Deep-Read Rate</option>
              <option value="active_time">Sort by Active Time</option>
              <option value="completion">Sort by Completion %</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-serif text-xs">
            <thead>
              <tr className="border-b border-paper/10 text-paper/40 font-sans text-[9px] uppercase tracking-wider">
                <th className="py-2.5 font-bold">Investigation</th>
                <th className="py-2.5 font-bold text-center">Total Views</th>
                <th className="py-2.5 font-bold text-center">Meaningful</th>
                <th className="py-2.5 font-bold text-center">Deep Readers</th>
                <th className="py-2.5 font-bold text-center">Deep-Read Rate</th>
                <th className="py-2.5 font-bold text-center">Avg Active Time</th>
                <th className="py-2.5 font-bold text-center">Median Time</th>
                <th className="py-2.5 font-bold text-center">Avg Scroll</th>
                <th className="py-2.5 font-bold text-center">Completion</th>
                <th className="py-2.5 font-bold">Commitment Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/5">
              {perArticleCommitmentData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-paper/30 italic">
                    No articles found matching search criteria.
                  </td>
                </tr>
              ) : (
                perArticleCommitmentData.map((art) => {
                  const hasData = art.hasSufficientData;
                  const total = art.totalViews;

                  return (
                    <tr 
                      key={art.articleId} 
                      className="hover:bg-midnight/40 transition-colors text-paper/85"
                    >
                      {/* Title & Domain */}
                      <td className="py-3 pr-3 max-w-[220px]">
                        <div className="font-bold text-paper truncate" title={art.articleTitle}>
                          {art.articleTitle}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[8px] uppercase tracking-wider text-blood-light font-semibold">
                            {art.category}
                          </span>
                          {!hasData && (
                            <span className="font-mono text-[8px] text-paper/30 italic">
                              • {art.dataStatusText}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Views */}
                      <td className="py-3 text-center font-mono text-[11px] text-paper/80 font-bold">
                        {art.totalViews}
                      </td>

                      {/* Meaningful Sessions */}
                      <td className="py-3 text-center font-mono text-[11px]">
                        {total > 0 ? (
                          <span className="text-paper/80">
                            {art.meaningfulCount} <span className="text-paper/40 text-[9px]">({art.meaningfulRate}%)</span>
                          </span>
                        ) : (
                          <span className="text-paper/30">—</span>
                        )}
                      </td>

                      {/* Deep Readers */}
                      <td className="py-3 text-center font-mono text-[11px]">
                        {total > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            {art.deepReadersCount}
                          </span>
                        ) : (
                          <span className="text-paper/30">—</span>
                        )}
                      </td>

                      {/* Deep-Read Rate */}
                      <td className="py-3 text-center font-mono text-[11px]">
                        {total > 0 ? (
                          <span className={`px-1.5 py-0.5 rounded-xs font-bold ${
                            art.deepReadRate >= 25 
                              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/30'
                              : art.deepReadRate > 0
                              ? 'text-paper/70'
                              : 'text-paper/30'
                          }`}>
                            {art.deepReadRate}%
                          </span>
                        ) : (
                          <span className="text-paper/30 text-[10px]">No data yet</span>
                        )}
                      </td>

                      {/* Avg Active Time */}
                      <td className="py-3 text-center font-mono text-[11px] text-paper/70">
                        {total > 0 ? formatActiveReadingTime(art.avgActiveSeconds) : '—'}
                      </td>

                      {/* Median Active Time */}
                      <td className="py-3 text-center font-mono text-[11px] text-blood-light font-bold">
                        {total > 0 ? formatActiveReadingTime(art.medianActiveSeconds) : '—'}
                      </td>

                      {/* Avg Scroll */}
                      <td className="py-3 text-center font-mono text-[11px] text-paper/70">
                        {total > 0 ? `${art.avgScrollDepth}%` : '—'}
                      </td>

                      {/* Completion Rate (>= 90%) */}
                      <td className="py-3 text-center font-mono text-[11px]">
                        {total > 0 ? (
                          <span className={art.completionRate > 0 ? "text-paper/80 font-bold" : "text-paper/30"}>
                            {art.completionRate}%
                          </span>
                        ) : (
                          <span className="text-paper/30">—</span>
                        )}
                      </td>

                      {/* Commitment Distribution Stack Bar */}
                      <td className="py-3 min-w-[150px]">
                        {total === 0 ? (
                          <span className="font-mono text-[9px] text-paper/30 italic">No data yet</span>
                        ) : art.classifiableViews === 0 ? (
                          <span className="font-mono text-[9px] text-paper/30 italic">Insufficient data</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {/* Visual Progress Bar */}
                            <div className="w-full h-2 bg-midnight rounded-xs overflow-hidden flex border border-paper/10">
                              {art.bouncersCount > 0 && (
                                <div 
                                  style={{ width: `${(art.bouncersCount / art.classifiableViews) * 100}%` }}
                                  className="bg-rose-600 h-full"
                                  title={`Bouncers: ${art.bouncersCount} (${art.bounceRate}%)`}
                                />
                              )}
                              {art.engagedCount > 0 && (
                                <div 
                                  style={{ width: `${(art.engagedCount / art.classifiableViews) * 100}%` }}
                                  className="bg-amber-500 h-full"
                                  title={`Engaged: ${art.engagedCount} (${art.engagedRate}%)`}
                                />
                              )}
                              {art.deepReadersCount > 0 && (
                                <div 
                                  style={{ width: `${(art.deepReadersCount / art.classifiableViews) * 100}%` }}
                                  className="bg-emerald-500 h-full"
                                  title={`Deep Readers: ${art.deepReadersCount} (${art.deepReadRate}%)`}
                                />
                              )}
                            </div>

                            {/* Mini label breakdown */}
                            <div className="flex justify-between items-center text-[8px] font-mono text-paper/40">
                              <span className="text-rose-400">{art.bounceRate}% B</span>
                              <span className="text-amber-400">{art.engagedRate}% E</span>
                              <span className="text-emerald-400 font-bold">{art.deepReadRate}% D</span>
                            </div>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. REFERRER SOURCES & DEVICE CHANNELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Referrers & Devices */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Referrers */}
          <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-3">
            <h4 className="font-display text-xs uppercase tracking-wider font-bold text-paper border-b border-paper/5 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe size={13} className="text-blood-light" /> Traffic Sources
              </span>
              <span className="font-mono text-[9px] text-paper/40 font-normal">
                {referrerDistribution.length} channels
              </span>
            </h4>
            
            {referrerDistribution.length === 0 ? (
              <div className="py-6 text-center text-paper/30 font-serif text-xs italic">
                No referral data recorded yet
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                {referrerDistribution.map((ref, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-midnight/40 p-2 border border-paper/5 rounded-xs text-xs font-serif">
                    <span className="text-paper/80 truncate max-w-[200px]">{ref.name}</span>
                    <span className="font-mono text-[10px] text-paper/40 font-bold">
                      {ref.count} ({ref.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-3">
            <h4 className="font-display text-xs uppercase tracking-wider font-bold text-paper border-b border-paper/5 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Laptop size={13} className="text-blood-light" /> Reader Terminals
              </span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {deviceDistribution.map((d, idx) => (
                <div key={idx} className="bg-midnight/40 p-2 border border-paper/5 rounded-xs flex flex-col items-center justify-center text-center">
                  <div className="mb-1">{d.icon}</div>
                  <span className="text-paper/80 font-sans text-[10px] font-bold">{d.name}</span>
                  <span className="font-mono text-[9px] text-paper/40">{d.count} ({d.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Authenticated Event Log */}
        <div className="lg:col-span-7 bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-paper/5 pb-2">
            <h4 className="font-display text-xs uppercase tracking-wider font-bold text-paper flex items-center gap-1.5">
              <Activity size={13} className="text-blood-light" /> Authenticated Telemetry Log
            </h4>
            <span className="font-mono text-[8px] uppercase tracking-wider bg-midnight text-paper/40 px-2 py-0.5 border border-paper/5 rounded-xs">
              {filteredLogs.length} events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-serif text-xs">
              <thead>
                <tr className="border-b border-paper/10 text-paper/30 font-sans text-[9px] uppercase tracking-wider">
                  <th className="py-2 font-bold">Target Article</th>
                  <th className="py-2 font-bold text-center">Active Time</th>
                  <th className="py-2 font-bold text-center">Scroll</th>
                  <th className="py-2 font-bold">Classification</th>
                  <th className="py-2 font-bold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper/5">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-paper/30 italic">
                      No events logged yet for this filter selection.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.slice(0, 10).map((log) => {
                    const activeSec = typeof log.activeReadingSeconds === 'number' ? log.activeReadingSeconds : (log.readDurationSeconds || 0);
                    const scroll = typeof log.maxScrollDepth === 'number' ? log.maxScrollDepth : (log.scrollDepthPercent || 0);
                    const cls = log.classification || classifyReaderSession(activeSec, scroll);
                    const meta = cls ? CLASSIFICATION_META[cls] : null;

                    return (
                      <tr key={log.id || `${log.timestamp}-${log.articleId}`} className="hover:bg-midnight/30 transition-colors text-paper/85">
                        <td className="py-2.5 pr-2 truncate max-w-[170px] font-bold" title={log.articleTitle}>
                          {log.articleTitle}
                        </td>
                        <td className="py-2.5 text-center font-mono text-[10px] text-paper/60">
                          {formatActiveReadingTime(activeSec)}
                        </td>
                        <td className="py-2.5 text-center font-mono text-[10px] text-paper/60">
                          {scroll}%
                        </td>
                        <td className="py-2.5">
                          {meta ? (
                            <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded-xs border uppercase font-bold ${meta.badgeBg} ${meta.textColor} ${meta.borderColor}`}>
                              {meta.shortLabel}
                            </span>
                          ) : (
                            <span className="font-mono text-[8px] text-paper/30 italic">
                              Unclassified
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-mono text-[10px] text-paper/40 text-right">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredLogs.length > 10 && (
            <div className="text-center pt-2 font-sans text-[9px] tracking-wider uppercase text-paper/30">
              Displaying latest 10 of {filteredLogs.length} verified events.
            </div>
          )}
        </div>

      </div>
        </>
      )}

      {/* 8. ATTRIBUTED SIGNUPS CONVERSION ENGINE */}
      {(dashboardTab === 'all' || dashboardTab === 'attribution') && (
        <AttributedSignupsSection
          allArticles={allArticles}
          viewsLogs={filteredLogs}
          timeRange={timeRange}
        />
      )}

      {/* 9. RESONANT QUOTES & TEXT INTERACTION TELEMETRY */}
      {(dashboardTab === 'all' || dashboardTab === 'resonance') && (
        <ResonantQuotesSection
          allArticles={allArticles}
          viewsLogs={filteredLogs}
          timeRange={timeRange}
        />
      )}

      {/* 10. VERIFIED ZERO-FABRICATION DATA INTEGRITY AUDIT */}
      <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-3 items-start">
          <div className="bg-blood/10 p-2 border border-blood/20 rounded-xs text-blood-light shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-paper">
              Zero-Fabrication Data Integrity Guarantee
            </h4>
            <p className="font-serif text-xs text-paper/50 leading-relaxed mt-0.5 max-w-xl">
              All views, active reading times, and container scroll depths reflect actual reader interactions recorded in the database. No synthetic, simulated, or randomized metrics are ever generated.
            </p>
          </div>
        </div>

        <div className="flex gap-2 self-stretch md:self-auto shrink-0 items-center">
          {logs.length > 0 && (
            <button
              onClick={handleClearAllLogs}
              disabled={cleaningStatus === 'cleaning'}
              className="border border-paper/10 hover:border-red-900 hover:bg-red-950/20 text-paper/60 hover:text-red-400 px-3 py-1.5 text-xs font-sans rounded-xs cursor-pointer transition-all flex items-center gap-1.5"
              title="Reset all view logs"
            >
              <Trash2 size={12} />
              <span>Reset Logs ({logs.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 9. METHODOLOGY & ZERO-PII PRIVACY MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 backdrop-blur-xs p-4 fade-in">
          <div className="bg-navy border border-paper/20 rounded-sm p-6 max-w-2xl w-full flex flex-col gap-5 shadow-2xl">
            <div className="flex justify-between items-start border-b border-paper/10 pb-3">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-blood-light font-bold">
                  Technical Standard & Privacy Architecture
                </span>
                <h3 className="font-display text-xl font-bold text-paper mt-0.5">
                  Reader Commitment Classification Methodology
                </h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-paper/40 hover:text-paper p-1 rounded-xs transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs font-serif text-paper/80 max-h-[60vh] overflow-y-auto pr-2 leading-relaxed">
              
              {/* Classification Definitions */}
              <div>
                <h4 className="font-sans font-bold text-paper text-sm mb-2 flex items-center gap-1.5">
                  <Award size={14} className="text-blood-light" />
                  Non-Overlapping Classification Categories
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="bg-midnight/60 p-3 border border-rose-900/30 rounded-xs">
                    <span className="font-bold text-rose-400 font-sans block text-xs">
                      1. Bouncer / Skimmer
                    </span>
                    <p className="text-paper/60 text-[11px] mt-0.5">
                      Active reading time under 45 seconds <strong>OR</strong> maximum scroll depth below 25%. Represents rapid surface scanning or immediate page bounces.
                    </p>
                  </div>

                  <div className="bg-midnight/60 p-3 border border-amber-900/30 rounded-xs">
                    <span className="font-bold text-amber-400 font-sans block text-xs">
                      2. Engaged Browser
                    </span>
                    <p className="text-paper/60 text-[11px] mt-0.5">
                      Active reading time between 45 seconds and 180 seconds, and maximum scroll depth between 25% and 75%. Represents substantive exploratory reading without crossing full thesis assimilation thresholds.
                    </p>
                  </div>

                  <div className="bg-midnight/60 p-3 border border-emerald-900/30 rounded-xs">
                    <span className="font-bold text-emerald-400 font-sans block text-xs">
                      3. Deep Reader / Estimated True Read
                    </span>
                    <p className="text-paper/60 text-[11px] mt-0.5">
                      Active reading time of at least 180 seconds (3 minutes) <strong>AND</strong> maximum scroll depth of at least 75%. Labeled scientifically as &ldquo;Estimated True Read&rdquo; rather than &ldquo;Confirmed Read&rdquo; to reflect observational precision.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Time Measurement */}
              <div>
                <h4 className="font-sans font-bold text-paper text-sm mb-1.5 flex items-center gap-1.5">
                  <Timer size={14} className="text-blood-light" />
                  Active Reading Time Mechanics
                </h4>
                <p className="text-paper/70">
                  Does not simply record the span between page load and exit. The active reading ticker increments only when:
                </p>
                <ul className="list-disc pl-5 mt-1.5 text-paper/60 text-[11px] space-y-1">
                  <li>The browser tab is visible (<code className="font-mono text-[10px] text-paper/80">document.visibilityState === &apos;visible&apos;</code>).</li>
                  <li>The window has focus (<code className="font-mono text-[10px] text-paper/80">document.hasFocus()</code>).</li>
                  <li>The visitor has engaged in user input (scroll, cursor, keyboard, touch) within the last 35 seconds.</li>
                  <li>Multiple open background tabs are coordinated so only the active focused tab accumulates duration.</li>
                </ul>
              </div>

              {/* Container-Specific Scroll Tracking */}
              <div>
                <h4 className="font-sans font-bold text-paper text-sm mb-1.5 flex items-center gap-1.5">
                  <Layers size={14} className="text-blood-light" />
                  Container-Specific Scroll Depth Tracking
                </h4>
                <p className="text-paper/70 text-[11px]">
                  Scroll depth is computed strictly against the article content container (<code className="font-mono text-[10px] text-paper/80">#article-body-content</code>), completely excluding site headers, navigation bars, author biographies, peer debate portals, and footer elements. Milestone events at 25%, 50%, 75%, 90%, and 100% are recorded once per session with throttled execution.
                </p>
              </div>

              {/* Privacy Architecture */}
              <div>
                <h4 className="font-sans font-bold text-paper text-sm mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blood-light" />
                  Zero-PII Privacy Protection
                </h4>
                <p className="text-paper/70 text-[11px]">
                  The Oligarchy collects zero personally identifiable information (PII). No names, email addresses, or exact IP addresses are ever captured in analytics logs. Sessions utilize client-generated anonymous tokens (<code className="font-mono text-[10px] text-paper/80">vis_*</code> and <code className="font-mono text-[10px] text-paper/80">sess_*</code>) retained locally in the reader&apos;s browser.
                </p>
              </div>

            </div>

            <div className="border-t border-paper/10 pt-3 flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="bg-blood text-paper px-4 py-2 text-xs font-sans uppercase tracking-wider rounded-xs cursor-pointer hover:bg-blood-light transition-colors"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
