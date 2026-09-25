import React from 'react';
import { Article, AuthorProfile, ReadingItem } from '../types';
import { 
  FileText, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Star, 
  Mail, 
  BookOpen, 
  Plus, 
  ArrowRight, 
  Edit3, 
  ShieldCheck, 
  Database, 
  Image as ImageIcon,
  TrendingUp,
  Layers
} from 'lucide-react';

interface AdminDashboardOverviewProps {
  articles: Article[];
  subscribersCount: number;
  readingItems: ReadingItem[];
  contributors: AuthorProfile[];
  onNavigateTab: (tab: any) => void;
  onFilterArticles: (status: 'all' | 'published' | 'draft' | 'scheduled' | 'archived') => void;
  onEditArticle: (article: Article) => void;
  onPreviewArticle: (article: Article) => void;
  onComposeNew: () => void;
}

export default function AdminDashboardOverview({
  articles,
  subscribersCount,
  readingItems,
  contributors,
  onNavigateTab,
  onFilterArticles,
  onEditArticle,
  onPreviewArticle,
  onComposeNew
}: AdminDashboardOverviewProps) {
  // Operational metrics calculated strictly from real database entities
  const totalArticles = articles.length;
  const publishedArticles = articles.filter(a => a.status === 'published');
  const draftArticles = articles.filter(a => a.status === 'draft');
  const scheduledArticles = articles.filter(a => a.status === 'scheduled');
  const archivedArticles = articles.filter(a => a.status === 'archived');
  const featuredArticles = articles.filter(a => a.isFeatured);
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);

  // Recent 5 articles by publication / creation date
  const recentArticles = [...articles]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  // Recently updated articles
  const recentlyUpdatedArticles = [...articles]
    .filter(a => a.updatedAt)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 5);

  const formatDate = (timestamp?: number, fallbackStr?: string) => {
    if (fallbackStr) return fallbackStr;
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col gap-8 fade-in select-text">
      {/* Top Welcome & Operational Status */}
      <div className="bg-gradient-to-r from-ink via-navy to-ink border border-paper/10 p-6 rounded-sm shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-xs flex items-center gap-1">
              <ShieldCheck size={11} className="text-blood" />
              Owner Executive Console
            </span>
            <span className="font-sans text-[9px] text-paper/40 tracking-wider uppercase">
              The Oligarchy • Priyasha Priyal Jena
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-paper">
            Editorial Command Dashboard
          </h1>
          <p className="font-serif text-xs text-paper/60 mt-1 max-w-2xl leading-relaxed">
            Real-time overview of publication corpus, readership volume, newsletter subscribers, and upcoming scheduled research investigations.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onComposeNew}
            className="bg-blood hover:bg-blood/90 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-sm flex items-center gap-2 cursor-pointer shadow-md transition-all border border-blood/50"
          >
            <Plus size={13} />
            Write Article
          </button>
          <button
            onClick={() => onNavigateTab('featured')}
            className="bg-navy hover:bg-navy/80 border border-paper/15 text-paper font-sans text-[10px] font-semibold tracking-wider uppercase py-2.5 px-3 rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Star size={12} className="text-amber-400 fill-amber-400/20" />
            Featured
          </button>
          <button
            onClick={() => onNavigateTab('subscribers')}
            className="bg-navy hover:bg-navy/80 border border-paper/15 text-paper font-sans text-[10px] font-semibold tracking-wider uppercase py-2.5 px-3 rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Mail size={12} className="text-paper/60" />
            Subscribers
          </button>
        </div>
      </div>

      {/* Operational KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Articles */}
        <div 
          onClick={() => {
            onFilterArticles('all');
            onNavigateTab('articles');
          }}
          className="bg-navy border border-paper/10 hover:border-paper/30 p-4 rounded-sm flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-1px] group"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40 group-hover:text-paper/70">
              Total Corpus
            </span>
            <FileText size={14} className="text-paper/30 group-hover:text-paper" />
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold text-paper block">
              {totalArticles}
            </span>
            <span className="font-sans text-[8px] text-paper/40 uppercase tracking-widest mt-0.5 block">
              Manuscripts
            </span>
          </div>
        </div>

        {/* Published */}
        <div 
          onClick={() => {
            onFilterArticles('published');
            onNavigateTab('articles');
          }}
          className="bg-navy border border-green-900/30 hover:border-green-500/50 p-4 rounded-sm flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-1px] group"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#8bc4a8] group-hover:text-green-300">
              Live Published
            </span>
            <CheckCircle2 size={14} className="text-[#8bc4a8]" />
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold text-[#8bc4a8] block">
              {publishedArticles.length}
            </span>
            <span className="font-sans text-[8px] text-[#8bc4a8]/60 uppercase tracking-widest mt-0.5 block">
              Public Treatises
            </span>
          </div>
        </div>

        {/* Drafts */}
        <div 
          onClick={() => {
            onFilterArticles('draft');
            onNavigateTab('articles');
          }}
          className="bg-navy border border-yellow-900/30 hover:border-yellow-500/50 p-4 rounded-sm flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-1px] group"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-yellow-500 group-hover:text-yellow-400">
              Drafts
            </span>
            <Clock size={14} className="text-yellow-500" />
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold text-yellow-400 block">
              {draftArticles.length}
            </span>
            <span className="font-sans text-[8px] text-yellow-500/60 uppercase tracking-widest mt-0.5 block">
              In Progress
            </span>
          </div>
        </div>

        {/* Scheduled */}
        <div 
          onClick={() => {
            onFilterArticles('scheduled');
            onNavigateTab('articles');
          }}
          className="bg-navy border border-blue-900/30 hover:border-blue-500/50 p-4 rounded-sm flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-1px] group"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-300">
              Scheduled
            </span>
            <Calendar size={14} className="text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold text-blue-300 block">
              {scheduledArticles.length}
            </span>
            <span className="font-sans text-[8px] text-blue-400/60 uppercase tracking-widest mt-0.5 block">
              Pending Release
            </span>
          </div>
        </div>

        {/* Featured Pins */}
        <div 
          onClick={() => onNavigateTab('featured')}
          className="bg-navy border border-blood/30 hover:border-blood/60 p-4 rounded-sm flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-1px] group"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-blood group-hover:text-blood-light">
              Featured Slots
            </span>
            <Star size={14} className="text-blood fill-blood/20" />
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold text-paper block">
              {featuredArticles.length} / 3
            </span>
            <span className="font-sans text-[8px] text-paper/40 uppercase tracking-widest mt-0.5 block">
              Homepage Curated
            </span>
          </div>
        </div>

        {/* Subscribers */}
        <div 
          onClick={() => onNavigateTab('subscribers')}
          className="bg-navy border border-paper/10 hover:border-paper/30 p-4 rounded-sm flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-1px] group"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40 group-hover:text-paper/70">
              Subscribers
            </span>
            <Mail size={14} className="text-paper/30 group-hover:text-paper" />
          </div>
          <div className="mt-3">
            <span className="font-display text-2xl font-bold text-paper block">
              {subscribersCount}
            </span>
            <span className="font-sans text-[8px] text-paper/40 uppercase tracking-widest mt-0.5 block">
              Mailing List
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-ink border border-paper/10 p-3.5 rounded-sm flex items-center gap-3">
          <div className="p-2 bg-paper/5 border border-paper/10 rounded-xs text-blood">
            <Eye size={16} />
          </div>
          <div>
            <span className="font-mono text-base font-bold text-paper block">
              {totalViews.toLocaleString()}
            </span>
            <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40">
              Cumulative Article Reads
            </span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('reading')}
          className="bg-ink border border-paper/10 hover:border-paper/20 p-3.5 rounded-sm flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="p-2 bg-paper/5 border border-paper/10 rounded-xs text-amber-400">
            <BookOpen size={16} />
          </div>
          <div>
            <span className="font-mono text-base font-bold text-paper block">
              {readingItems.length}
            </span>
            <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40">
              Reading Stack Volumes
            </span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('authors')}
          className="bg-ink border border-paper/10 hover:border-paper/20 p-3.5 rounded-sm flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="p-2 bg-paper/5 border border-paper/10 rounded-xs text-blue-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <span className="font-mono text-base font-bold text-paper block">
              1 Founder (Priyasha Priyal Jena)
            </span>
            <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40">
              Single-Owner Publication
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Operational Views */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Articles (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-paper/10">
            <div>
              <h2 className="font-display text-base font-bold text-paper">
                Recent Publication Manuscripts
              </h2>
              <p className="font-serif text-[11px] text-paper/45">
                Latest analytical treatises and investigations in repository
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('articles')}
              className="font-sans text-[9px] uppercase tracking-wider text-blood hover:text-blood-light flex items-center gap-1 cursor-pointer font-bold"
            >
              All Articles <ArrowRight size={11} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {recentArticles.length === 0 ? (
              <div className="p-8 text-center bg-navy/40 border border-paper/10 rounded-sm">
                <p className="font-serif text-xs text-paper/50 italic">No articles found in database.</p>
              </div>
            ) : (
              recentArticles.map(art => (
                <div
                  key={art.id}
                  className="bg-navy border border-paper/10 hover:border-paper/25 p-3.5 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/50 bg-paper/5 border border-paper/10 px-1.5 py-0.2 rounded-xs">
                        {art.category}
                      </span>
                      <span className={`font-sans text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded-xs border ${
                        art.status === 'published' 
                          ? 'bg-green-950/20 text-[#8bc4a8] border-green-800/30'
                          : art.status === 'scheduled'
                          ? 'bg-blue-950/20 text-blue-300 border-blue-800/30'
                          : 'bg-yellow-950/20 text-yellow-500 border-yellow-800/30'
                      }`}>
                        {art.status}
                      </span>
                      {art.isFeatured && (
                        <span className="font-sans text-[8px] font-bold uppercase tracking-widest bg-blood/20 text-paper border border-blood/40 px-1.5 py-0.2 rounded-xs flex items-center gap-1">
                          <Star size={8} className="text-blood fill-blood" /> Slot {art.featuredOrder || 1}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-sm font-bold text-paper truncate group-hover:text-blood-light transition-colors">
                      {art.title}
                    </h3>
                    <p className="font-serif text-[10px] text-paper/40 mt-0.5">
                      By {art.authorName || 'Priyasha Priyal Jena'} • {formatDate(art.createdAt, art.originalPublishedAt || art.publishDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onPreviewArticle(art)}
                      className="p-1.5 border border-paper/10 hover:border-paper/30 text-paper/50 hover:text-paper rounded-xs transition-colors cursor-pointer text-xs"
                      title="Preview Article"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => onEditArticle(art)}
                      className="p-1.5 border border-paper/10 hover:border-blood text-paper/50 hover:text-blood rounded-xs transition-colors cursor-pointer text-xs"
                      title="Edit Manuscript"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recently Updated & Quick Tools (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Recently Updated */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-paper/10">
              <h2 className="font-display text-base font-bold text-paper">
                Recently Updated
              </h2>
              <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                Latest Saves
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {recentlyUpdatedArticles.length === 0 ? (
                <div className="p-4 text-center bg-navy/30 border border-paper/10 rounded-sm">
                  <p className="font-serif text-xs text-paper/40 italic">No recent updates recorded.</p>
                </div>
              ) : (
                recentlyUpdatedArticles.map(art => (
                  <div
                    key={art.id}
                    onClick={() => onEditArticle(art)}
                    className="p-2.5 bg-navy/60 hover:bg-navy border border-paper/10 hover:border-paper/25 rounded-sm flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <h4 className="font-display text-xs font-semibold text-paper truncate">
                        {art.title}
                      </h4>
                      <span className="font-mono text-[9px] text-paper/40 block mt-0.5">
                        {art.updatedAt ? new Date(art.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(art.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                      </span>
                    </div>
                    <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-blood bg-blood/10 px-1.5 py-0.5 rounded-xs shrink-0">
                      Edit
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Access Tools */}
          <div className="bg-navy border border-paper/10 p-4 rounded-sm flex flex-col gap-3">
            <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-paper/40 border-b border-paper/5 pb-2 block">
              Editorial Workspaces
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigateTab('media')}
                className="p-2.5 bg-ink border border-paper/10 hover:border-paper/30 rounded-xs flex items-center gap-2 text-left cursor-pointer transition-colors"
              >
                <ImageIcon size={14} className="text-paper/60 shrink-0" />
                <div>
                  <span className="font-sans text-[10px] font-bold uppercase text-paper block">Media Library</span>
                  <span className="font-serif text-[8px] text-paper/40">Covers &amp; Assets</span>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('pitches')}
                className="p-2.5 bg-ink border border-paper/10 hover:border-paper/30 rounded-xs flex items-center gap-2 text-left cursor-pointer transition-colors"
              >
                <Layers size={14} className="text-amber-400 shrink-0" />
                <div>
                  <span className="font-sans text-[10px] font-bold uppercase text-paper block">Review Queue</span>
                  <span className="font-serif text-[8px] text-paper/40">Pitches &amp; Papers</span>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('analytics')}
                className="p-2.5 bg-ink border border-paper/10 hover:border-paper/30 rounded-xs flex items-center gap-2 text-left cursor-pointer transition-colors"
              >
                <TrendingUp size={14} className="text-[#8bc4a8] shrink-0" />
                <div>
                  <span className="font-sans text-[10px] font-bold uppercase text-paper block">Analytics</span>
                  <span className="font-serif text-[8px] text-paper/40">Audience Traffic</span>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('site_content')}
                className="p-2.5 bg-ink border border-paper/10 hover:border-paper/30 rounded-xs flex items-center gap-2 text-left cursor-pointer transition-colors"
              >
                <Database size={14} className="text-blue-400 shrink-0" />
                <div>
                  <span className="font-sans text-[10px] font-bold uppercase text-paper block">Site CMS</span>
                  <span className="font-serif text-[8px] text-paper/40">About &amp; Principles</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
