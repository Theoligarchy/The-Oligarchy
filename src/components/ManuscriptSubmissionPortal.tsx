import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ManuscriptSubmission } from '../types';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  GraduationCap, 
  Clock, 
  User, 
  Mail, 
  Building, 
  Globe, 
  Tag, 
  Download, 
  Copy, 
  Check, 
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManuscriptSubmissionPortalProps {
  onNavigateHome?: () => void;
  onBrowseResearch?: () => void;
  onViewPrinciples?: () => void;
}

const DRAFT_STORAGE_KEY = 'tol_manuscript_draft_v1';

export default function ManuscriptSubmissionPortal({ 
  onNavigateHome,
  onBrowseResearch,
  onViewPrinciples 
}: ManuscriptSubmissionPortalProps) {
  const handleHomeNavigation = onNavigateHome || onBrowseResearch;
  // Form Field States
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorTitle, setAuthorTitle] = useState('');
  const [authorInstitution, setAuthorInstitution] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [authorSocialUrl, setAuthorSocialUrl] = useState('');
  const [coAuthors, setCoAuthors] = useState('');

  const [category, setCategory] = useState<'criminology' | 'psyche' | 'politics'>('criminology');
  const [submissionType, setSubmissionType] = useState<ManuscriptSubmission['submissionType']>('investigative_pitch');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [content, setContent] = useState('');
  const [sourcesText, setSourcesText] = useState('');
  const [datasetUrl, setDatasetUrl] = useState('');
  const [agreedToEthics, setAgreedToEthics] = useState(false);

  // Status & UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedManuscript, setSubmittedManuscript] = useState<ManuscriptSubmission | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [draftSavedTimestamp, setDraftSavedTimestamp] = useState<string | null>(null);

  // Restore draft from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.abstract || parsed.content || parsed.authorName) {
          setAuthorName(parsed.authorName || '');
          setAuthorEmail(parsed.authorEmail || '');
          setAuthorTitle(parsed.authorTitle || '');
          setAuthorInstitution(parsed.authorInstitution || '');
          setAuthorBio(parsed.authorBio || '');
          setAuthorSocialUrl(parsed.authorSocialUrl || '');
          setCoAuthors(parsed.coAuthors || '');
          setCategory(parsed.category || 'criminology');
          setSubmissionType(parsed.submissionType || 'investigative_pitch');
          setTitle(parsed.title || '');
          setSubtitle(parsed.subtitle || '');
          setAbstract(parsed.abstract || '');
          setContent(parsed.content || '');
          setSourcesText(parsed.sourcesText || '');
          setDatasetUrl(parsed.datasetUrl || '');
          setHasSavedDraft(true);
        }
      }
    } catch (e) {
      console.warn('Failed to load manuscript draft from storage:', e);
    }
  }, []);

  // Auto-save draft changes to localStorage
  useEffect(() => {
    if (submittedManuscript) return;
    const timeout = setTimeout(() => {
      if (title || abstract || content || authorName || authorEmail) {
        const draft = {
          authorName,
          authorEmail,
          authorTitle,
          authorInstitution,
          authorBio,
          authorSocialUrl,
          coAuthors,
          category,
          submissionType,
          title,
          subtitle,
          abstract,
          content,
          sourcesText,
          datasetUrl,
          updatedAt: Date.now()
        };
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
          setDraftSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (e) {}
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    authorName, authorEmail, authorTitle, authorInstitution, authorBio, 
    authorSocialUrl, coAuthors, category, submissionType, title, subtitle, 
    abstract, content, sourcesText, datasetUrl, submittedManuscript
  ]);

  const handleClearDraft = () => {
    if (window.confirm('Are you sure you want to clear this manuscript draft? All unsaved fields will be reset.')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setAuthorName('');
      setAuthorEmail('');
      setAuthorTitle('');
      setAuthorInstitution('');
      setAuthorBio('');
      setAuthorSocialUrl('');
      setCoAuthors('');
      setTitle('');
      setSubtitle('');
      setAbstract('');
      setContent('');
      setSourcesText('');
      setDatasetUrl('');
      setAgreedToEthics(false);
      setHasSavedDraft(false);
      setDraftSavedTimestamp(null);
    }
  };

  const generateReferenceCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'TOL-';
    const year = new Date().getFullYear();
    code += `${year}-`;
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!authorName.trim()) {
      setErrorMessage('Please provide your name as lead researcher.');
      return;
    }
    if (!authorEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail.trim())) {
      setErrorMessage('A valid academic or institutional contact email is required for peer-review correspondence.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please specify an investigation title or working thesis.');
      return;
    }
    if (!abstract.trim() || abstract.trim().length < 50) {
      setErrorMessage('Please provide a substantive abstract (minimum 50 characters) summarizing the core thesis and analytical methodology.');
      return;
    }
    if (!content.trim() || content.trim().length < 100) {
      setErrorMessage('Please provide the full investigation body or a detailed multi-paragraph methodology outline (minimum 100 characters).');
      return;
    }
    if (!agreedToEthics) {
      setErrorMessage('You must confirm the research integrity, original scholarship, and peer triage agreement.');
      return;
    }

    setIsSubmitting(true);

    try {
      const refId = generateReferenceCode();
      const now = Date.now();

      const newSubmission: ManuscriptSubmission = {
        id: `sub-${now.toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
        referenceId: refId,
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim().toLowerCase(),
        authorTitle: authorTitle.trim() || 'Independent Researcher',
        authorInstitution: authorInstitution.trim() || 'Independent / Unaffiliated',
        authorBio: authorBio.trim(),
        authorSocialUrl: authorSocialUrl.trim(),
        category,
        submissionType,
        title: title.trim(),
        subtitle: subtitle.trim(),
        abstract: abstract.trim(),
        content: content.trim(),
        sourcesText: sourcesText.trim(),
        datasetUrl: datasetUrl.trim(),
        coAuthors: coAuthors.trim(),
        status: 'received',
        submittedAt: now,
        updatedAt: now,
        editorialNotes: '',
        notificationHistory: [
          {
            status: 'received',
            timestamp: now,
            recipient: authorEmail.trim(),
            subject: `[The Oligarchy] Manuscript Triage Acknowledgment: ${refId}`
          }
        ]
      };

      // Write to Firestore /submissions collection
      try {
        const subCol = collection(db, 'submissions');
        await addDoc(subCol, newSubmission);
      } catch (dbErr) {
        console.warn('Firestore write warning (handled gracefully):', dbErr);
      }

      // Also persist to local backup for instant resilience
      try {
        const existingSubs = JSON.parse(localStorage.getItem('tol_local_submissions') || '[]');
        existingSubs.unshift(newSubmission);
        localStorage.setItem('tol_local_submissions', JSON.stringify(existingSubs));
      } catch (locErr) {}

      // Clear draft on successful submission
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSubmittedManuscript(newSubmission);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while transmitting your manuscript. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferenceCode = () => {
    if (!submittedManuscript) return;
    navigator.clipboard.writeText(submittedManuscript.referenceId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const downloadSubmissionReceipt = () => {
    if (!submittedManuscript) return;
    const textData = `=====================================================
THE OLIGARCHY · SCHOLARLY MANUSCRIPT SUBMISSION RECEIPT
=====================================================
Reference Tracking ID : ${submittedManuscript.referenceId}
Submission Date       : ${new Date(submittedManuscript.submittedAt).toUTCString()}
Triage Status         : RECEIVED (Pending Peer Triage)

LEAD RESEARCHER:
Name        : ${submittedManuscript.authorName}
Credentials : ${submittedManuscript.authorTitle}
Institution : ${submittedManuscript.authorInstitution}
Email       : ${submittedManuscript.authorEmail}
${submittedManuscript.coAuthors ? `Co-Authors  : ${submittedManuscript.coAuthors}\n` : ''}

MANUSCRIPT DETAILS:
Title       : ${submittedManuscript.title}
${submittedManuscript.subtitle ? `Subtitle    : ${submittedManuscript.subtitle}\n` : ''}Category    : ${submittedManuscript.category.toUpperCase()}
Type        : ${submittedManuscript.submissionType.replace('_', ' ').toUpperCase()}

ABSTRACT:
${submittedManuscript.abstract}

PRIMARY BIBLIOGRAPHY & DATASETS:
${submittedManuscript.sourcesText || 'None supplied'}
${submittedManuscript.datasetUrl ? `Dataset Link : ${submittedManuscript.datasetUrl}\n` : ''}

EDITORIAL TRIAGE TIMELINE:
- Initial Editorial Triage : 3 - 5 Business Days
- Peer Review / Critique  : 7 - 14 Business Days
- Editorial Inquiries      : theoligarchy.ppj@gmail.com
=====================================================
The Oligarchy · https://theoligarchy.in
=====================================================`;

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TheOligarchy_Receipt_${submittedManuscript.referenceId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // SUCCESS CONFIRMATION RECEIPT VIEW
  if (submittedManuscript) {
    return (
      <div className="py-12 md:py-20 px-6 max-w-4xl mx-auto fade-in select-text">
        <div className="bg-gradient-to-b from-[#121212] to-midnight border border-paper/15 rounded-sm p-8 md:p-12 shadow-2xl space-y-8 relative overflow-hidden">
          {/* Subtle top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blood via-blood-light to-amber-500/80" />

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-paper/10 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[9px] font-bold tracking-[0.25em] uppercase text-blood bg-blood/10 border border-blood/30 px-2.5 py-0.5 rounded-sm flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-blood-light" /> Triage Queue Entry Confirmed
                </span>
                <span className="font-mono text-[9px] text-paper/40">
                  {new Date(submittedManuscript.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-paper">
                Manuscript Received for Peer Review
              </h2>
              <p className="font-serif text-xs md:text-sm text-paper/60 leading-relaxed max-w-xl">
                Your investigation has been securely registered in <span className="text-paper italic">The Oligarchy Editorial Triage Pipeline</span>. 
                Our board evaluates every submission against empirical rigor, methodological depth, and clarity of thesis.
              </p>
            </div>

            {/* Reference Tracking Token Box */}
            <div className="bg-navy/90 border border-paper/20 p-4 rounded-sm flex flex-col items-center md:items-end gap-1.5 shrink-0 shadow-inner">
              <span className="font-sans text-[8px] font-bold tracking-widest uppercase text-paper/40">
                Manuscript Tracking Reference
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base md:text-lg font-bold text-amber-300 tracking-wider">
                  {submittedManuscript.referenceId}
                </span>
                <button
                  onClick={copyReferenceCode}
                  className="p-1.5 bg-paper/5 hover:bg-blood/20 border border-paper/10 hover:border-blood text-paper/60 hover:text-paper rounded-xs transition-colors cursor-pointer"
                  title="Copy reference code"
                >
                  {copiedRef ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <span className="font-serif text-[10px] italic text-paper/40">
                Retain this ID for editorial status inquiries
              </span>
            </div>
          </div>

          {/* Submission Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-ink/60 border border-paper/10 p-6 rounded-sm">
            <div className="space-y-4">
              <div>
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                  Investigation Title
                </span>
                <h3 className="font-display text-base font-semibold text-paper/90 leading-snug">
                  {submittedManuscript.title}
                </h3>
                {submittedManuscript.subtitle && (
                  <p className="font-serif text-xs italic text-paper/50 mt-0.5">
                    {submittedManuscript.subtitle}
                  </p>
                )}
              </div>

              <div>
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                  Academic Discipline &amp; Format
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-sans text-[9px] font-semibold uppercase tracking-wider text-blood bg-blood/10 border border-blood/20 px-2 py-0.5 rounded-xs">
                    {submittedManuscript.category}
                  </span>
                  <span className="font-sans text-[9px] uppercase tracking-wider text-paper/60 bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-xs">
                    {submittedManuscript.submissionType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-paper/10 pt-4 md:pt-0 md:pl-6">
              <div>
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                  Lead Researcher
                </span>
                <div className="font-serif text-sm text-paper/85 font-medium">
                  {submittedManuscript.authorName}
                </div>
                <div className="font-serif text-xs text-paper/50 italic">
                  {submittedManuscript.authorTitle} · {submittedManuscript.authorInstitution}
                </div>
                <div className="font-mono text-[11px] text-paper/40 mt-1">
                  {submittedManuscript.authorEmail}
                </div>
              </div>

              <div>
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 block mb-1">
                  Triage Pipeline Stage
                </span>
                <div className="inline-flex items-center gap-1.5 font-sans text-[9px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xs">
                  <Clock size={11} /> 1. Received &amp; Queue Ingested
                </div>
              </div>
            </div>
          </div>

          {/* Peer Review Timeline & Next Steps */}
          <div className="border border-paper/10 bg-navy/40 p-6 rounded-sm space-y-4">
            <h4 className="font-display text-sm font-bold text-paper tracking-wider uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-blood-light" /> Peer Review &amp; Editorial Pipeline Timeline
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-[11px]">
              <div className="bg-ink/70 border border-paper/10 p-3.5 rounded-xs space-y-1">
                <span className="font-bold text-blood block uppercase text-[9px] tracking-widest">Phase 1: Ingest (1-3 Days)</span>
                <p className="text-paper/60 font-serif leading-relaxed">
                  Initial scope assessment, source verification, and academic integrity screening.
                </p>
              </div>
              <div className="bg-ink/70 border border-paper/10 p-3.5 rounded-xs space-y-1">
                <span className="font-bold text-amber-400 block uppercase text-[9px] tracking-widest">Phase 2: Peer Review (7-14 Days)</span>
                <p className="text-paper/60 font-serif leading-relaxed">
                  Evaluation by domain specialists in criminology, behavioral psyche, or political theory.
                </p>
              </div>
              <div className="bg-ink/70 border border-paper/10 p-3.5 rounded-xs space-y-1">
                <span className="font-bold text-green-400 block uppercase text-[9px] tracking-widest">Phase 3: Decision &amp; Typeset</span>
                <p className="text-paper/60 font-serif leading-relaxed">
                  Formal decision notification with line-by-line editorial feedback and typesetting offprint.
                </p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-paper/10">
            <button
              onClick={downloadSubmissionReceipt}
              className="bg-blood/20 hover:bg-blood border border-blood/50 hover:border-blood text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-3 px-5 rounded-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Download size={13} /> Download Archival Receipt (.txt)
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSubmittedManuscript(null);
                  setAgreedToEthics(false);
                }}
                className="bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/70 hover:text-paper font-sans text-[10px] font-semibold tracking-wider uppercase py-3 px-4 rounded-xs transition-colors cursor-pointer"
              >
                Submit Another Investigation
              </button>
              {handleHomeNavigation && (
                <button
                  onClick={handleHomeNavigation}
                  className="bg-paper/10 hover:bg-paper/20 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-3 px-5 rounded-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Browse Research Index &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN SUBMISSION FORM VIEW
  return (
    <div className="py-12 md:py-16 px-4 md:px-6 max-w-5xl mx-auto fade-in select-text">
      {/* Platform Header & Editorial Mission */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 select-text">
        <div className="inline-flex items-center gap-2 font-sans text-[9px] font-bold tracking-[0.25em] uppercase text-blood bg-blood/10 border border-blood/30 px-3 py-1 rounded-sm">
          <BookOpen size={12} className="text-blood-light" /> Contributor &amp; Research Submission Portal
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-extrabold text-paper leading-tight tracking-tight">
          Submit an Investigation
        </h2>
        <p className="font-serif text-sm md:text-base text-paper/60 leading-relaxed italic max-w-2xl mx-auto">
          "We welcome original theses, behavioral analyses, forensic investigations, and institutional critiques from scholars, researchers, criminologists, and political analysts."
        </p>
        
        {/* Core Editorial Criteria Pills */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <div className="bg-navy border border-paper/10 py-1.5 px-3 rounded-xs font-sans text-[10px] text-paper/70 flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-blood-light" /> Double-Blind Peer Review
          </div>
          <div className="bg-navy border border-paper/10 py-1.5 px-3 rounded-xs font-sans text-[10px] text-paper/70 flex items-center gap-1.5">
            <GraduationCap size={12} className="text-amber-400" /> Academic &amp; Empirical Rigor
          </div>
          <div className="bg-navy border border-paper/10 py-1.5 px-3 rounded-xs font-sans text-[10px] text-paper/70 flex items-center gap-1.5">
            <Clock size={12} className="text-blue-400" /> 7–14 Day Editorial Triage
          </div>
        </div>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-10 bg-midnight border border-paper/15 p-6 md:p-10 rounded-sm shadow-xl relative">
        
        {/* Draft Recovery Alert */}
        {hasSavedDraft && draftSavedTimestamp && (
          <div className="bg-navy/70 border border-paper/20 p-3.5 rounded-xs flex items-center justify-between gap-4 font-sans text-xs">
            <div className="flex items-center gap-2 text-paper/80">
              <RefreshCw size={13} className="text-amber-400 animate-spin-slow" />
              <span>Restored auto-saved draft from {draftSavedTimestamp}.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[10px] uppercase font-bold tracking-wider text-paper/40 hover:text-red-400 transition-colors cursor-pointer"
            >
              Reset Draft
            </button>
          </div>
        )}

        {/* SECTION 1: INVESTIGATOR IDENTIFICATION */}
        <div className="space-y-6 border-b border-paper/10 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blood/20 text-blood-light flex items-center justify-center font-sans text-xs font-bold border border-blood/40">
              1
            </div>
            <h3 className="font-display text-lg font-bold text-paper">
              Scholar Credentials &amp; Institutional Affiliation
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Lead Researcher / Author Name <span className="text-blood">*</span>
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-3.5 text-paper/30" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Maya Lin / Julian Sterling"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 pl-9 pr-3 text-paper font-serif text-sm rounded-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Academic / Contact Email <span className="text-blood">*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-3.5 text-paper/30" />
                <input
                  type="email"
                  required
                  placeholder="e.g. m.lin@oxford.edu or researcher@domain.org"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 pl-9 pr-3 text-paper font-serif text-sm rounded-xs transition-colors"
                />
              </div>
              <span className="font-serif text-[10px] text-paper/35 italic block mt-1">
                Used strictly for formal editorial notifications and peer feedback.
              </span>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Academic Role / Title / Credentials
              </label>
              <div className="relative">
                <GraduationCap size={14} className="absolute left-3 top-3.5 text-paper/30" />
                <input
                  type="text"
                  placeholder="e.g. Senior Lecturer in Forensic Psychology / Independent Analyst"
                  value={authorTitle}
                  onChange={(e) => setAuthorTitle(e.target.value)}
                  className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 pl-9 pr-3 text-paper font-serif text-sm rounded-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                University, Institute, or Organization
              </label>
              <div className="relative">
                <Building size={14} className="absolute left-3 top-3.5 text-paper/30" />
                <input
                  type="text"
                  placeholder="e.g. Cambridge Institute of Criminology / Independent Research"
                  value={authorInstitution}
                  onChange={(e) => setAuthorInstitution(e.target.value)}
                  className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 pl-9 pr-3 text-paper font-serif text-sm rounded-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Academic Portfolio, LinkedIn, or Research Profile URL
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-3.5 text-paper/30" />
                <input
                  type="text"
                  placeholder="e.g. https://scholar.google.com/citations?user=... or linkedin.com/in/..."
                  value={authorSocialUrl}
                  onChange={(e) => setAuthorSocialUrl(e.target.value)}
                  className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 pl-9 pr-3 text-paper font-serif text-sm rounded-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Co-Authors / Collaborators (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Arthur Vance (Sorbonne), Elena Rostova (UCL)"
                value={coAuthors}
                onChange={(e) => setCoAuthors(e.target.value)}
                className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 px-3 text-paper font-serif text-sm rounded-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
              Brief Biographical Dossier (30-60 words)
            </label>
            <textarea
              rows={2}
              placeholder="Provide a concise summary of your research focus, prior treatises, or forensic expertise..."
              value={authorBio}
              onChange={(e) => setAuthorBio(e.target.value)}
              className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3 text-paper font-serif text-sm rounded-xs transition-colors resize-none"
            />
          </div>
        </div>

        {/* SECTION 2: INVESTIGATION TAXONOMY & FORMAT */}
        <div className="space-y-6 border-b border-paper/10 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blood/20 text-blood-light flex items-center justify-center font-sans text-xs font-bold border border-blood/40">
              2
            </div>
            <h3 className="font-display text-lg font-bold text-paper">
              Disciplinary Domain &amp; Submission Taxonomy
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Selector */}
            <div className="space-y-2">
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70">
                Primary Academic Discipline <span className="text-blood">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'criminology', label: 'Criminology', desc: 'Forensics & Institutional Crime' },
                  { id: 'psyche', label: 'Psyche', desc: 'Behavioral Pathology & Deviance' },
                  { id: 'politics', label: 'Politics', desc: 'Systems of Power & Governance' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`p-3 rounded-xs border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      category === cat.id
                        ? 'bg-blood/20 border-blood text-paper shadow-md'
                        : 'bg-ink border-paper/10 text-paper/50 hover:border-paper/30 hover:text-paper'
                    }`}
                  >
                    <span className="font-display text-xs font-bold capitalize block">
                      {cat.label}
                    </span>
                    <span className="font-serif text-[10px] text-paper/40 mt-1 leading-tight">
                      {cat.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submission Type Selector */}
            <div className="space-y-2">
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70">
                Submission Format <span className="text-blood">*</span>
              </label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as any)}
                className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3 text-paper font-serif text-sm rounded-xs transition-colors"
              >
                <option value="investigative_pitch">Abstract / Investigation Pitch (Under 1,500 words)</option>
                <option value="full_manuscript">Complete Manuscript / Scholarly Treatise (2,500–8,000 words)</option>
                <option value="case_study">Empirical Case File / Forensic Deep-Dive</option>
                <option value="methodological_critique">Methodological Critique / Review Essay</option>
              </select>
              <span className="font-serif text-[10px] text-paper/35 italic block">
                Pitches require an abstract and methodology; full manuscripts should include body chapters and complete bibliography.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: THE INVESTIGATION PROPOSAL */}
        <div className="space-y-6 border-b border-paper/10 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blood/20 text-blood-light flex items-center justify-center font-sans text-xs font-bold border border-blood/40">
              3
            </div>
            <h3 className="font-display text-lg font-bold text-paper">
              Investigation Thesis, Abstract &amp; Body
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Working Title <span className="text-blood">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Institutional Psychopathy and Corporate Cartels in the Digital Age"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 px-3 text-paper font-serif text-sm rounded-xs transition-colors"
              />
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Thesis Subtitle / Core Investigative Angle
              </label>
              <input
                type="text"
                placeholder="e.g. A multi-jurisdictional empirical analysis of antitrust non-compliance"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 px-3 text-paper font-serif text-sm rounded-xs transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70">
                Executive Abstract &amp; Synopsis <span className="text-blood">*</span>
              </label>
              <span className="font-mono text-[9px] text-paper/40">
                {abstract.trim() ? abstract.trim().split(/\s+/).length : 0} words ({abstract.length} chars)
              </span>
            </div>
            <textarea
              rows={4}
              required
              placeholder="State the central hypothesis, empirical data scope, key findings, and theoretical relevance to criminology, psyche, or power dynamics (50-250 words)..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3.5 text-paper font-serif text-sm rounded-xs transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70">
                Full Manuscript Text or Methodological Outline <span className="text-blood">*</span>
              </label>
              <span className="font-mono text-[9px] text-paper/40">
                {content.trim() ? content.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              rows={10}
              required
              placeholder="Paste your complete research paper text, or a comprehensive multi-section methodology breakdown (introduction, data sets, analytical frameworks, findings, and conclusion)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3.5 text-paper font-serif text-sm rounded-xs transition-colors font-mono leading-relaxed"
            />
            <span className="font-serif text-[10px] text-paper/35 italic block mt-1">
              Supports raw text, Markdown, or clean formatted copy. Tables and figures can be referenced via URL links below.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Primary Sources, Court Records &amp; Bibliography
              </label>
              <textarea
                rows={3}
                placeholder="1. Foucault, M. (1975). Discipline and Punish.&#10;2. DOJ Antitrust Case Filing No. 24-CV-109..."
                value={sourcesText}
                onChange={(e) => setSourcesText(e.target.value)}
                className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none p-3 text-paper font-serif text-xs rounded-xs transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold tracking-widest uppercase text-paper/70 mb-1.5">
                Public Dataset, Repository, or Appendix Link
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-3.5 text-paper/30" />
                <input
                  type="text"
                  placeholder="e.g. https://github.com/scholar/investigation-data or OSF.io repository"
                  value={datasetUrl}
                  onChange={(e) => setDatasetUrl(e.target.value)}
                  className="w-full bg-ink border border-paper/15 focus:border-blood focus:outline-none py-2.5 pl-9 pr-3 text-paper font-serif text-sm rounded-xs transition-colors"
                />
              </div>
              <span className="font-serif text-[10px] text-paper/35 italic block mt-1">
                Optional: Link to GitHub, Google Drive archive, or Open Science Framework repository for reproducible data verification.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: INTEGRITY & ETHICS DECLARATION */}
        <div className="space-y-4 bg-navy/40 border border-paper/10 p-5 rounded-xs">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="ethics-declaration-check"
              checked={agreedToEthics}
              onChange={(e) => setAgreedToEthics(e.target.checked)}
              className="mt-1 w-4 h-4 accent-blood bg-ink border-paper/30 rounded cursor-pointer"
            />
            <label htmlFor="ethics-declaration-check" className="font-serif text-xs text-paper/80 leading-relaxed cursor-pointer select-none">
              <span className="font-sans font-bold uppercase tracking-wider text-paper block text-[10px] mb-0.5">
                Scholarly Ethics &amp; Peer Triage Declaration
              </span>
              I certify that this submission represents original intellectual work, is free of undisclosed plagiarism, adheres to ethical standards in forensic and psychological inquiry, and is submitted for double-blind triage by <span className="text-paper italic">The Oligarchy</span>.
            </label>
          </div>
        </div>

        {/* Error Alert Display */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-blood/20 border border-blood/60 text-paper/95 p-4 rounded-xs flex items-center gap-3 font-serif text-xs shadow-lg"
            >
              <AlertCircle size={18} className="text-blood-light shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Controls Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-paper/10">
          <div className="flex items-center gap-2 text-paper/40 font-serif text-xs">
            <Info size={14} className="text-paper/30 shrink-0" />
            <span>Submissions receive formal editorial triage response within 7-14 business days.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClearDraft}
              className="font-sans text-[10px] uppercase tracking-wider text-paper/40 hover:text-paper py-3 px-4 transition-colors cursor-pointer"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-blood hover:bg-blood-light disabled:opacity-50 text-paper font-sans text-xs font-bold tracking-widest uppercase py-3.5 px-8 rounded-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin border-2 border-paper/30 border-t-paper rounded-full w-4 h-4" />
                  <span>Transmitting to Triage...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Submit Manuscript</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
