import React, { useState, useEffect, useMemo } from 'react';
import { 
  Article, 
  ViewLog, 
  ResonantQuoteEvent, 
  ParagraphResonanceStats, 
  ArticleResonanceSummary,
  CategoryResonanceSummary,
  SeriesResonanceSummary
} from '../types';
import { 
  fetchResonantQuoteEvents, 
  computeResonantQuoteMetrics,
  ResonantQuotesAnalytics 
} from '../utils/resonantQuoteTracker';
import { 
  Quote, 
  Highlighter, 
  Copy, 
  Users, 
  TrendingUp, 
  Filter, 
  ShieldCheck, 
  Info, 
  Search, 
  Download, 
  ExternalLink,
  Layers,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  Compass,
  ArrowUpDown
} from 'lucide-react';

interface ResonantQuotesSectionProps {
  allArticles: Article[];
  viewsLogs: ViewLog[];
  timeRange: 'today' | '7d' | '30d' | 'all';
}

type ResonantViewTab = 'most-highlighted' | 'most-copied' | 'all-paragraphs' | 'articles' | 'domains' | 'audit';

export default function ResonantQuotesSection({
  allArticles,
  viewsLogs,
  timeRange: initialTimeRange
}: ResonantQuotesSectionProps) {
  const [events, setEvents] = useState<ResonantQuoteEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>(initialTimeRange || '7d');
  const [activeTab, setActiveTab] = useState<ResonantViewTab>('most-highlighted');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'interactions' | 'highlights' | 'copies' | 'rate'>('interactions');
  const [expandedParagraphId, setExpandedParagraphId] = useState<string | null>(null);

  // Synchronize when parent timeRange prop changes
  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  // Load resonant quotes events from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchResonantQuoteEvents(timeRange);
        if (isMounted) {
          setEvents(data);
        }
      } catch (err) {
        console.error('Failed to load resonant quote events:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  // Compute metrics from real events and viewsLogs
  const analytics: ResonantQuotesAnalytics = useMemo(() => {
    return computeResonantQuoteMetrics(events, allArticles, viewsLogs);
  }, [events, allArticles, viewsLogs]);

  // Filtered Paragraphs based on search and category
  const filteredParagraphs = useMemo(() => {
    let list: ParagraphResonanceStats[] = [];

    if (activeTab === 'most-highlighted') {
      list = [...analytics.mostHighlightedParagraphs];
    } else if (activeTab === 'most-copied') {
      list = [...analytics.mostCopiedParagraphs];
    } else {
      list = [...analytics.paragraphRankings];
    }

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.articleTitle.toLowerCase().includes(q) ||
        p.contentBlockId.toLowerCase().includes(q) ||
        p.paragraphText.toLowerCase().includes(q)
      );
    }

    // Apply sorting
    list.sort((a, b) => {
      if (sortBy === 'highlights') return b.highlightCount - a.highlightCount;
      if (sortBy === 'copies') return b.copyCount - a.copyCount;
      if (sortBy === 'rate') return b.resonanceRate - a.resonanceRate;
      return b.totalInteractions - a.totalInteractions;
    });

    return list;
  }, [analytics, activeTab, selectedCategory, searchQuery, sortBy]);

  // Filtered Articles based on search and category
  const filteredArticles = useMemo(() => {
    let list = [...analytics.articleSummaries];
    if (selectedCategory !== 'all') {
      list = list.filter(a => a.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.articleTitle.toLowerCase().includes(q));
    }
    return list;
  }, [analytics.articleSummaries, selectedCategory, searchQuery]);

  // CSV Export Functionality
  const handleExportCSV = () => {
    if (analytics.paragraphRankings.length === 0) return;

    const headers = [
      'ContentBlockId',
      'ArticleId',
      'ArticleTitle',
      'Category',
      'Series',
      'ParagraphIndex',
      'Highlights',
      'Copies',
      'TotalInteractions',
      'UniqueSessions',
      'MeaningfulSessions',
      'ResonanceRatePercent',
      'ParagraphSnippet'
    ];

    const rows = analytics.paragraphRankings.map(p => [
      p.contentBlockId,
      p.articleId,
      `"${p.articleTitle.replace(/"/g, '""')}"`,
      p.category,
      p.seriesName ? `"${p.seriesName.replace(/"/g, '""')}"` : '',
      p.paragraphIndex >= 0 ? p.paragraphIndex + 1 : '',
      p.highlightCount,
      p.copyCount,
      p.totalInteractions,
      p.uniqueSessionCount,
      p.meaningfulArticleSessions,
      p.resonanceRate,
      `"${p.paragraphText.replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `the_oligarchy_resonant_quotes_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn text-paper select-text">
      
      {/* ══ 1. HEADER & METHODOLOGICAL CLARIFICATION BANNER ══ */}
      <div className="border border-paper/10 bg-navy/60 p-6 rounded-sm shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[10px] font-bold tracking-widest uppercase bg-blood/20 text-blood border border-blood/40 px-2.5 py-0.5 rounded-sm flex items-center gap-1.5">
                <Quote size={11} className="text-blood-light" />
                Resonance Signals &amp; Attention Telemetry
              </span>
              <span className="font-mono text-[10px] text-paper/40">Zero-PII DOM Telemetry</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-paper tracking-wide">
              Resonant Quotes &amp; Text Interaction Analysis
            </h2>
            <p className="font-serif text-xs md:text-sm text-paper/60 max-w-3xl leading-relaxed">
              Forensic identification of article paragraphs and arguments that readers deliberately highlight or copy.
              Provides editorial intelligence into focal thesis statements, memorable aphorisms, and contested premises.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Time Window Buttons */}
            <div className="flex items-center bg-midnight/80 border border-paper/15 rounded-xs p-1 gap-1">
              {(['today', '7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                    timeRange === range
                      ? 'bg-blood text-paper font-extrabold shadow-xs'
                      : 'text-paper/40 hover:text-paper hover:bg-paper/5'
                  }`}
                >
                  {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              disabled={!analytics.hasData}
              className="font-sans text-[10px] font-bold uppercase tracking-wider bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/80 px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="Export Resonant Quotes CSV"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Strict Methodological Framing Note */}
        <div className="mt-5 pt-4 border-t border-paper/10 flex items-start gap-3 bg-midnight/40 p-3.5 rounded-xs border-l-2 border-l-amber-500/80">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Methodological Notice: Text Interaction Signal vs. Agreement
            </h4>
            <p className="font-serif text-xs text-paper/65 leading-relaxed">
              This metric measures <strong className="text-paper">active text interaction</strong> (reader highlighting and clipboard copying), indicating focused attention, cognitive pausing, quotation utility, or debate. 
              <span className="italic text-paper/80"> It does not prove agreement, endorsement, or emotional resonance.</span> Readers frequently highlight provocative counter-arguments or contested claims as rigorously as agreed truths.
            </p>
          </div>
        </div>
      </div>

      {/* ══ 2. TOP-LEVEL METRIC KPI CARDS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Highlights */}
        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/50">
              Highlight Interactions
            </span>
            <span className="p-2 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Highlighter size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-extrabold text-paper tracking-tight">
              {loading ? '...' : analytics.totalHighlights.toLocaleString()}
            </div>
            <p className="font-serif text-[11px] text-paper/50 mt-1">
              Paragraph text selections $\ge 10$ chars inside essay body
            </p>
          </div>
        </div>

        {/* Total Copies */}
        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/50">
              Clipboard Copy Events
            </span>
            <span className="p-2 rounded-sm bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Copy size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-extrabold text-paper tracking-tight">
              {loading ? '...' : analytics.totalCopies.toLocaleString()}
            </div>
            <p className="font-serif text-[11px] text-paper/50 mt-1">
              Passages extracted to clipboard with 45s cooldown
            </p>
          </div>
        </div>

        {/* Unique Interacting Sessions */}
        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/50">
              Interacting Reader Sessions
            </span>
            <span className="p-2 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Users size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-extrabold text-paper tracking-tight">
              {loading ? '...' : analytics.uniqueInteractingSessions.toLocaleString()}
            </div>
            <p className="font-serif text-[11px] text-paper/50 mt-1">
              Distinct anonymous sessions engaging directly with text
            </p>
          </div>
        </div>

        {/* Overall Resonance Rate */}
        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/50">
              Text Resonance Rate
            </span>
            <span className="p-2 rounded-sm bg-blood/10 border border-blood/30 text-blood">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-extrabold text-paper tracking-tight flex items-baseline gap-1.5">
              <span>{loading ? '...' : `${analytics.overallResonanceRate}%`}</span>
              <span className="font-sans text-[11px] font-normal text-paper/40">of meaningful reads</span>
            </div>
            <p className="font-serif text-[11px] text-paper/50 mt-1">
              Denominator: {analytics.totalMeaningfulSessions.toLocaleString()} sessions with active read &ge; 30s
            </p>
          </div>
        </div>
      </div>

      {/* ══ 3. NAVIGATION VIEW TABS & CONTROLS ══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-paper/10 pb-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'most-highlighted', label: 'Most-Highlighted', icon: Highlighter },
            { id: 'most-copied', label: 'Most-Copied', icon: Copy },
            { id: 'all-paragraphs', label: 'All Text Blocks', icon: FileText },
            { id: 'articles', label: 'Article Rankings', icon: Compass },
            { id: 'domains', label: 'Domain & Series', icon: Layers },
            { id: 'audit', label: 'Telemetry Stream', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ResonantViewTab)}
                className={`font-sans text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blood text-paper shadow-xs border border-blood'
                    : 'bg-paper/5 hover:bg-paper/10 text-paper/60 hover:text-paper border border-paper/10'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dimensional Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-paper/40" />
            <input
              type="text"
              placeholder="Search passage or article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-midnight border border-paper/15 rounded-xs pl-8 pr-3 py-1.5 text-xs text-paper placeholder-paper/30 focus:outline-none focus:border-blood"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-midnight border border-paper/15 rounded-xs px-2.5 py-1.5 text-xs text-paper focus:outline-none focus:border-blood font-sans uppercase tracking-wider"
          >
            <option value="all">All Disciplines</option>
            <option value="criminology">Criminology</option>
            <option value="psyche">Psychology</option>
            <option value="politics">Politics</option>
          </select>

          {/* Sort By (for paragraph tabs) */}
          {(activeTab === 'most-highlighted' || activeTab === 'most-copied' || activeTab === 'all-paragraphs') && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-midnight border border-paper/15 rounded-xs px-2.5 py-1.5 text-xs text-paper focus:outline-none focus:border-blood font-sans uppercase tracking-wider"
            >
              <option value="interactions">Sort: Total Hits</option>
              <option value="highlights">Sort: Highlights</option>
              <option value="copies">Sort: Copies</option>
              <option value="rate">Sort: Resonance Rate</option>
            </select>
          )}
        </div>
      </div>

      {/* ══ 4. MAIN CONTENT VIEW CONTROLLERS ══ */}
      {loading ? (
        <div className="py-20 text-center border border-paper/10 rounded-sm bg-navy/30">
          <span className="inline-block animate-spin border-2 border-paper/20 border-t-blood rounded-full w-7 h-7 mb-3" />
          <p className="font-serif text-sm text-paper/50">Aggregating real text interaction telemetry...</p>
        </div>
      ) : !analytics.hasData ? (
        /* Zero Fabrication Empty State */
        <div className="py-16 px-6 text-center border border-paper/10 rounded-sm bg-navy/20 max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-paper/5 border border-paper/10 flex items-center justify-center mx-auto text-paper/40">
            <Quote size={20} />
          </div>
          <h3 className="font-display text-xl font-bold text-paper">No text interaction data yet</h3>
          <p className="font-serif text-xs md:text-sm text-paper/50 leading-relaxed max-w-lg mx-auto">
            Readers have not yet highlighted or copied passages within the selected timeframe. 
            Telemetry strictly records genuine user interactions with article prose ($&ge; 10$ characters).
          </p>
          <div className="inline-block font-mono text-[10px] text-paper/40 bg-midnight px-3 py-1.5 rounded-sm border border-paper/10">
            Awaiting browser selection and copy events in article bodies
          </div>
        </div>
      ) : (
        <>
          {/* ── VIEW TAB: PARAGRAPHS (Most-Highlighted, Most-Copied, All Blocks) ── */}
          {(activeTab === 'most-highlighted' || activeTab === 'most-copied' || activeTab === 'all-paragraphs') && (
            <div className="space-y-4">
              {filteredParagraphs.length === 0 ? (
                <div className="py-12 text-center border border-paper/10 rounded-sm bg-navy/20">
                  <p className="font-serif text-xs text-paper/40 italic">
                    Insufficient data for ranking under current filters. Try changing discipline or search terms.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredParagraphs.map((para, idx) => {
                    const isExpanded = expandedParagraphId === para.contentBlockId;
                    return (
                      <div
                        key={`${para.articleId}-${para.contentBlockId}`}
                        className="bg-navy border border-paper/10 hover:border-paper/25 rounded-sm p-5 transition-all shadow-sm group"
                      >
                        {/* Upper Meta Bar */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-paper/5 pb-3 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Rank Badge */}
                            <span className="font-mono text-[10px] font-bold bg-blood/20 text-blood border border-blood/40 px-2 py-0.5 rounded-xs">
                              #{idx + 1}
                            </span>

                            {/* Block ID */}
                            <span className="font-mono text-[10px] bg-midnight border border-paper/15 text-paper/70 px-2 py-0.5 rounded-xs" title="Deterministic stable content block hash">
                              {para.paragraphIndex >= 0 ? `¶ ${para.paragraphIndex + 1} · ` : ''}{para.contentBlockId}
                            </span>

                            {/* Category */}
                            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40 bg-paper/5 px-2 py-0.5 rounded-xs">
                              {para.category}
                            </span>

                            {/* Article Title */}
                            <span className="font-display text-xs md:text-sm font-bold text-paper/90 truncate max-w-xs md:max-w-md">
                              {para.articleTitle}
                            </span>
                          </div>

                          {/* Stat Pills */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Highlights */}
                            <div className="flex items-center gap-1 font-mono text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-xs" title="Total Highlight interactions">
                              <Highlighter size={11} />
                              <span>{para.highlightCount}</span>
                            </div>

                            {/* Copies */}
                            <div className="flex items-center gap-1 font-mono text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-xs" title="Total Copy events">
                              <Copy size={11} />
                              <span>{para.copyCount}</span>
                            </div>

                            {/* Unique Sessions */}
                            <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-xs" title="Unique reader sessions interacting with this block">
                              <Users size={11} />
                              <span>{para.uniqueSessionCount}</span>
                            </div>

                            {/* Resonance Rate */}
                            <div className="flex items-center gap-1 font-mono text-[11px] text-paper font-bold bg-blood/30 border border-blood/50 px-2 py-0.5 rounded-xs" title="Resonance Rate: unique interacting sessions / meaningful article sessions * 100">
                              <span>{para.resonanceRate}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Resolved Paragraph Text */}
                        <div className="relative pl-4 border-l-2 border-blood/60 my-2">
                          <p className={`font-serif text-xs md:text-sm text-paper/85 leading-relaxed italic ${!isExpanded && para.paragraphText.length > 280 ? 'line-clamp-3' : ''}`}>
                            &ldquo;{para.paragraphText}&rdquo;
                          </p>
                          {para.paragraphText.length > 280 && (
                            <button
                              onClick={() => setExpandedParagraphId(isExpanded ? null : para.contentBlockId)}
                              className="font-sans text-[9px] uppercase font-bold tracking-wider text-blood hover:underline mt-1.5 cursor-pointer inline-block"
                            >
                              {isExpanded ? 'Collapse excerpt' : 'Read full passage'}
                            </button>
                          )}
                        </div>

                        {/* Lower Intelligence Bar */}
                        <div className="flex flex-wrap justify-between items-center gap-2 pt-3 mt-3 border-t border-paper/5 font-sans text-[10px] text-paper/40">
                          <div className="flex items-center gap-3">
                            <span>Tag: <code className="font-mono text-paper/60">&lt;{para.tagName}&gt;</code></span>
                            {para.seriesName && (
                              <span>Series: <strong className="text-paper/60">{para.seriesName}</strong></span>
                            )}
                          </div>
                          <div>
                            Meaningful Article Readers: <strong className="text-paper/70 font-mono">{para.meaningfulArticleSessions}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── VIEW TAB: ARTICLE RANKINGS ── */}
          {activeTab === 'articles' && (
            <div className="border border-paper/10 rounded-sm bg-navy overflow-hidden shadow-sm">
              <div className="p-4 border-b border-paper/10 bg-midnight/60 flex justify-between items-center">
                <div>
                  <h3 className="font-display text-sm font-bold text-paper">Article-Level Text Resonance</h3>
                  <p className="font-serif text-xs text-paper/50">Comparative attention capture across published investigations.</p>
                </div>
                <span className="font-mono text-[10px] text-paper/40">{filteredArticles.length} Articles with Telemetry</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-paper/10 bg-paper/[0.02] text-paper/50 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-3 pl-4">Investigation Title</th>
                      <th className="p-3">Discipline</th>
                      <th className="p-3 text-right">Highlights</th>
                      <th className="p-3 text-right">Copies</th>
                      <th className="p-3 text-right">Total Hits</th>
                      <th className="p-3 text-right">Unique Sessions</th>
                      <th className="p-3 text-right">Meaningful Sessions</th>
                      <th className="p-3 text-right pr-4">Resonance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper/5">
                    {filteredArticles.map((art) => (
                      <tr key={art.articleId} className="hover:bg-paper/[0.02] transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-display text-xs md:text-sm font-bold text-paper">
                            {art.articleTitle}
                          </div>
                          {art.seriesName && (
                            <div className="font-serif text-[10px] text-paper/40 italic">
                              Series: {art.seriesName}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-sans text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-xs bg-paper/5 border border-paper/10 text-paper/60">
                            {art.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-amber-300">
                          {art.highlightCount}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-300">
                          {art.copyCount}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-paper">
                          {art.totalInteractions}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-300">
                          {art.uniqueSessions}
                        </td>
                        <td className="p-3 text-right font-mono text-paper/50">
                          {art.meaningfulSessions}
                        </td>
                        <td className="p-3 text-right pr-4 font-mono font-bold text-blood-light">
                          {art.resonanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── VIEW TAB: DOMAINS & SERIES BREAKDOWN ── */}
          {activeTab === 'domains' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="border border-paper/10 rounded-sm bg-navy p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-paper/10 pb-3">
                  <Layers size={14} className="text-blood" />
                  <h3 className="font-display text-sm font-bold text-paper uppercase tracking-wider">
                    Disciplinary Domain Distribution
                  </h3>
                </div>

                <div className="space-y-3">
                  {analytics.categorySummaries.map((cat) => {
                    const pct = analytics.totalInteractions > 0 
                      ? Math.round((cat.totalInteractions / analytics.totalInteractions) * 100) 
                      : 0;
                    return (
                      <div key={cat.category} className="bg-midnight/60 border border-paper/10 p-3.5 rounded-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-sans text-xs font-bold uppercase tracking-wider text-paper/90">
                            {cat.category}
                          </span>
                          <span className="font-mono text-xs font-bold text-blood-light">
                            {cat.totalInteractions} hits ({pct}%)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-paper/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blood to-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-sans text-paper/40 pt-1">
                          <span>Highlights: <strong className="font-mono text-amber-300">{cat.highlightCount}</strong></span>
                          <span>Copies: <strong className="font-mono text-blue-300">{cat.copyCount}</strong></span>
                          <span>Unique Readers: <strong className="font-mono text-emerald-300">{cat.uniqueSessions}</strong></span>
                          <span>Papers: <strong className="font-mono text-paper/60">{cat.articleCount}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Series Breakdown */}
              <div className="border border-paper/10 rounded-sm bg-navy p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-paper/10 pb-3">
                  <Compass size={14} className="text-emerald-400" />
                  <h3 className="font-display text-sm font-bold text-paper uppercase tracking-wider">
                    Investigative Series Continuity
                  </h3>
                </div>

                {analytics.seriesSummaries.length === 0 ? (
                  <div className="py-8 text-center text-paper/40 font-serif text-xs italic">
                    No series-linked articles with text interaction data in this timeframe.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.seriesSummaries.map((ser) => (
                      <div key={ser.seriesName} className="bg-midnight/60 border border-paper/10 p-3.5 rounded-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-sans text-xs font-bold text-paper">
                            {ser.seriesName}
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {ser.totalInteractions} hits
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-sans text-paper/40 pt-1">
                          <span>Highlights: <strong className="font-mono text-amber-300">{ser.highlightCount}</strong></span>
                          <span>Copies: <strong className="font-mono text-blue-300">{ser.copyCount}</strong></span>
                          <span>Unique Readers: <strong className="font-mono text-emerald-300">{ser.uniqueSessions}</strong></span>
                          <span>Chapters: <strong className="font-mono text-paper/60">{ser.articleCount}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VIEW TAB: LIVE RAW AUDIT LOG ── */}
          {activeTab === 'audit' && (
            <div className="border border-paper/10 rounded-sm bg-navy overflow-hidden shadow-sm">
              <div className="p-4 border-b border-paper/10 bg-midnight/60 flex justify-between items-center">
                <div>
                  <h3 className="font-display text-sm font-bold text-paper">Recent Interaction Events Stream</h3>
                  <p className="font-serif text-xs text-paper/50">Raw audit log demonstrating zero PII collection and deterministic mapping.</p>
                </div>
                <span className="font-mono text-[10px] text-paper/40">Last {Math.min(events.length, 50)} Events</span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-paper/10 bg-paper/[0.02] text-paper/50 font-semibold uppercase text-[10px] tracking-wider sticky top-0 bg-navy z-10">
                      <th className="p-3 pl-4">Timestamp</th>
                      <th className="p-3">Interaction</th>
                      <th className="p-3">Content Block ID</th>
                      <th className="p-3">Article</th>
                      <th className="p-3">Session Hash</th>
                      <th className="p-3 pr-4">Revision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper/5 font-mono text-[11px]">
                    {events.slice(0, 50).map((ev) => (
                      <tr key={ev.id || `${ev.sessionId}-${ev.timestamp}`} className="hover:bg-paper/[0.02]">
                        <td className="p-3 pl-4 text-paper/60">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3">
                          {ev.interactionType === 'highlight' ? (
                            <span className="inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <Highlighter size={9} /> Highlight
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-blue-500/10 text-blue-300 border border-blue-500/30">
                              <Copy size={9} /> Copy
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-paper/90">
                          {ev.contentBlockId}
                        </td>
                        <td className="p-3 font-sans text-xs text-paper/80 truncate max-w-xs">
                          {ev.articleTitle || ev.articleId}
                        </td>
                        <td className="p-3 text-paper/40">
                          {ev.sessionId.slice(0, 12)}...
                        </td>
                        <td className="p-3 pr-4 text-paper/40 text-[10px]">
                          {ev.pageVersion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ 5. PRIVACY & TELEMETRY PROTOCOL COMPLIANCE FOOTNOTE ══ */}
          <div className="border border-paper/10 bg-midnight/60 p-4 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-sans text-[11px] text-paper/50">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>Privacy Protocol Active:</strong> Zero selected text or clipboard payloads are captured. Events map strictly to anonymous content-block hashes.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-paper/40">
              <span>Debounce: 700ms</span>
              <span>•</span>
              <span>Min Length: 10 chars</span>
              <span>•</span>
              <span>Cooldown: 45s</span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
