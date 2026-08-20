import React, { useState, useEffect } from 'react';
import { 
  DraftInternalNote, 
  DraftNoteCategory, 
  DraftNoteUrgency, 
  DraftNoteStatus, 
  EditorialRole, 
  EditorialUser 
} from '../types';
import { 
  fetchDraftNotes, 
  createDraftNote, 
  addDraftNoteReply, 
  updateDraftNoteStatus, 
  deleteDraftNote,
  CATEGORY_LABELS 
} from '../lib/draftNotes';
import { 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Scale, 
  BookOpen, 
  Search, 
  GraduationCap, 
  FileText, 
  Send, 
  Plus, 
  Trash2, 
  CornerDownRight, 
  Check, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Filter,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DraftInternalNotesProps {
  articleId: string;
  articleTitle: string;
  currentUser: EditorialUser | null;
  currentUserRole: EditorialRole;
  onCountChange?: (openCount: number, resolvedCount: number) => void;
}

export default function DraftInternalNotes({
  articleId,
  articleTitle,
  currentUser,
  currentUserRole,
  onCountChange
}: DraftInternalNotesProps) {
  const [notes, setNotes] = useState<DraftInternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<DraftNoteCategory | 'all'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  
  // New Note Form State
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newCategory, setNewCategory] = useState<DraftNoteCategory>('fact_checking');
  const [newUrgency, setNewUrgency] = useState<DraftNoteUrgency>('moderate');
  const [newSectionName, setNewSectionName] = useState('');
  const [newReferencedSnippet, setNewReferencedSnippet] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply Form State
  const [activeReplyNoteId, setActiveReplyNoteId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Resolving Note Form State
  const [resolvingNoteId, setResolvingNoteId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const loadNotes = async () => {
    setLoading(true);
    try {
      const list = await fetchDraftNotes(articleId);
      setNotes(list);
      
      const openCount = list.filter(n => n.status !== 'resolved').length;
      const resolvedCount = list.filter(n => n.status === 'resolved').length;
      if (onCountChange) {
        onCountChange(openCount, resolvedCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (articleId) {
      loadNotes();
    }
  }, [articleId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const authorName = currentUser?.displayName || (currentUserRole === 'admin' ? 'Managing Editor' : currentUserRole === 'reviewer' ? 'Peer Reviewer' : 'Scholar Contributor');
      const authorEmail = currentUser?.email || 'editor@theoligarchy.in';

      await createDraftNote({
        articleId,
        articleTitle: articleTitle || 'Untitled Manuscript',
        category: newCategory,
        urgency: newUrgency,
        authorName,
        authorEmail,
        authorRole: currentUserRole,
        sectionName: newSectionName.trim() || undefined,
        referencedSnippet: newReferencedSnippet.trim() || undefined,
        content: newContent.trim()
      });

      setNewContent('');
      setNewSectionName('');
      setNewReferencedSnippet('');
      setIsAddingNote(false);
      await loadNotes();
    } catch (e) {
      console.error('Failed to create draft note:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (noteId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmittingReply(true);
    try {
      const authorName = currentUser?.displayName || (currentUserRole === 'admin' ? 'Managing Editor' : currentUserRole === 'reviewer' ? 'Peer Reviewer' : 'Scholar Contributor');
      const authorEmail = currentUser?.email || 'editor@theoligarchy.in';

      await addDraftNoteReply(noteId, {
        authorName,
        authorEmail,
        authorRole: currentUserRole,
        content: replyContent.trim()
      });

      setReplyContent('');
      setActiveReplyNoteId(null);
      await loadNotes();
    } catch (e) {
      console.error('Failed to add reply:', e);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleConfirmResolve = async (noteId: string) => {
    try {
      const authorName = currentUser?.displayName || (currentUserRole === 'admin' ? 'Managing Editor' : 'Editorial Staff');
      await updateDraftNoteStatus(noteId, 'resolved', authorName, resolutionText.trim() || 'Verified & cleared for publication');
      setResolvingNoteId(null);
      setResolutionText('');
      await loadNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReopenNote = async (noteId: string) => {
    try {
      await updateDraftNoteStatus(noteId, 'open');
      await loadNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteDraftNote(noteId);
      await loadNotes();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (activeCategoryFilter !== 'all' && n.category !== activeCategoryFilter) return false;
    if (activeStatusFilter === 'open' && n.status === 'resolved') return false;
    if (activeStatusFilter === 'resolved' && n.status !== 'resolved') return false;
    return true;
  });

  const openCount = notes.filter(n => n.status !== 'resolved').length;
  const resolvedCount = notes.filter(n => n.status === 'resolved').length;

  // Category counts
  const factCheckCount = notes.filter(n => n.category === 'fact_checking' && n.status !== 'resolved').length;
  const legalCount = notes.filter(n => n.category === 'legal_review' && n.status !== 'resolved').length;
  const citationCount = notes.filter(n => n.category === 'citation_validation' && n.status !== 'resolved').length;

  return (
    <div className="bg-navy border border-paper/15 rounded-sm overflow-hidden flex flex-col gap-0 shadow-lg">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ink via-navy to-ink p-5 border-b border-paper/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blood" />
            <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-blood">
              Collaborative Draft Governance &amp; Revision Thread
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-paper">
            Internal Editorial Notes &amp; Fact-Checking
          </h3>
          <p className="font-serif text-xs text-paper/50 max-w-xl">
            Pre-publication collaborative review: discuss factual verification, libel &amp; legal risks, DOI citation validity, and methodological rigor before final clearance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-sm flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            {isAddingNote ? <ChevronUp size={14} /> : <Plus size={14} />}
            {isAddingNote ? 'Close Form' : 'Add Revision Note'}
          </button>
        </div>
      </div>

      {/* Pre-Publication Clearance Status Bar */}
      <div className="bg-midnight/90 border-b border-paper/10 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-serif">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40 mr-1">
            Audit Clearance:
          </span>
          
          {/* Fact check status */}
          <span className={`px-2.5 py-1 rounded-xs border text-[10px] font-sans font-semibold flex items-center gap-1.5 ${
            factCheckCount === 0 
              ? 'bg-green-950/30 text-green-300 border-green-700/40' 
              : 'bg-amber-950/40 text-amber-300 border-amber-600/50'
          }`}>
            <Search size={11} />
            Fact-Check: {factCheckCount === 0 ? 'Cleared ✓' : `${factCheckCount} Pending`}
          </span>

          {/* Legal status */}
          <span className={`px-2.5 py-1 rounded-xs border text-[10px] font-sans font-semibold flex items-center gap-1.5 ${
            legalCount === 0 
              ? 'bg-green-950/30 text-green-300 border-green-700/40' 
              : 'bg-red-950/40 text-red-300 border-red-600/50'
          }`}>
            <Scale size={11} />
            Legal: {legalCount === 0 ? 'Cleared ✓' : `${legalCount} Flagged`}
          </span>

          {/* Citations status */}
          <span className={`px-2.5 py-1 rounded-xs border text-[10px] font-sans font-semibold flex items-center gap-1.5 ${
            citationCount === 0 
              ? 'bg-green-950/30 text-green-300 border-green-700/40' 
              : 'bg-blue-950/40 text-blue-300 border-blue-600/50'
          }`}>
            <BookOpen size={11} />
            Citations: {citationCount === 0 ? 'Validated ✓' : `${citationCount} In Review`}
          </span>
        </div>

        <div className="font-sans text-[9px] text-paper/40">
          <span className="text-paper/80 font-bold">{openCount}</span> open / <span className="text-green-400 font-bold">{resolvedCount}</span> resolved
        </div>
      </div>

      {/* New Note Form */}
      <AnimatePresence>
        {isAddingNote && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateNote}
            className="p-5 bg-midnight border-b border-paper/15 flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex justify-between items-center pb-2 border-b border-paper/10">
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80 flex items-center gap-2">
                <Plus size={12} className="text-blood" />
                Draft Manuscript Internal Note
              </span>
              <span className="font-sans text-[9px] text-paper/40">
                Author: <strong>{currentUser?.displayName || 'Editorial Staff'}</strong> ({currentUserRole})
              </span>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['fact_checking', 'legal_review', 'citation_validation', 'methodology', 'general'] as DraftNoteCategory[]).map((cat) => {
                const meta = CATEGORY_LABELS[cat];
                const selected = newCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`py-2 px-2.5 rounded-sm border text-left font-sans text-[9px] font-bold tracking-wider uppercase transition-all cursor-pointer flex flex-col gap-1 ${
                      selected 
                        ? 'bg-blood/20 border-blood text-paper ring-1 ring-blood' 
                        : 'bg-navy border-paper/10 text-paper/40 hover:border-paper/30'
                    }`}
                  >
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Urgency Selector & Section Anchor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40">
                  Urgency Level *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['critical', 'moderate', 'minor'] as DraftNoteUrgency[]).map((urg) => (
                    <button
                      key={urg}
                      type="button"
                      onClick={() => setNewUrgency(urg)}
                      className={`py-1.5 px-2 rounded-xs border text-center font-sans text-[8px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        newUrgency === urg
                          ? urg === 'critical' ? 'bg-red-950/40 text-red-300 border-red-500' : urg === 'moderate' ? 'bg-amber-950/40 text-amber-300 border-amber-500' : 'bg-blue-950/40 text-blue-300 border-blue-500'
                          : 'bg-navy border-paper/10 text-paper/40 hover:border-paper/30'
                      }`}
                    >
                      {urg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40">
                  Section / Paragraph Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paragraph 6 or Methodology: Subsection B"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="bg-navy border border-paper/15 text-paper p-2 rounded-sm focus:outline-none focus:border-blood font-serif text-xs"
                />
              </div>
            </div>

            {/* Quoted Text Excerpt */}
            <div className="flex flex-col gap-1">
              <label className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40 flex items-center gap-1">
                <Quote size={10} /> Quoted Text / Data Claim in Question (Optional)
              </label>
              <input
                type="text"
                placeholder="Paste the specific sentence, metric, or assertion being audited..."
                value={newReferencedSnippet}
                onChange={(e) => setNewReferencedSnippet(e.target.value)}
                className="bg-navy border border-paper/15 text-paper p-2 rounded-sm focus:outline-none focus:border-blood font-serif text-xs italic"
              />
            </div>

            {/* Note Content */}
            <div className="flex flex-col gap-1">
              <label className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40">
                Editorial Review Note &amp; Verification Guidance *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Specify the factual contradiction, legal exposure, or required primary literature DOI..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="bg-navy border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-paper/10">
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="font-sans text-[9px] font-bold uppercase tracking-wider px-3 py-2 border border-paper/15 text-paper/60 hover:text-paper rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blood hover:bg-blood-light disabled:opacity-50 text-paper font-sans text-[9px] font-bold uppercase tracking-wider px-5 py-2 rounded-sm cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? 'Posting Note...' : 'Publish Revision Note'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="p-3 bg-ink/70 border-b border-paper/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/30 mr-1 flex items-center gap-1">
            <Filter size={10} /> Filter:
          </span>
          {(['all', 'fact_checking', 'legal_review', 'citation_validation', 'methodology', 'general'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`font-sans text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                activeCategoryFilter === cat 
                  ? 'bg-paper/15 text-paper font-extrabold' 
                  : 'text-paper/40 hover:text-paper/70'
              }`}
            >
              {cat === 'all' ? 'All Categories' : CATEGORY_LABELS[cat]?.label.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'open', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatusFilter(st)}
              className={`font-sans text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs transition-colors cursor-pointer border ${
                activeStatusFilter === st
                  ? 'bg-blood/20 border-blood text-paper'
                  : 'border-transparent text-paper/40 hover:text-paper/70'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="p-5 flex flex-col gap-4 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-paper/40 font-serif text-xs italic">
            Loading internal revision notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2 border border-dashed border-paper/10 rounded-sm p-6">
            <CheckCircle2 size={24} className="text-green-400/60" />
            <span className="font-display text-base font-bold text-paper/80">No Open Revision Notes</span>
            <p className="font-serif text-xs text-paper/40 max-w-md text-center">
              All fact-checking, legal clearance, and citation validation checks are either resolved or no threads have been created yet.
            </p>
            <button
              onClick={() => setIsAddingNote(true)}
              className="mt-2 text-blood hover:text-blood-light font-sans text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add an Internal Check
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const meta = CATEGORY_LABELS[note.category] || CATEGORY_LABELS.general;
            const isResolved = note.status === 'resolved';

            return (
              <div 
                key={note.id}
                className={`border rounded-sm p-4.5 flex flex-col gap-3 transition-all ${
                  isResolved 
                    ? 'bg-navy/40 border-paper/10 opacity-75' 
                    : note.urgency === 'critical'
                    ? 'bg-red-950/15 border-red-800/40 shadow-xs'
                    : 'bg-navy/80 border-paper/15 shadow-sm'
                }`}
              >
                {/* Note Header */}
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-sans text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs border ${meta.badgeBg}`}>
                      {meta.label}
                    </span>

                    <span className={`font-sans text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-xs border ${
                      note.urgency === 'critical' ? 'bg-red-950/40 text-red-300 border-red-600/60' :
                      note.urgency === 'moderate' ? 'bg-amber-950/40 text-amber-300 border-amber-600/60' :
                      'bg-blue-950/40 text-blue-300 border-blue-600/60'
                    }`}>
                      {note.urgency} priority
                    </span>

                    {note.sectionName && (
                      <span className="font-mono text-[9px] text-paper/50 bg-paper/5 px-2 py-0.5 rounded-xs">
                        📍 {note.sectionName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-paper/30">
                      {new Date(note.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {currentUserRole === 'admin' && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-paper/20 hover:text-red-400 p-1 cursor-pointer transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Referenced Snippet */}
                {note.referencedSnippet && (
                  <div className="bg-midnight/80 border-l-2 border-blood p-2.5 rounded-r-xs font-serif text-xs text-paper/70 italic">
                    "{note.referencedSnippet}"
                  </div>
                )}

                {/* Note Content */}
                <p className="font-serif text-xs text-paper/90 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>

                {/* Author attribution */}
                <div className="flex items-center justify-between text-[10px] font-sans text-paper/40 pt-1 border-t border-paper/5">
                  <span className="flex items-center gap-1.5">
                    <strong className="text-paper/70">{note.authorName}</strong>
                    <span className="text-[8px] uppercase tracking-wider bg-paper/10 text-paper/60 px-1 py-0.2 rounded-xs">
                      {note.authorRole}
                    </span>
                  </span>

                  {/* Resolution badge / action */}
                  {isResolved ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-semibold flex items-center gap-1 text-[10px]">
                        <Check size={12} /> Resolved by {note.resolvedBy || 'Editor'}
                      </span>
                      <button
                        onClick={() => handleReopenNote(note.id)}
                        className="text-paper/30 hover:text-paper text-[8px] uppercase tracking-wider underline cursor-pointer"
                      >
                        Reopen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingNoteId(resolvingNoteId === note.id ? null : note.id)}
                      className="bg-green-950/40 hover:bg-green-900/60 text-green-300 border border-green-700/50 font-sans text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 size={10} /> Mark Cleared
                    </button>
                  )}
                </div>

                {/* Inline Resolve Note Form */}
                <AnimatePresence>
                  {resolvingNoteId === note.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-green-950/20 border border-green-700/40 p-3 rounded-sm flex flex-col gap-2 mt-1"
                    >
                      <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-green-300">
                        Resolution &amp; Verification Note
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Added SEC link, rephrased claim, and verified with primary court records..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        className="bg-midnight border border-paper/20 text-paper p-2 rounded-xs text-xs font-serif focus:outline-none focus:border-green-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setResolvingNoteId(null)}
                          className="font-sans text-[8px] uppercase tracking-wider px-2 py-1 text-paper/50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmResolve(note.id)}
                          className="bg-green-700 hover:bg-green-600 text-white font-sans text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded-xs cursor-pointer shadow-xs"
                        >
                          Confirm Clearance
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Resolution Summary Callout if resolved */}
                {isResolved && note.resolutionNote && (
                  <div className="bg-green-950/20 border border-green-800/30 p-2.5 rounded-xs font-serif text-[11px] text-green-200/90 flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-green-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Resolution Note:</strong> {note.resolutionNote}
                    </div>
                  </div>
                )}

                {/* Threaded Replies */}
                {note.replies && note.replies.length > 0 && (
                  <div className="flex flex-col gap-2 pl-4 border-l border-paper/10 mt-2">
                    {note.replies.map((rep) => (
                      <div key={rep.id} className="bg-midnight/70 p-3 rounded-xs flex flex-col gap-1 border border-paper/5">
                        <div className="flex justify-between items-center font-sans text-[9px] text-paper/40">
                          <span className="flex items-center gap-1 font-semibold text-paper/80">
                            <CornerDownRight size={10} className="text-blood" />
                            {rep.authorName}
                            <span className="text-[7px] uppercase tracking-widest bg-paper/5 px-1 rounded-xs">
                              {rep.authorRole}
                            </span>
                          </span>
                          <span className="font-mono text-[8px]">
                            {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-serif text-xs text-paper/80 pl-3 leading-relaxed">
                          {rep.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Trigger */}
                <div className="pt-1">
                  {activeReplyNoteId === note.id ? (
                    <div className="flex flex-col gap-2 pl-4 mt-2">
                      <textarea
                        rows={2}
                        placeholder="Write your editorial reply, counter-argument, or citation reference..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="bg-midnight border border-paper/20 text-paper p-2.5 rounded-xs font-serif text-xs focus:outline-none focus:border-blood resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setActiveReplyNoteId(null); setReplyContent(''); }}
                          className="font-sans text-[8px] uppercase tracking-wider px-2 py-1 text-paper/50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReply}
                          onClick={() => handleAddReply(note.id)}
                          className="bg-blood hover:bg-blood-light disabled:opacity-50 text-paper font-sans text-[8px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-xs cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <Send size={10} /> Send Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveReplyNoteId(note.id)}
                      className="text-paper/40 hover:text-paper font-sans text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CornerDownRight size={11} /> Reply to thread
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
