import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  Article, 
  ViewLog, 
  ConversionEvent, 
  SignupLocation, 
  ArticleAttributionBreakdown 
} from '../types';
import { 
  computeAttributionMetrics, 
  AttributionAnalyticsSummary 
} from '../utils/attributionTracker';
import { 
  MailCheck, 
  Compass, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Target, 
  Sparkles, 
  Download, 
  Search, 
  Clock, 
  CheckCircle2, 
  Info,
  ExternalLink,
  Filter,
  BarChart2,
  BookmarkCheck,
  TrendingUp,
  Award
} from 'lucide-react';

interface AttributedSignupsSectionProps {
  allArticles: Article[];
  viewsLogs: ViewLog[];
  timeRange: 'today' | '7d' | '30d' | 'all';
}

type AttributionModelTab = 'first-touch' | 'last-touch' | 'direct' | 'all';

export default function AttributedSignupsSection({
  allArticles,
  viewsLogs,
  timeRange
}: AttributedSignupsSectionProps) {
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<AttributionModelTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Load conversion events from Firestore
  const loadConversionEvents = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, 'conversion_events');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as ConversionEvent));
      setEvents(list);
    } catch (err) {
      console.warn('Could not load conversion events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversionEvents();
  }, [timeRange]);

  // Filter events by selected time range
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    let res = events;
    if (timeRange === 'today') {
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      res = res.filter(e => (e.timestamp || 0) >= oneDayAgo);
    } else if (timeRange === '7d') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      res = res.filter(e => (e.timestamp || 0) >= sevenDaysAgo);
    } else if (timeRange === '30d') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      res = res.filter(e => (e.timestamp || 0) >= thirtyDaysAgo);
    }

    if (locationFilter !== 'all') {
      res = res.filter(e => e.signupLocation === locationFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter(e => 
        (e.firstTouchArticleTitle && e.firstTouchArticleTitle.toLowerCase().includes(q)) ||
        (e.lastTouchArticleTitle && e.lastTouchArticleTitle.toLowerCase().includes(q)) ||
        (e.conversionArticleTitle && e.conversionArticleTitle.toLowerCase().includes(q)) ||
        (e.referrer && e.referrer.toLowerCase().includes(q))
      );
    }

    return res;
  }, [events, timeRange, locationFilter, searchQuery]);

  // Compute multi-model attribution analytics
  const summary: AttributionAnalyticsSummary = useMemo(() => {
    return computeAttributionMetrics(filteredEvents, allArticles, viewsLogs);
  }, [filteredEvents, allArticles, viewsLogs]);

  // Filtered articles list based on active tab
  const displayedArticles: ArticleAttributionBreakdown[] = useMemo(() => {
    let list: ArticleAttributionBreakdown[] = summary.allAttributedArticles;
    
    if (selectedModel === 'first-touch') {
      list = [...list].filter(a => a.firstTouchCount > 0).sort((a, b) => b.firstTouchCount - a.firstTouchCount);
    } else if (selectedModel === 'last-touch') {
      list = [...list].filter(a => a.lastTouchCount > 0).sort((a, b) => b.lastTouchCount - a.lastTouchCount);
    } else if (selectedModel === 'direct') {
      list = [...list].filter(a => a.directConversionCount > 0).sort((a, b) => b.directConversionCount - a.directConversionCount);
    } else {
      list = [...list].filter(a => a.totalTouchpoints > 0).sort((a, b) => b.totalTouchpoints - a.totalTouchpoints);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a => 
        a.articleTitle.toLowerCase().includes(q) || 
        a.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary, selectedModel, searchQuery]);

  // Export CSV helper
  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;

    const headers = [
      'Event ID',
      'Visitor ID (Anon)',
      'Timestamp',
      'Date UTC',
      'First Touch Article',
      'Last Touch Article',
      'Conversion Article',
      'Signup Location',
      'Referrer',
      'Attribution Window (Days)',
      'Status'
    ];

    const rows = filteredEvents.map(e => [
      e.id || '',
      e.visitorId || 'anonymous',
      e.timestamp,
      new Date(e.timestamp).toISOString(),
      `"${(e.firstTouchArticleTitle || 'Direct / None').replace(/"/g, '""')}"`,
      `"${(e.lastTouchArticleTitle || 'Direct / None').replace(/"/g, '""')}"`,
      `"${(e.conversionArticleTitle || 'Non-Article / Global').replace(/"/g, '""')}"`,
      e.signupLocation || 'unknown',
      `"${(e.referrer || 'direct').replace(/"/g, '""')}"`,
      e.attributionWindowDays || 7,
      e.subscriptionStatus || 'confirmed'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `the_oligarchy_attributed_signups_${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const locationLabels: Record<SignupLocation, { label: string; desc: string }> = {
    'in-article': { label: 'In-Article Brief Card', desc: 'Embedded at the end of an investigation' },
    'homepage': { label: 'Homepage Brief Spotlight', desc: 'Featured newsletter block on home feed' },
    'footer': { label: 'Platform Footer Dispatch', desc: 'Global persistent site footer' },
    'drawer': { label: 'Marginalia / Debate Drawer', desc: 'Side discussion & review portal' },
    'modal': { label: 'Reading Dialog / Modal', desc: 'Contextual prompt' },
    'unknown': { label: 'Direct / Unspecified', desc: 'Standard registration' }
  };

  return (
    <div id="attributed-signups-section" className="flex flex-col gap-6 pt-4">
      {/* Section Header with Scientific Transparency Disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] uppercase tracking-wider bg-blood/10 border border-blood/30 text-blood-light px-2 py-0.5 rounded-xs font-bold flex items-center gap-1.5">
              <Target size={11} /> Multi-Touch Attribution Engine
            </span>
            <span className="font-mono text-[9px] text-paper/40">
              7-Day Cross-Session Lookback Window
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-paper flex items-center gap-2">
            Attributed Signups
          </h3>
          <p className="font-serif text-xs text-paper/60 max-w-3xl leading-relaxed mt-1">
            Observational journey analysis linking reader newsletter registrations to prior article exposures. 
            Signups are classified across <strong className="text-paper/80">First-Touch</strong> (discovery entry-point), <strong className="text-paper/80">Last-Touch</strong> (conviction closer), and <strong className="text-paper/80">Direct Conversion</strong> (in-article signup).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadConversionEvents}
            className="flex items-center gap-1.5 bg-midnight hover:bg-paper/5 border border-paper/15 text-paper/70 hover:text-paper px-3 py-1.5 rounded-xs font-sans text-xs transition-colors cursor-pointer"
            title="Refresh conversion events"
          >
            <Clock size={13} />
            <span>Sync</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 bg-midnight hover:bg-blood/20 disabled:opacity-40 border border-paper/15 hover:border-blood/40 text-paper px-3 py-1.5 rounded-xs font-sans text-xs font-semibold transition-colors cursor-pointer"
            title="Export Attribution Journey CSV"
          >
            <Download size={13} className="text-blood-light" />
            <span>Export Attribution CSV</span>
          </button>
        </div>
      </div>

      {/* Zero PII Privacy Banner */}
      <div className="bg-navy/60 border border-paper/10 px-4 py-3 rounded-sm flex items-start gap-3">
        <ShieldCheck size={16} className="text-[#8bc4a8] shrink-0 mt-0.5" />
        <div className="text-[11px] font-serif text-paper/70 leading-relaxed">
          <strong className="font-sans font-bold text-paper block mb-0.5">Privacy-Preserving Attribution Standard</strong>
          To uphold academic confidentiality and reader privacy, email addresses and personal identities are completely decoupled from analytical event paths. Conversions record anonymous ephemeral tokens (<code className="font-mono text-[10px] text-paper/90">vis_*</code>) to map multi-session touchpoints without individual tracking.
        </div>
      </div>

      {/* KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Attributed Signups */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold">
              Attributed Signups
            </span>
            <MailCheck size={15} className="text-blood-light" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-paper">
              {summary.totalSignups}
            </div>
            <div className="font-mono text-[10px] text-paper/50">
              {timeRange === 'today' ? 'Past 24 Hours' : timeRange === '7d' ? 'Past 7 Days' : timeRange === '30d' ? 'Past 30 Days' : 'All Historical'}
            </div>
          </div>
          <div className="text-[10px] font-serif text-paper/50 border-t border-paper/10 pt-1.5 flex justify-between">
            <span>Direct: <strong className="text-paper/80 font-sans">{summary.directArticleSignups}</strong></span>
            <span>Assisted: <strong className="text-paper/80 font-sans">{summary.assistedSignups}</strong></span>
          </div>
        </div>

        {/* Card 2: Direct In-Article Signups */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold">
              Direct Article Conversions
            </span>
            <BookmarkCheck size={15} className="text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-emerald-400">
              {summary.directArticleSignups}
            </div>
            <div className="font-mono text-[10px] text-paper/50">
              {summary.totalSignups > 0 
                ? `${Math.round((summary.directArticleSignups / summary.totalSignups) * 100)}% of all signups`
                : '0% share'}
            </div>
          </div>
          <div className="text-[10px] font-serif text-paper/50 border-t border-paper/10 pt-1.5">
            Registered on active article page
          </div>
        </div>

        {/* Card 3: Assisted Conversions */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold">
              Assisted Touchpoints
            </span>
            <Compass size={15} className="text-amber-400" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-amber-400">
              {summary.assistedSignups}
            </div>
            <div className="font-mono text-[10px] text-paper/50">
              Read essay ➔ Converted elsewhere
            </div>
          </div>
          <div className="text-[10px] font-serif text-paper/50 border-t border-paper/10 pt-1.5">
            Influenced by earlier research read
          </div>
        </div>

        {/* Card 4: Signups per 1,000 Views */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold">
              Per 1,000 Views
            </span>
            <TrendingUp size={15} className="text-blue-400" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-blue-400">
              {summary.overallConversionRatePer1kViews}
            </div>
            <div className="font-mono text-[10px] text-paper/50">
              Signups per 1k impressions
            </div>
          </div>
          <div className="text-[10px] font-serif text-paper/50 border-t border-paper/10 pt-1.5">
            Direct conversion density
          </div>
        </div>

        {/* Card 5: Signups per 1,000 True Reads */}
        <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40 font-bold">
              Per 1,000 True Reads
            </span>
            <Award size={15} className="text-purple-400" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-purple-400">
              {summary.overallConversionRatePer1kReads}
            </div>
            <div className="font-mono text-[10px] text-paper/50">
              Signups per 1k deep readers
            </div>
          </div>
          <div className="text-[10px] font-serif text-paper/50 border-t border-paper/10 pt-1.5">
            Post-assimilation yield
          </div>
        </div>
      </div>

      {/* SIGNUP LOCATION BREAKDOWN & RECENT TOUCHPOINTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1/3: Location Breakdown Bars */}
        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-paper/10 pb-3 mb-4">
              <h4 className="font-sans font-bold text-sm text-paper flex items-center gap-2">
                <BarChart2 size={14} className="text-blood-light" />
                Signups by Interface Location
              </h4>
              <span className="font-mono text-[10px] text-paper/40">
                {summary.totalSignups} total
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {(Object.keys(summary.locationBreakdown) as SignupLocation[]).map(loc => {
                const count = summary.locationBreakdown[loc];
                const pct = summary.totalSignups > 0 ? Math.round((count / summary.totalSignups) * 100) : 0;
                const meta = locationLabels[loc] || { label: loc, desc: '' };

                return (
                  <div key={loc} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-sans font-medium text-paper/90 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          loc === 'in-article' ? 'bg-emerald-400' :
                          loc === 'homepage' ? 'bg-blood' :
                          loc === 'footer' ? 'bg-blue-400' : 'bg-paper/40'
                        }`} />
                        {meta.label}
                      </span>
                      <span className="font-mono text-[11px] text-paper/70">
                        <strong className="text-paper">{count}</strong> ({pct}%)
                      </span>
                    </div>
                    
                    {/* Progress Track */}
                    <div className="w-full bg-midnight rounded-xs h-1.5 overflow-hidden border border-paper/5">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          loc === 'in-article' ? 'bg-emerald-400' :
                          loc === 'homepage' ? 'bg-blood' :
                          loc === 'footer' ? 'bg-blue-400' : 'bg-paper/40'
                        }`}
                        style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <span className="font-serif text-[10px] text-paper/40 italic">
                      {meta.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-paper/10 pt-3 mt-4 text-[11px] font-serif text-paper/50">
            <Info size={12} className="inline mr-1 text-paper/40" />
            In-article signups demonstrate the highest semantic alignment with deep scholarly inquiry.
          </div>
        </div>

        {/* Right 2/3: Top Converting Articles by Attribution Model */}
        <div className="lg:col-span-2 bg-navy border border-paper/10 p-5 rounded-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper/10 pb-3 mb-4">
            <div>
              <h4 className="font-sans font-bold text-sm text-paper flex items-center gap-2">
                <Target size={14} className="text-blood-light" />
                Article Conversion Rankings
              </h4>
              <p className="font-serif text-xs text-paper/50 mt-0.5">
                Compare articles driving discovery vs. those completing final commitment
              </p>
            </div>

            {/* Attribution Model Tabs */}
            <div className="flex items-center gap-1 bg-midnight p-1 rounded-xs border border-paper/10 text-xs font-sans">
              <button
                onClick={() => setSelectedModel('all')}
                className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedModel === 'all' ? 'bg-blood text-paper font-semibold' : 'text-paper/60 hover:text-paper'
                }`}
              >
                All Touches
              </button>
              <button
                onClick={() => setSelectedModel('first-touch')}
                className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedModel === 'first-touch' ? 'bg-blood text-paper font-semibold' : 'text-paper/60 hover:text-paper'
                }`}
                title="First article visited before subscribing within 7 days"
              >
                First-Touch
              </button>
              <button
                onClick={() => setSelectedModel('last-touch')}
                className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedModel === 'last-touch' ? 'bg-blood text-paper font-semibold' : 'text-paper/60 hover:text-paper'
                }`}
                title="Most recent article read prior to conversion"
              >
                Last-Touch
              </button>
              <button
                onClick={() => setSelectedModel('direct')}
                className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                  selectedModel === 'direct' ? 'bg-blood text-paper font-semibold' : 'text-paper/60 hover:text-paper'
                }`}
                title="Article on which the newsletter form was submitted"
              >
                Direct Conversion
              </button>
            </div>
          </div>

          {/* Table of Articles */}
          <div className="overflow-x-auto">
            {displayedArticles.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-paper/10 rounded-xs">
                <MailCheck size={28} className="mx-auto text-paper/20 mb-2" />
                <span className="font-serif text-sm text-paper/50 block">
                  No article attribution events recorded in this time range.
                </span>
                <span className="font-sans text-[11px] text-paper/30 mt-1 block">
                  Attributions are generated automatically when visitors submit the newsletter form after viewing essays.
                </span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-paper/10 font-mono text-[9px] uppercase tracking-wider text-paper/40">
                    <th className="py-2.5 px-2">Investigation Title</th>
                    <th className="py-2.5 px-2 text-center" title="First touchpoint in 7-day lookback window">
                      First-Touch
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Most recent touchpoint prior to opt-in">
                      Last-Touch
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Form submitted on this article">
                      Direct Conversion
                    </th>
                    <th className="py-2.5 px-2 text-right">Views</th>
                    <th className="py-2.5 px-2 text-right" title="Estimated signups per 1,000 article views">
                      Rate / 1k Views
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper/5">
                  {displayedArticles.slice(0, 8).map(art => (
                    <tr key={art.articleId} className="hover:bg-paper/5 transition-colors">
                      <td className="py-2.5 px-2 max-w-[280px]">
                        <div className="font-serif font-medium text-paper text-[13px] truncate">
                          {art.articleTitle}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-blood-light">
                            {art.category}
                          </span>
                          <span className="font-mono text-[9px] text-paper/30">
                            {art.totalDeepReads} true reads
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded-xs ${
                          art.firstTouchCount > 0 ? 'bg-amber-950/30 text-amber-300 font-bold border border-amber-500/20' : 'text-paper/20'
                        }`}>
                          {art.firstTouchCount}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded-xs ${
                          art.lastTouchCount > 0 ? 'bg-purple-950/30 text-purple-300 font-bold border border-purple-500/20' : 'text-paper/20'
                        }`}>
                          {art.lastTouchCount}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded-xs ${
                          art.directConversionCount > 0 ? 'bg-emerald-950/30 text-emerald-300 font-bold border border-emerald-500/20' : 'text-paper/20'
                        }`}>
                          {art.directConversionCount}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-paper/70">
                        {art.totalViews.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono font-semibold">
                        {art.conversionRatePerThousandViews > 0 ? (
                          <span className="text-emerald-400">
                            {art.conversionRatePerThousandViews}
                          </span>
                        ) : (
                          <span className="text-paper/30">0.0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RECENT JOURNEY PATHS TELEMETRY LOG */}
      <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper/10 pb-3">
          <div>
            <h4 className="font-sans font-bold text-sm text-paper flex items-center gap-2">
              <Layers size={14} className="text-blood-light" />
              Recent Subscriber Journey Paths
            </h4>
            <p className="font-serif text-xs text-paper/50 mt-0.5">
              Sequence of article touchpoints leading to conversion within the 7-day lookback window (Zero PII)
            </p>
          </div>

          {/* Location Filter & Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by essay or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-midnight border border-paper/15 text-paper placeholder-paper/30 px-2.5 py-1 pl-7 rounded-xs font-sans text-xs focus:outline-none focus:border-blood w-48"
              />
              <Search size={12} className="absolute left-2 top-2 text-paper/40" />
            </div>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-midnight border border-paper/15 text-paper px-2.5 py-1 rounded-xs font-sans text-xs focus:outline-none focus:border-blood"
            >
              <option value="all">All Locations</option>
              <option value="in-article">In-Article</option>
              <option value="homepage">Homepage</option>
              <option value="footer">Footer</option>
              <option value="drawer">Drawer</option>
            </select>
          </div>
        </div>

        {/* Journey Paths Table */}
        <div className="overflow-x-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-paper/10 rounded-xs">
              <Compass size={32} className="mx-auto text-paper/20 mb-2" />
              <span className="font-serif text-sm text-paper/50 block">
                No recent reader conversion journeys recorded matching current filters.
              </span>
              <span className="font-sans text-[11px] text-paper/30 mt-1 block">
                Once readers submit the newsletter form on any page or essay, their 7-day path will appear here instantly.
              </span>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-paper/10 font-mono text-[9px] uppercase tracking-wider text-paper/40">
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Anonymous Reader Token</th>
                  <th className="py-2.5 px-3">First-Touch Entry</th>
                  <th className="py-2.5 px-3">Last-Touch Article</th>
                  <th className="py-2.5 px-3">Conversion Context</th>
                  <th className="py-2.5 px-3">Referrer</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper/5">
                {filteredEvents.slice(0, 15).map(ev => {
                  const dateStr = new Date(ev.timestamp).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={ev.id || `${ev.visitorId}_${ev.timestamp}`} className="hover:bg-paper/5 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-paper/60 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-paper/40">
                        <span className="bg-midnight px-1.5 py-0.5 border border-paper/10 rounded-xs">
                          {ev.visitorId ? ev.visitorId.substring(0, 10) + '...' : 'anon'}
                        </span>
                      </td>

                      {/* First Touch */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {ev.firstTouchArticleTitle ? (
                          <div>
                            <div className="font-serif font-medium text-paper text-xs truncate">
                              {ev.firstTouchArticleTitle}
                            </div>
                            <span className="font-mono text-[8px] uppercase tracking-wider text-amber-400/80">
                              First Discovery Touch
                            </span>
                          </div>
                        ) : (
                          <span className="font-serif text-paper/30 italic">Direct to platform</span>
                        )}
                      </td>

                      {/* Last Touch */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {ev.lastTouchArticleTitle ? (
                          <div>
                            <div className="font-serif font-medium text-paper text-xs truncate">
                              {ev.lastTouchArticleTitle}
                            </div>
                            <span className="font-mono text-[8px] uppercase tracking-wider text-purple-400/80">
                              Prior Decision Point
                            </span>
                          </div>
                        ) : (
                          <span className="font-serif text-paper/30 italic">No prior essay</span>
                        )}
                      </td>

                      {/* Conversion Location & Article */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-xs font-mono text-[9px] uppercase tracking-wider font-bold ${
                            ev.signupLocation === 'in-article' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' :
                            ev.signupLocation === 'homepage' ? 'bg-blood/20 text-red-300 border border-blood/40' :
                            ev.signupLocation === 'footer' ? 'bg-blue-950/40 text-blue-300 border border-blue-500/30' :
                            'bg-paper/10 text-paper/60 border border-paper/20'
                          }`}>
                            {ev.signupLocation}
                          </span>
                        </div>
                        {ev.conversionArticleTitle && (
                          <div className="font-serif text-[11px] text-paper/70 truncate max-w-[220px] mt-0.5">
                            {ev.conversionArticleTitle}
                          </div>
                        )}
                      </td>

                      {/* Referrer */}
                      <td className="py-3 px-3 font-mono text-[10px] text-paper/50 max-w-[140px] truncate">
                        {ev.referrer || 'direct'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[9px] uppercase tracking-wider ${
                          ev.subscriptionStatus === 'confirmed' 
                            ? 'bg-green-950/30 text-green-300 border border-green-500/20'
                            : 'bg-amber-950/30 text-amber-300 border border-amber-500/20'
                        }`}>
                          <CheckCircle2 size={10} className="text-green-400" />
                          {ev.subscriptionStatus || 'confirmed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-paper/40 border-t border-paper/10 pt-3">
          <span className="font-serif italic">
            Showing up to 15 recent conversion journeys within the {timeRange} window
          </span>
          <span className="font-mono text-[10px]">
            Attribution window: 7 days · Non-overlapping classification
          </span>
        </div>
      </div>
    </div>
  );
}
