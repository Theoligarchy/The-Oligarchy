import React, { useState } from 'react';
import { 
  Bookmark, 
  BookmarkCheck, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  FileText, 
  Download, 
  Search, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  FileSpreadsheet, 
  StickyNote, 
  Share2, 
  Calendar, 
  Eye, 
  RotateCcw,
  Check
} from 'lucide-react';
import { Article, SavedArticle } from '../types';
import ShareMenu from './ShareMenu';
import { motion, AnimatePresence } from 'motion/react';

interface ReadingListDashboardProps {
  savedArticles: SavedArticle[];
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onRemoveSaved: (articleId: string) => void;
  onToggleRead: (articleId: string, currentReadStatus: boolean) => void;
  onUpdateNote: (articleId: string, note: string) => void;
  onBrowseResearch: () => void;
}

export default function ReadingListDashboard({
  savedArticles,
  articles,
  onSelectArticle,
  onRemoveSaved,
  onToggleRead,
  onUpdateNote,
  onBrowseResearch
}: ReadingListDashboardProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInputText, setNoteInputText] = useState('');
  const [savedNoteSuccessId, setSavedNoteSuccessId] = useState<string | null>(null);

  // Calculate statistics
  const totalSaved = savedArticles.length;
  const readCount = savedArticles.filter(a => a.isRead).length;
  const unreadCount = totalSaved - readCount;

  // Calculate total reading time
  const totalMinutes = savedArticles.reduce((acc, curr) => {
    const match = curr.readTime?.match(/(\d+)/);
    const mins = match ? parseInt(match[1], 10) : 5;
    return acc + mins;
  }, 0);

  // Filter list
  const filteredArticles = savedArticles.filter(item => {
    // Filter tab
    if (filterTab === 'unread' && item.isRead) return false;
    if (filterTab === 'read' && !item.isRead) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchAuthor = item.authorName.toLowerCase().includes(q);
      const matchNote = item.personalNote?.toLowerCase().includes(q);
      const matchExcerpt = item.excerpt.toLowerCase().includes(q);
      return matchTitle || matchCategory || matchAuthor || matchNote || matchExcerpt;
    }

    return true;
  });

  const handleOpenNote = (item: SavedArticle) => {
    if (editingNoteId === item.articleId) {
      setEditingNoteId(null);
    } else {
      setEditingNoteId(item.articleId);
      setNoteInputText(item.personalNote || '');
    }
  };

  const handleSaveNote = (articleId: string) => {
    onUpdateNote(articleId, noteInputText);
    setSavedNoteSuccessId(articleId);
    setTimeout(() => {
      setSavedNoteSuccessId(null);
    }, 2500);
  };

  const handleExportList = () => {
    if (savedArticles.length === 0) return;
    
    let mdContent = `# The Oligarchy — Personal Saved Reading List\n`;
    mdContent += `Exported Date: ${new Date().toLocaleDateString()}\n`;
    mdContent += `Total Papers: ${savedArticles.length} | Completed: ${readCount} | Reading Time: ~${totalMinutes} mins\n\n`;
    mdContent += `---\n\n`;

    savedArticles.forEach((item, idx) => {
      mdContent += `### ${idx + 1}. ${item.title}\n`;
      mdContent += `**Author:** ${item.authorName} | **Category:** ${item.category} | **Read Time:** ${item.readTime}\n`;
      mdContent += `**Status:** ${item.isRead ? 'Completed [x]' : 'Unread [ ]'}\n`;
      if (item.excerpt) mdContent += `**Summary:** ${item.excerpt}\n`;
      if (item.personalNote) mdContent += `**Personal Scholar Notes:** ${item.personalNote}\n`;
      mdContent += `\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TheOligarchy_ReadingList_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-midnight py-12 md:py-16 px-4 sm:px-6 md:px-12 max-w-6xl mx-auto fade-in">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="font-sans text-[10px] font-bold tracking-[0.35em] uppercase text-blood mb-3 flex items-center justify-center gap-3">
          <span className="w-8 h-px bg-blood" />
          PERSONAL SCHOLAR REPOSITORY &amp; BOOKMARKS
          <span className="w-8 h-px bg-blood" />
        </div>
        
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-paper tracking-tight leading-tight">
          Saved Research Reading List
        </h1>
        
        <p className="font-serif text-sm sm:text-base text-paper/60 italic mt-4 leading-relaxed">
          Your persistent reading queue for criminology, behavioral psychology, and political power analyses. Saved across devices and browser sessions.
        </p>
      </div>

      {/* Metrics Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-paper/40 mb-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase">Total Saved</span>
            <Bookmark size={14} className="text-blood" />
          </div>
          <div className="font-display text-2xl font-extrabold text-paper">
            {totalSaved}
          </div>
          <span className="font-serif text-[11px] text-paper/40 italic mt-1">
            {totalSaved === 1 ? 'Paper bookmarked' : 'Papers bookmarked'}
          </span>
        </div>

        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-paper/40 mb-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase">Unread Queue</span>
            <BookOpen size={14} className="text-blood-light" />
          </div>
          <div className="font-display text-2xl font-extrabold text-blood-light">
            {unreadCount}
          </div>
          <span className="font-serif text-[11px] text-paper/40 italic mt-1">
            Awaiting analysis
          </span>
        </div>

        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-paper/40 mb-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase">Completed</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-extrabold text-emerald-400">
            {readCount}
          </div>
          <span className="font-serif text-[11px] text-paper/40 italic mt-1">
            {totalSaved > 0 ? `${Math.round((readCount / totalSaved) * 100)}% progress` : '0% progress'}
          </span>
        </div>

        <div className="bg-navy border border-paper/10 p-5 rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-paper/40 mb-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase">Total Read Time</span>
            <Clock size={14} className="text-paper/60" />
          </div>
          <div className="font-display text-2xl font-extrabold text-paper">
            ~{totalMinutes} <span className="text-xs font-normal text-paper/60">mins</span>
          </div>
          <span className="font-serif text-[11px] text-paper/40 italic mt-1">
            Estimated depth
          </span>
        </div>
      </div>

      {/* Toolbar: Filters, Search, Export */}
      <div className="bg-navy/80 border border-paper/10 p-4 rounded-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`font-sans text-[10px] font-bold tracking-widest uppercase px-3.5 py-2 rounded-xs border transition-colors cursor-pointer shrink-0 ${
              filterTab === 'all'
                ? 'bg-blood text-paper border-blood'
                : 'bg-paper/5 text-paper/60 border-paper/10 hover:text-paper hover:bg-paper/10'
            }`}
          >
            All Saved ({totalSaved})
          </button>

          <button
            onClick={() => setFilterTab('unread')}
            className={`font-sans text-[10px] font-bold tracking-widest uppercase px-3.5 py-2 rounded-xs border transition-colors cursor-pointer shrink-0 ${
              filterTab === 'unread'
                ? 'bg-blood text-paper border-blood'
                : 'bg-paper/5 text-paper/60 border-paper/10 hover:text-paper hover:bg-paper/10'
            }`}
          >
            Unread ({unreadCount})
          </button>

          <button
            onClick={() => setFilterTab('read')}
            className={`font-sans text-[10px] font-bold tracking-widest uppercase px-3.5 py-2 rounded-xs border transition-colors cursor-pointer shrink-0 ${
              filterTab === 'read'
                ? 'bg-blood text-paper border-blood'
                : 'bg-paper/5 text-paper/60 border-paper/10 hover:text-paper hover:bg-paper/10'
            }`}
          >
            Completed ({readCount})
          </button>
        </div>

        {/* Search Bar & Export */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved papers or notes..."
              className="w-full bg-midnight border border-paper/15 text-paper placeholder-paper/30 font-serif text-xs pl-9 pr-3 py-2 rounded-xs focus:outline-none focus:border-blood/60 transition-colors"
            />
          </div>

          <button
            onClick={handleExportList}
            disabled={totalSaved === 0}
            className="font-sans text-[10px] font-bold tracking-widest uppercase bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/80 hover:text-paper px-3.5 py-2 rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Export reading list as Markdown research document"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Saved Articles List */}
      {filteredArticles.length > 0 ? (
        <div className="space-y-6">
          {filteredArticles.map((item) => {
            // Find full article object if available in articles array
            const fullArticle = articles.find(a => a.id === item.articleId);

            return (
              <div 
                key={item.id}
                className={`bg-navy border transition-all duration-300 rounded-sm p-6 sm:p-8 relative ${
                  item.isRead 
                    ? 'border-paper/10 opacity-75 bg-navy/50' 
                    : 'border-paper/15 hover:border-blood/40 shadow-xl'
                }`}
              >
                {/* Header Meta */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Read Status Toggle Badge */}
                    <button
                      onClick={() => onToggleRead(item.articleId, item.isRead)}
                      className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
                        item.isRead 
                          ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950/40' 
                          : 'bg-blood/20 text-blood-light border-blood/30 hover:bg-blood/30'
                      }`}
                      title="Toggle read completion status"
                    >
                      {item.isRead ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Circle size={12} className="text-blood-light" />
                          Unread
                        </>
                      )}
                    </button>

                    <span className="font-sans text-[9px] font-bold tracking-widest uppercase bg-paper/5 border border-paper/10 text-paper/50 px-2.5 py-1 rounded-xs">
                      {item.category}
                    </span>

                    <span className="font-sans text-[10px] text-paper/40 flex items-center gap-1">
                      <Clock size={11} />
                      {item.readTime}
                    </span>

                    <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1">
                      <Calendar size={10} />
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveSaved(item.articleId)}
                    className="text-paper/40 hover:text-red-400 p-1.5 rounded-xs transition-colors cursor-pointer flex items-center gap-1 font-sans text-[10px] uppercase tracking-wider"
                    title="Remove paper from reading list"
                  >
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>

                {/* Article Title */}
                <h3 
                  onClick={() => {
                    if (fullArticle) onSelectArticle(fullArticle);
                  }}
                  className={`font-display text-xl sm:text-2xl font-bold transition-colors cursor-pointer mb-2 ${
                    item.isRead ? 'text-paper/60 line-through decoration-paper/30' : 'text-paper hover:text-blood-light'
                  }`}
                >
                  {item.title}
                </h3>

                {item.subtitle && (
                  <p className="font-display text-sm italic text-paper/50 mb-3">
                    {item.subtitle}
                  </p>
                )}

                {/* Excerpt */}
                <p className="font-serif text-sm text-paper/70 leading-relaxed mb-5 line-clamp-3">
                  {item.excerpt}
                </p>

                {/* Personal Notes / Marginalia Section */}
                {editingNoteId === item.articleId ? (
                  <div className="bg-midnight border border-paper/20 p-4 rounded-sm mb-5 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood flex items-center gap-1.5">
                        <StickyNote size={12} />
                        Personal Research Note / Scholar Marginalia
                      </label>
                      {savedNoteSuccessId === item.articleId && (
                        <span className="font-sans text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check size={12} /> Saved to Firestore
                        </span>
                      )}
                    </div>

                    <textarea
                      value={noteInputText}
                      onChange={(e) => setNoteInputText(e.target.value)}
                      placeholder="Add personal citations, critical analysis, key findings or questions on this research paper..."
                      className="w-full bg-navy border border-paper/15 text-paper placeholder-paper/30 font-serif text-xs p-3 rounded-xs h-24 focus:outline-none focus:border-blood/60 transition-colors resize-y"
                    />

                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="font-sans text-[10px] font-bold uppercase tracking-widest bg-paper/5 hover:bg-paper/10 border border-paper/10 text-paper/60 px-3 py-1.5 rounded-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNote(item.articleId)}
                        className="font-sans text-[10px] font-bold uppercase tracking-widest bg-blood hover:bg-blood-light text-paper px-4 py-1.5 rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                ) : item.personalNote ? (
                  <div className="bg-midnight/70 border border-paper/10 p-3.5 rounded-sm mb-5 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-blood flex items-center gap-1">
                        <StickyNote size={11} /> My Note:
                      </span>
                      <button
                        onClick={() => handleOpenNote(item)}
                        className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40 hover:text-paper cursor-pointer transition-colors"
                      >
                        Edit Note
                      </button>
                    </div>
                    <p className="font-serif text-xs text-paper/80 italic whitespace-pre-line leading-relaxed">
                      "{item.personalNote}"
                    </p>
                  </div>
                ) : null}

                {/* Footer Actions */}
                <div className="pt-4 border-t border-paper/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {/* Read Full Paper */}
                    <button
                      onClick={() => {
                        if (fullArticle) onSelectArticle(fullArticle);
                      }}
                      className="font-sans text-[10px] font-bold tracking-widest uppercase bg-blood hover:bg-blood-light text-paper py-2 px-4 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Read Full Analysis
                      <ArrowRight size={12} />
                    </button>

                    {/* PDF Download if available */}
                    {item.pdfLink && (
                      <a
                        href={item.pdfLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-[10px] font-bold tracking-widest uppercase bg-navy border border-paper/20 hover:border-blood text-paper/70 hover:text-paper py-2 px-3 rounded-sm flex items-center gap-1 transition-colors"
                        title="Download PDF report"
                      >
                        <FileText size={12} />
                        <span className="hidden sm:inline">PDF Report</span>
                      </a>
                    )}

                    {/* Add/Edit Note button if no note exists */}
                    {!item.personalNote && editingNoteId !== item.articleId && (
                      <button
                        onClick={() => handleOpenNote(item)}
                        className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/50 hover:text-paper bg-paper/5 hover:bg-paper/10 border border-paper/10 py-2 px-3 rounded-sm flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <StickyNote size={12} />
                        Add Note
                      </button>
                    )}
                  </div>

                  {/* Share widget */}
                  {fullArticle && (
                    <div className="relative">
                      <ShareMenu article={fullArticle} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-navy border border-paper/10 rounded-sm p-12 text-center max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 bg-blood/10 border border-blood/30 rounded-full flex items-center justify-center text-blood mx-auto mb-4">
            <Bookmark size={28} />
          </div>

          <h3 className="font-display text-2xl font-bold text-paper mb-2">
            {searchQuery.trim() ? 'No matching saved papers found' : 'Your Saved Reading Stack is Empty'}
          </h3>

          <p className="font-serif text-sm text-paper/60 leading-relaxed mb-6">
            {searchQuery.trim()
              ? `No papers in your saved reading list match "${searchQuery}". Try clearing search or searching a different term.`
              : 'Save research papers while browsing The Oligarchy to construct your personalized scholarly reading list. All saved items persist across devices and visits via Firestore.'}
          </p>

          <div className="flex justify-center gap-3">
            {searchQuery.trim() ? (
              <button
                onClick={() => setSearchQuery('')}
                className="font-sans text-[10px] font-bold tracking-widest uppercase bg-paper/10 hover:bg-paper/20 text-paper py-2.5 px-5 rounded-sm transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                onClick={onBrowseResearch}
                className="font-sans text-[10px] font-bold tracking-widest uppercase bg-blood hover:bg-blood-light text-paper py-3 px-6 rounded-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                Browse Research Papers
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
