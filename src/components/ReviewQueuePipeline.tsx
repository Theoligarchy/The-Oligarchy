import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ManuscriptSubmission, EditorialRole } from '../types';
import { EmptyState } from './EmptyState';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Mail, 
  ExternalLink, 
  Trash2, 
  ArrowRight, 
  User, 
  Building, 
  Globe, 
  Share2, 
  BookOpen, 
  Copy, 
  Check, 
  Send, 
  Edit3, 
  X, 
  ChevronRight,
  Eye,
  FileCheck,
  RefreshCw,
  Sparkles,
  Inbox,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReviewQueuePipelineProps {
  onConvertToArticle: (submission: ManuscriptSubmission) => void;
  resendApiKey?: string;
  currentUserRole?: EditorialRole;
  userEmail?: string;
}

export default function ReviewQueuePipeline({ onConvertToArticle, resendApiKey, currentUserRole = 'admin', userEmail }: ReviewQueuePipelineProps) {
  const [submissions, setSubmissions] = useState<ManuscriptSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<'all' | 'received' | 'in_peer_review' | 'revisions_needed' | 'accepted' | 'declined'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'criminology' | 'psyche' | 'politics'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Dossier for detailed review modal
  const [selectedSubmission, setSelectedSubmission] = useState<ManuscriptSubmission | null>(null);
  
  // Internal editorial notes & peer review feedback edit state
  const [internalNotes, setInternalNotes] = useState('');
  const [peerFeedback, setPeerFeedback] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Email Notification Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedEmailBody, setCopiedEmailBody] = useState(false);

  // Deletion confirm modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load submissions from Firestore + Local backup
  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      let loadedList: ManuscriptSubmission[] = [];
      
      // Fetch from Firestore
      try {
        const col = collection(db, 'submissions');
        const q = query(col, orderBy('submittedAt', 'desc'));
        const snap = await getDocs(q);
        loadedList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManuscriptSubmission));
      } catch (dbErr) {
        console.warn('Firestore fetch failed, checking local storage:', dbErr);
      }

      // Check local storage for any offline/local submissions
      try {
        const localSubs = JSON.parse(localStorage.getItem('tol_local_submissions') || '[]');
        if (localSubs.length > 0) {
          const ids = new Set(loadedList.map(s => s.id));
          localSubs.forEach((item: ManuscriptSubmission) => {
            if (!ids.has(item.id)) {
              loadedList.push(item);
            }
          });
        }
      } catch (locErr) {}

      // Sort newest first
      loadedList.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      setSubmissions(loadedList);
    } catch (e) {
      console.error('Failed to load review queue submissions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Update status in Firestore & local state
  const handleUpdateStatus = async (subId: string, newStatus: ManuscriptSubmission['status']) => {
    try {
      const now = Date.now();
      
      // Update in Firestore
      try {
        await updateDoc(doc(db, 'submissions', subId), {
          status: newStatus,
          updatedAt: now
        });
      } catch (err) {
        console.warn('Firestore update warning:', err);
      }

      // Update local state
      setSubmissions(prev => prev.map(s => {
        if (s.id === subId) {
          return { ...s, status: newStatus, updatedAt: now };
        }
        return s;
      }));

      // Update selected submission if open
      if (selectedSubmission && selectedSubmission.id === subId) {
        const updated = { ...selectedSubmission, status: newStatus, updatedAt: now };
        setSelectedSubmission(updated);
        // Prompt for automated email dispatch for status change
        prepareStatusChangeEmail(updated, newStatus);
      }
    } catch (e: any) {
      alert(`Status update failed: ${e.message}`);
    }
  };

  // Save editorial notes & reviewer feedback
  const handleSaveEditorialNotes = async () => {
    if (!selectedSubmission) return;
    setIsSavingNotes(true);
    try {
      const now = Date.now();
      try {
        await updateDoc(doc(db, 'submissions', selectedSubmission.id), {
          editorialNotes: internalNotes,
          peerReviewerFeedback: peerFeedback,
          updatedAt: now
        });
      } catch (err) {
        console.warn('Firestore notes write warning:', err);
      }

      // Update local state
      const updatedSub = {
        ...selectedSubmission,
        editorialNotes: internalNotes,
        peerReviewerFeedback: peerFeedback,
        updatedAt: now
      };
      
      setSelectedSubmission(updatedSub);
      setSubmissions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    } catch (e) {
      console.error('Failed to save editorial notes:', e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Delete submission
  const handleDeleteSubmission = async (subId: string) => {
    try {
      try {
        await deleteDoc(doc(db, 'submissions', subId));
      } catch (err) {}

      // Also remove from local storage
      try {
        const localSubs = JSON.parse(localStorage.getItem('tol_local_submissions') || '[]');
        const filtered = localSubs.filter((s: any) => s.id !== subId);
        localStorage.setItem('tol_local_submissions', JSON.stringify(filtered));
      } catch (locErr) {}

      setSubmissions(prev => prev.filter(s => s.id !== subId));
      if (selectedSubmission?.id === subId) {
        setSelectedSubmission(null);
      }
      setDeleteConfirmId(null);
    } catch (e: any) {
      alert(`Failed to remove manuscript: ${e.message}`);
    }
  };

  // Prepare standard academic email templates for each pipeline stage
  const prepareStatusChangeEmail = (sub: ManuscriptSubmission, status: ManuscriptSubmission['status']) => {
    setEmailRecipient(sub.authorEmail);
    
    let subject = '';
    let body = '';

    if (status === 'received') {
      subject = `[The Oligarchy] Triage Ingestion Acknowledgment: ${sub.referenceId}`;
      body = `Dear ${sub.authorName},

Thank you for submitting your investigation, "${sub.title}" (${sub.referenceId}), to The Oligarchy.

Your manuscript has been logged in our editorial registry and assigned to our initial triage queue. Our editors evaluate every submission for empirical rigor, methodological soundness, and clarity of thesis.

Initial triage takes 3 to 5 business days. We will notify you once formal peer review commences.

Sincerely,
Editorial Board
The Oligarchy · https://theoligarchy.in
theoligarchy.ppj@gmail.com`;
    } else if (status === 'in_peer_review') {
      subject = `[The Oligarchy] Manuscript Under Peer Review: ${sub.referenceId}`;
      body = `Dear ${sub.authorName},

We are pleased to inform you that your manuscript, "${sub.title}" (${sub.referenceId}), has cleared initial editorial screening and is now officially undergoing formal peer review.

During this stage, domain specialists in ${sub.category.toUpperCase()} and investigative methodology will examine your hypotheses, empirical datasets, and argumentative structure.

We anticipate sharing detailed reviewer feedback within 7 to 14 business days.

Sincerely,
Editorial Board & Review Committee
The Oligarchy · https://theoligarchy.in`;
    } else if (status === 'revisions_needed') {
      subject = `[The Oligarchy] Editorial Triage: Revisions Requested for ${sub.referenceId}`;
      body = `Dear ${sub.authorName},

Thank you for your patience while "${sub.title}" (${sub.referenceId}) was evaluated by our peer review board.

The reviewers find the core thesis compelling and relevant to our inquiry into systems of power and behavior; however, revisions are requested before we can accept the manuscript for publication.

REVIEWER & EDITORIAL FEEDBACK:
--------------------------------------------------
${peerFeedback || sub.peerReviewerFeedback || '[Please expand upon empirical source citations and methodological clarity in the data section.]'}
--------------------------------------------------

Please submit your revised draft within 14 days by replying directly to this email or updating your reference code.

Sincerely,
Priyasha Priyal Jena
Editor-in-Chief · The Oligarchy`;
    } else if (status === 'accepted') {
      subject = `[The Oligarchy] Formal Acceptance: "${sub.title}" (${sub.referenceId})`;
      body = `Dear ${sub.authorName},

On behalf of the editorial board of The Oligarchy, we are delighted to inform you that your investigation, "${sub.title}", has been formally ACCEPTED for publication.

Your work will now enter our production and typesetting pipeline. We will prepare the digital monograph, index your author profile in our Contributor Registry, and generate your offprint dossier.

We will share the pre-publication proof with you prior to general distribution to our subscribers.

Congratulations on this scholarly contribution.

Sincerely,
Priyasha Priyal Jena
Editor-in-Chief · The Oligarchy
theoligarchy.ppj@gmail.com`;
    } else if (status === 'declined') {
      subject = `[The Oligarchy] Editorial Decision: ${sub.referenceId}`;
      body = `Dear ${sub.authorName},

Thank you for giving The Oligarchy the opportunity to consider "${sub.title}" (${sub.referenceId}).

After careful evaluation by our editorial triage board, we regret to inform you that we are unable to accept your submission for publication at this time. Due to our specific thematic focus and publication volume constraints, we must decline many well-researched manuscripts.

We encourage you to consider submitting future investigations that align with our research areas in criminology, behavioral psyche, and political power.

Sincerely,
Editorial Board
The Oligarchy`;
    }

    setEmailSubject(subject);
    setEmailBody(body);
    setEmailModalOpen(true);
  };

  // Dispatch email notification via Resend API or Fallback
  const handleDispatchEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatusMsg(null);

    const apiKey = resendApiKey || localStorage.getItem('tol_resend_api_key') || '';

    if (!apiKey) {
      setEmailStatusMsg({
        text: 'Resend API Key is not configured in Security Settings. You can copy the generated email text below or send via your default mail client.',
        type: 'error'
      });
      setIsSendingEmail(false);
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'The Oligarchy Editorial <editorial@theoligarchy.in>',
          to: [emailRecipient],
          subject: emailSubject,
          text: emailBody
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}`);
      }

      setEmailStatusMsg({
        text: `Formal academic notification successfully delivered to ${emailRecipient}!`,
        type: 'success'
      });

      // Append notification to history
      if (selectedSubmission) {
        const updatedHistory = [
          ...(selectedSubmission.notificationHistory || []),
          {
            status: selectedSubmission.status,
            timestamp: Date.now(),
            recipient: emailRecipient,
            subject: emailSubject
          }
        ];
        try {
          await updateDoc(doc(db, 'submissions', selectedSubmission.id), {
            notificationHistory: updatedHistory
          });
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Email dispatch error:', err);
      setEmailStatusMsg({
        text: `Direct dispatch note: ${err.message}. You can still copy the prefilled template below to send via your email client.`,
        type: 'error'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(`To: ${emailRecipient}\nSubject: ${emailSubject}\n\n${emailBody}`);
    setCopiedEmailBody(true);
    setTimeout(() => setCopiedEmailBody(false), 2000);
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Role based scoping: Author only sees their own submissions if role is author
    if (currentUserRole === 'author' && userEmail) {
      const emailMatch = sub.authorEmail?.toLowerCase() === userEmail.toLowerCase();
      const nameMatch = sub.authorName?.toLowerCase().includes('priyasha') || sub.authorName?.toLowerCase().includes('jena');
      if (!emailMatch && !nameMatch && submissions.length > 2) {
        return false;
      }
    }
    // Stage Filter
    if (activeStage !== 'all' && sub.status !== activeStage) return false;
    // Category Filter
    if (categoryFilter !== 'all' && sub.category !== categoryFilter) return false;
    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = sub.title?.toLowerCase().includes(q);
      const matchAuthor = sub.authorName?.toLowerCase().includes(q);
      const matchRef = sub.referenceId?.toLowerCase().includes(q);
      const matchInst = sub.authorInstitution?.toLowerCase().includes(q);
      const matchAbstract = sub.abstract?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchRef && !matchInst && !matchAbstract) return false;
    }
    return true;
  });

  // Calculate stage metrics
  const countReceived = submissions.filter(s => s.status === 'received').length;
  const countInReview = submissions.filter(s => s.status === 'in_peer_review').length;
  const countRevisions = submissions.filter(s => s.status === 'revisions_needed').length;
  const countAccepted = submissions.filter(s => s.status === 'accepted').length;

  return (
    <div className="space-y-6 fade-in select-text">
      
      {/* Top Banner & Triage Stage Metrics */}
      <div className="bg-navy/70 border border-paper/10 p-6 rounded-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-sm flex items-center gap-1">
                <ShieldCheck size={10} />
                {currentUserRole === 'author' ? 'Author Submissions Tracker' : currentUserRole === 'reviewer' ? 'Peer Reviewer Evaluation Queue' : 'Editorial Triage Pipeline'}
              </span>
              <span className="font-mono text-[9px] text-paper/40">
                {submissions.length} Total Submissions Registered
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-paper mt-1">
              {currentUserRole === 'author' ? 'My Manuscript Pitches & Review Feedback' : 'Review Queue & Investigation Pitches'}
            </h2>
            <p className="font-serif text-xs text-paper/50 mt-0.5 max-w-xl">
              {currentUserRole === 'author' 
                ? 'Track your submitted research proposals and papers in real-time, view peer reviewer notes, and respond to revision requests.'
                : currentUserRole === 'reviewer'
                ? 'Evaluate public and fellow research pitches, advance manuscripts through peer review, leave empirical scorecards, and provide line-by-line marginalia.'
                : 'Evaluate public manuscript pitches, advance them through peer review stages, write editorial feedback, and convert accepted research treatises into live articles.'}
            </p>
          </div>

          <button
            onClick={loadSubmissions}
            disabled={isLoading}
            className="bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/80 hover:text-paper font-sans text-[10px] font-bold tracking-wider uppercase py-2.5 px-4 rounded-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <button
            onClick={() => setActiveStage(activeStage === 'received' ? 'all' : 'received')}
            className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeStage === 'received'
                ? 'bg-amber-500/20 border-amber-500/60 text-paper'
                : 'bg-ink border-paper/10 text-paper/60 hover:border-paper/25'
            }`}
          >
            <span className="font-sans text-[9px] uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1.5">
              <Clock size={11} /> 1. Received
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display text-2xl font-bold text-paper">{countReceived}</span>
              <span className="font-serif text-[10px] text-paper/40">Awaiting Triage</span>
            </div>
          </button>

          <button
            onClick={() => setActiveStage(activeStage === 'in_peer_review' ? 'all' : 'in_peer_review')}
            className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeStage === 'in_peer_review'
                ? 'bg-blue-500/20 border-blue-500/60 text-paper'
                : 'bg-ink border-paper/10 text-paper/60 hover:border-paper/25'
            }`}
          >
            <span className="font-sans text-[9px] uppercase tracking-wider font-semibold text-blue-300 flex items-center gap-1.5">
              <BookOpen size={11} /> 2. In Peer Review
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display text-2xl font-bold text-paper">{countInReview}</span>
              <span className="font-serif text-[10px] text-paper/40">Under Evaluation</span>
            </div>
          </button>

          <button
            onClick={() => setActiveStage(activeStage === 'revisions_needed' ? 'all' : 'revisions_needed')}
            className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeStage === 'revisions_needed'
                ? 'bg-purple-500/20 border-purple-500/60 text-paper'
                : 'bg-ink border-paper/10 text-paper/60 hover:border-paper/25'
            }`}
          >
            <span className="font-sans text-[9px] uppercase tracking-wider font-semibold text-purple-300 flex items-center gap-1.5">
              <Edit3 size={11} /> 3. Revisions Needed
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display text-2xl font-bold text-paper">{countRevisions}</span>
              <span className="font-serif text-[10px] text-paper/40">Feedback Returned</span>
            </div>
          </button>

          <button
            onClick={() => setActiveStage(activeStage === 'accepted' ? 'all' : 'accepted')}
            className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeStage === 'accepted'
                ? 'bg-green-500/20 border-green-500/60 text-paper'
                : 'bg-ink border-paper/10 text-paper/60 hover:border-paper/25'
            }`}
          >
            <span className="font-sans text-[9px] uppercase tracking-wider font-semibold text-green-300 flex items-center gap-1.5">
              <FileCheck size={11} /> 4. Accepted
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="font-display text-2xl font-bold text-paper">{countAccepted}</span>
              <span className="font-serif text-[10px] text-paper/40">Publish Ready</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-midnight border border-paper/10 p-4 rounded-sm">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-3 text-paper/30" />
          <input
            type="text"
            placeholder="Search by title, author, ref ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2 pl-9 pr-3 text-paper font-serif text-xs rounded-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-paper/30 hover:text-paper"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Stage & Category Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <div className="flex items-center bg-ink border border-paper/15 rounded-xs p-1">
            {(['all', 'criminology', 'psyche', 'politics'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`font-sans text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer capitalize ${
                  categoryFilter === cat
                    ? 'bg-blood text-paper font-bold'
                    : 'text-paper/40 hover:text-paper'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Clear Filter button */}
          {(activeStage !== 'all' || categoryFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setActiveStage('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="font-sans text-[9px] uppercase tracking-wider text-paper/40 hover:text-red-400 px-2 py-1 cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="py-16 text-center text-paper/40 space-y-3 font-serif text-sm">
          <div className="inline-block animate-spin border-2 border-paper/20 border-t-blood rounded-full w-6 h-6" />
          <p>Loading manuscript review queue...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        submissions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            badge="REVIEW QUEUE INBOX CLEAR"
            title="No Manuscript Submissions Pending"
            description="The editorial intake queue is currently clear. New manuscript proposals and forensic investigative pitches submitted through the public intake portal will appear here in real time."
            action={{
              label: 'Refresh Review Queue',
              onClick: loadSubmissions,
              icon: RefreshCw
            }}
            hints={[
              'Public submissions are submitted via the "Submit an Investigation" portal',
              'Submissions can be triaged across Peer Review, Revision, and Accepted stages',
              'Accepted manuscripts can be converted directly into the publication corpus with 1-click'
            ]}
          />
        ) : (
          <EmptyState
            icon={Search}
            badge="ZERO QUEUE MATCHES"
            title="No Submissions Match Filter"
            description={`No manuscript pitches match "${searchQuery || activeStage + ' / ' + categoryFilter}". Reset filters to review all ${submissions.length} queued manuscripts.`}
            action={{
              label: 'Reset Filters',
              onClick: () => {
                setActiveStage('all');
                setCategoryFilter('all');
                setSearchQuery('');
              },
              icon: RefreshCw
            }}
          />
        )
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((sub) => {
            const isReceived = sub.status === 'received';
            const isInReview = sub.status === 'in_peer_review';
            const isRevisions = sub.status === 'revisions_needed';
            const isAccepted = sub.status === 'accepted';
            const isDeclined = sub.status === 'declined';

            return (
              <div
                key={sub.id}
                className="bg-ink border border-paper/10 hover:border-paper/30 transition-all rounded-sm p-5 space-y-4 select-text"
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper/5 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-xs border ${
                      isReceived 
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : isInReview 
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : isRevisions
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : isAccepted
                        ? 'bg-green-500/10 text-green-300 border-green-500/30'
                        : 'bg-paper/5 text-paper/40 border-paper/10'
                    }`}>
                      {sub.status.replace('_', ' ')}
                    </span>

                    {/* Category */}
                    <span className="font-sans text-[9px] font-semibold tracking-wider uppercase text-blood bg-blood/10 border border-blood/20 px-2 py-0.5 rounded-xs">
                      {sub.category}
                    </span>

                    {/* Submission Type */}
                    <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40 bg-paper/5 border border-paper/10 px-1.5 py-0.5 rounded-xs">
                      {sub.submissionType.replace('_', ' ')}
                    </span>

                    {/* Tracking ID */}
                    <span className="font-mono text-[10px] text-paper/50">
                      ID: {sub.referenceId}
                    </span>
                  </div>

                  <span className="font-mono text-[9px] text-paper/35">
                    Received: {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Main Pitch Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <h3 className="font-display text-base font-bold text-paper hover:text-blood transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setInternalNotes(sub.editorialNotes || '');
                        setPeerFeedback(sub.peerReviewerFeedback || '');
                      }}
                    >
                      {sub.title}
                    </h3>

                    {sub.subtitle && (
                      <p className="font-serif text-xs italic text-paper/60">
                        {sub.subtitle}
                      </p>
                    )}

                    <p className="font-serif text-xs text-paper/50 line-clamp-2 leading-relaxed">
                      {sub.abstract}
                    </p>
                  </div>

                  {/* Author Quick Card */}
                  <div className="border-t md:border-t-0 md:border-l border-paper/5 pt-3 md:pt-0 md:pl-4 space-y-1 text-xs">
                    <div className="font-serif font-semibold text-paper/85 flex items-center gap-1.5">
                      <User size={12} className="text-blood" />
                      <span>{sub.authorName}</span>
                    </div>
                    <div className="font-serif text-[11px] text-paper/45 italic">
                      {sub.authorTitle || 'Researcher'}
                    </div>
                    {sub.authorInstitution && (
                      <div className="font-serif text-[11px] text-paper/40 flex items-center gap-1">
                        <Building size={10} />
                        <span className="truncate">{sub.authorInstitution}</span>
                      </div>
                    )}
                    <div className="font-mono text-[10px] text-paper/35 pt-1">
                      {sub.authorEmail}
                    </div>
                  </div>
                </div>

                {/* Quick Pipeline Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-paper/5 font-sans text-[10px]">
                  
                  {/* Status Advance Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-paper/35 font-bold uppercase tracking-wider text-[8px] mr-1">Triage:</span>
                    
                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'received')}
                      className={`px-2 py-1 rounded-xs border uppercase tracking-wider transition-colors cursor-pointer ${
                        sub.status === 'received'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-paper/5 text-paper/40 border-paper/10 hover:text-paper'
                      }`}
                    >
                      Received
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'in_peer_review')}
                      className={`px-2 py-1 rounded-xs border uppercase tracking-wider transition-colors cursor-pointer ${
                        sub.status === 'in_peer_review'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold'
                          : 'bg-paper/5 text-paper/40 border-paper/10 hover:text-paper'
                      }`}
                    >
                      In Peer Review
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'revisions_needed')}
                      className={`px-2 py-1 rounded-xs border uppercase tracking-wider transition-colors cursor-pointer ${
                        sub.status === 'revisions_needed'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold'
                          : 'bg-paper/5 text-paper/40 border-paper/10 hover:text-paper'
                      }`}
                    >
                      Revisions
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(sub.id, 'accepted')}
                      className={`px-2 py-1 rounded-xs border uppercase tracking-wider transition-colors cursor-pointer ${
                        sub.status === 'accepted'
                          ? 'bg-green-500/20 text-green-300 border-green-500/50 font-bold'
                          : 'bg-paper/5 text-paper/40 border-paper/10 hover:text-paper'
                      }`}
                    >
                      Accepted
                    </button>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Convert to Article button (if accepted or ready) */}
                    <button
                      onClick={() => onConvertToArticle(sub)}
                      className="bg-blood/20 hover:bg-blood border border-blood/40 hover:border-blood text-paper font-bold uppercase tracking-wider px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Directly transfer this investigation into the post editor for publishing"
                    >
                      <Sparkles size={11} className="text-amber-300" />
                      <span>Convert to Post</span>
                    </button>

                    {/* Email Author Notification */}
                    <button
                      onClick={() => {
                        setSelectedSubmission(sub);
                        prepareStatusChangeEmail(sub, sub.status);
                      }}
                      className="bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/70 hover:text-paper font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Send formal academic email notification to researcher"
                    >
                      <Mail size={11} />
                      <span>Email</span>
                    </button>

                    {/* View Full Dossier */}
                    <button
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setInternalNotes(sub.editorialNotes || '');
                        setPeerFeedback(sub.peerReviewerFeedback || '');
                      }}
                      className="bg-paper/10 hover:bg-paper/20 border border-paper/20 text-paper font-bold uppercase tracking-wider px-3 py-1.5 rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={11} />
                      <span>Inspect Dossier</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteConfirmId(sub.id)}
                      className="text-paper/30 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                      title="Delete manuscript pitch"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ DOSSIER INSPECTOR MODAL ══ */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-midnight border border-paper/20 rounded-sm max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-ink border-b border-paper/10 p-6 flex items-start justify-between gap-4 sticky top-0 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-xs">
                    {selectedSubmission.referenceId}
                  </span>
                  <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-blood bg-blood/10 border border-blood/20 px-2 py-0.5 rounded-xs">
                    {selectedSubmission.category}
                  </span>
                  <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/60 bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-xs">
                    Stage: {selectedSubmission.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-paper leading-snug">
                  {selectedSubmission.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-paper/40 hover:text-paper p-2 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8 select-text">
              
              {/* Lead Author Credentials Dossier */}
              <div className="bg-ink/80 border border-paper/10 p-5 rounded-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block">
                    Researcher Identity &amp; Affiliation
                  </span>
                  <div className="font-display text-base font-bold text-paper/90">
                    {selectedSubmission.authorName}
                  </div>
                  <div className="font-serif text-xs text-paper/60 italic">
                    {selectedSubmission.authorTitle} · {selectedSubmission.authorInstitution}
                  </div>
                  <div className="font-mono text-xs text-paper/50 flex items-center gap-1.5">
                    <Mail size={12} className="text-blood" />
                    <span>{selectedSubmission.authorEmail}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-paper/10 pt-3 md:pt-0 md:pl-4">
                  {selectedSubmission.authorSocialUrl && (
                    <div>
                      <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                        Academic Profile / Social Link
                      </span>
                      <a
                        href={selectedSubmission.authorSocialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-blue-400 hover:underline flex items-center gap-1 truncate"
                      >
                        <Globe size={11} /> {selectedSubmission.authorSocialUrl}
                      </a>
                    </div>
                  )}

                  {selectedSubmission.coAuthors && (
                    <div>
                      <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                        Co-Authors &amp; Collaborators
                      </span>
                      <p className="font-serif text-xs text-paper/70">
                        {selectedSubmission.coAuthors}
                      </p>
                    </div>
                  )}

                  {selectedSubmission.authorBio && (
                    <div>
                      <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                        Biographical Synopsis
                      </span>
                      <p className="font-serif text-xs text-paper/50 italic leading-relaxed">
                        "{selectedSubmission.authorBio}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Investigation Abstract */}
              <div className="space-y-2">
                <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-blood block">
                  Executive Abstract &amp; Analytical Framework
                </span>
                <div className="bg-ink/50 border border-paper/10 p-4 rounded-xs font-serif text-sm text-paper/85 leading-relaxed">
                  {selectedSubmission.abstract}
                </div>
              </div>

              {/* Full Manuscript Body or Detailed Methodology */}
              <div className="space-y-2">
                <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-paper/50 block">
                  Full Manuscript Treatise / Investigation Methodology
                </span>
                <div className="bg-ink/40 border border-paper/10 p-5 rounded-xs font-mono text-xs text-paper/75 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {selectedSubmission.content}
                </div>
              </div>

              {/* Primary Sources & Datasets */}
              {(selectedSubmission.sourcesText || selectedSubmission.datasetUrl) && (
                <div className="space-y-3 border-t border-paper/10 pt-4">
                  <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-paper/50 block">
                    Empirical Bibliography &amp; Primary Datasets
                  </span>

                  {selectedSubmission.sourcesText && (
                    <div className="bg-ink/30 border border-paper/10 p-4 rounded-xs font-serif text-xs text-paper/60 whitespace-pre-wrap leading-relaxed">
                      {selectedSubmission.sourcesText}
                    </div>
                  )}

                  {selectedSubmission.datasetUrl && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-paper/40 font-sans uppercase font-bold text-[9px]">Dataset Link:</span>
                      <a
                        href={selectedSubmission.datasetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <ExternalLink size={12} /> {selectedSubmission.datasetUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Internal Editorial Notes & Peer Reviewer Feedback */}
              <div className="border border-paper/15 bg-navy/40 p-6 rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-paper flex items-center gap-2">
                    <Edit3 size={13} className="text-blood-light" /> Internal Editorial Notes &amp; Peer Evaluation
                  </h4>
                  <button
                    onClick={handleSaveEditorialNotes}
                    disabled={isSavingNotes}
                    className="bg-paper/10 hover:bg-paper/20 text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-1.5 px-3 rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {isSavingNotes ? 'Saving Notes...' : 'Save Notes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-paper/50 mb-1">
                      Private Editorial Notes (Internal Only)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Add private notes on credibility, investigative depth, cross-checking..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3 text-paper font-serif text-xs rounded-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-paper/50 mb-1">
                      Constructive Feedback for Author (Embeddable in Email)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Specify requested revisions, literature expansions, or critique to share with the author..."
                      value={peerFeedback}
                      onChange={(e) => setPeerFeedback(e.target.value)}
                      className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3 text-paper font-serif text-xs rounded-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Triage Decision Strip */}
              <div className="bg-ink/90 border border-paper/15 p-5 rounded-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                    Advance Triage Stage
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(['received', 'in_peer_review', 'revisions_needed', 'accepted', 'declined'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedSubmission.id, st)}
                        className={`font-sans text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xs border transition-all cursor-pointer ${
                          selectedSubmission.status === st
                            ? 'bg-blood border-blood text-paper shadow-md'
                            : 'bg-paper/5 text-paper/50 border-paper/10 hover:border-paper/30 hover:text-paper'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={() => prepareStatusChangeEmail(selectedSubmission, selectedSubmission.status)}
                    className="bg-paper/10 hover:bg-paper/20 border border-paper/20 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail size={12} />
                    <span>Compose Decision Email</span>
                  </button>

                  <button
                    onClick={() => {
                      onConvertToArticle(selectedSubmission);
                      setSelectedSubmission(null);
                    }}
                    className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-5 rounded-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={12} className="text-amber-300" />
                    <span>Convert to Post Editor</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-ink border-t border-paper/10 p-4 flex justify-between items-center text-xs text-paper/40">
              <span className="font-mono text-[10px]">
                Last updated: {new Date(selectedSubmission.updatedAt || selectedSubmission.submittedAt).toUTCString()}
              </span>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="font-sans text-[10px] uppercase font-bold tracking-wider text-paper/60 hover:text-paper cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══ EMAIL NOTIFICATION DISPATCH MODAL ══ */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-midnight border border-paper/20 rounded-sm max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-ink border-b border-paper/10 p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blood-light" />
                <h3 className="font-display text-base font-bold text-paper">
                  Formal Editorial Correspondence
                </h3>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-paper/40 hover:text-paper transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 select-text">
              <div>
                <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-paper/50 mb-1">
                  Recipient Academic Email
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full bg-ink border border-paper/15 p-2.5 text-paper font-mono text-xs rounded-xs"
                />
              </div>

              <div>
                <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-paper/50 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-ink border border-paper/15 p-2.5 text-paper font-serif text-xs rounded-xs"
                />
              </div>

              <div>
                <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-paper/50 mb-1">
                  Letter Body
                </label>
                <textarea
                  rows={10}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-ink border border-paper/15 p-3 text-paper font-serif text-xs rounded-xs font-mono leading-relaxed"
                />
              </div>

              {emailStatusMsg && (
                <div className={`p-3 rounded-xs font-serif text-xs flex items-center gap-2 ${
                  emailStatusMsg.type === 'success' 
                    ? 'bg-green-950/20 border border-green-500/30 text-green-300'
                    : 'bg-amber-950/20 border border-amber-500/30 text-amber-300'
                }`}>
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{emailStatusMsg.text}</span>
                </div>
              )}
            </div>

            <div className="bg-ink border-t border-paper/10 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={copyEmailToClipboard}
                  className="bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/70 hover:text-paper font-sans text-[10px] font-semibold uppercase tracking-wider py-2 px-3 rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedEmailBody ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  <span>{copiedEmailBody ? 'Copied' : 'Copy Template'}</span>
                </button>

                <a
                  href={`mailto:${emailRecipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                  className="bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/70 hover:text-paper font-sans text-[10px] font-semibold uppercase tracking-wider py-2 px-3 rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Open in Mail App</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="font-sans text-[10px] uppercase tracking-wider text-paper/40 hover:text-paper py-2 px-3 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDispatchEmail}
                  disabled={isSendingEmail}
                  className="bg-blood hover:bg-blood-light disabled:opacity-50 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2 px-5 rounded-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <span className="inline-block animate-spin border-2 border-paper/30 border-t-paper rounded-full w-3.5 h-3.5" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      <span>Dispatch Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRMATION DIALOG ══ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-midnight border border-paper/20 p-6 rounded-sm max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="font-display text-base font-bold text-paper">
              Delete Manuscript Pitch?
            </h4>
            <p className="font-serif text-xs text-paper/60 leading-relaxed">
              This action will permanently delete this research proposal and its associated peer annotations from the review queue.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="bg-paper/5 hover:bg-paper/10 text-paper font-sans text-[10px] font-semibold tracking-wider uppercase py-2 px-4 rounded-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSubmission(deleteConfirmId)}
                className="bg-red-700 hover:bg-red-800 text-white font-sans text-[10px] font-bold tracking-widest uppercase py-2 px-4 rounded-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
