import React, { useState, useEffect, useRef } from 'react';
import { db, auth, fetchFullArticle } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { Article, ReadingItem, ResearchTip, ArticleVersion, PeerAnnotation, ManuscriptSubmission, CoAuthor, EditorialRole, EditorialUser, AuthorProfile } from '../types';
import QuillEditor from './QuillEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import ReviewQueuePipeline from './ReviewQueuePipeline';
import EditorialTeamManager from './EditorialTeamManager';
import AuthorManager from './AuthorManager';
import DraftInternalNotes from './DraftInternalNotes';
import ContributorDashboard from './ContributorDashboard';
import SiteContentManager from './SiteContentManager';
import { fetchContributors } from '../utils/contributors';
import { rbac, ROLE_LABELS, resolveEditorialUser } from '../lib/rbac';
import { 
  Plus, 
  FileEdit, 
  Trash2, 
  Copy, 
  Sparkles, 
  CheckCircle, 
  Database, 
  LogOut, 
  Lock, 
  Clock, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  Mail, 
  BookOpen, 
  Eye, 
  History, 
  Check, 
  FileText,
  Upload,
  Send,
  FileSpreadsheet,
  FileUp,
  MessageSquare,
  Shield,
  GraduationCap,
  Users,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Search,
  Globe
} from 'lucide-react';

// Helper to recursively scrub undefined values from object payloads before sending to Firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === undefined) return undefined as any;
  if (obj === null) return null as any;

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as any;
  }

  if (typeof obj === 'object') {
    const clean = { ...obj } as any;
    Object.keys(clean).forEach((key) => {
      if (clean[key] === undefined) {
        delete clean[key];
      } else {
        clean[key] = cleanUndefined(clean[key]);
      }
    });
    return clean;
  }

  return obj;
}

interface AdminDashboardProps {
  onLogout: () => void;
  allArticles: Article[];
  refreshArticles: () => Promise<void>;
  user?: any;
}

export default function AdminDashboard({ onLogout, allArticles, refreshArticles }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'articles' | 'authors' | 'pitches' | 'tips' | 'reading' | 'analytics' | 'settings' | 'subscribers' | 'discourse' | 'team' | 'contributor_dashboard'>('write');
  
  // Editorial RBAC & Persona Simulation States
  const [currentUser, setCurrentUser] = useState<EditorialUser | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<EditorialRole | null>(() => {
    return (localStorage.getItem('tol_simulated_role') as EditorialRole) || null;
  });

  const effectiveRole: EditorialRole = simulatedRole || currentUser?.role || 'admin';
  const roleMeta = ROLE_LABELS[effectiveRole] || ROLE_LABELS.admin;

  // Registered Contributors & Authors List
  const [contributors, setContributors] = useState<AuthorProfile[]>([]);

  // Submissions Pipeline & Manuscript Drafts
  const [allSubmissions, setAllSubmissions] = useState<ManuscriptSubmission[]>([]);
  const [notesArticleModal, setNotesArticleModal] = useState<Article | null>(null);

  // Write Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<'criminology' | 'psyche' | 'politics'>('criminology');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [canvaEmbed, setCanvaEmbed] = useState('');
  const [pdfLink, setPdfLink] = useState('');
  const [readTime, setReadTime] = useState('5 min read');
  const [publishDate, setPublishDate] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [seriesName, setSeriesName] = useState('');
  const [seriesPart, setSeriesPart] = useState<number | ''>('');
  const [authorId, setAuthorId] = useState('priyasha-priyal-jena');
  const [authorName, setAuthorName] = useState('Priyasha Priyal Jena');
  const [authorOrcid, setAuthorOrcid] = useState('');
  const [doi, setDoi] = useState('');
  const [coAuthors, setCoAuthors] = useState<CoAuthor[]>([]);
  const [newCoName, setNewCoName] = useState('');
  const [newCoRole, setNewCoRole] = useState('');
  const [newCoAffiliation, setNewCoAffiliation] = useState('');
  const [newCoOrcid, setNewCoOrcid] = useState('');
  const [newCoEmail, setNewCoEmail] = useState('');
  const [sources, setSources] = useState<Array<{ category: any; title: string; url?: string; citation?: string }>>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);

  // Dedicated Search Engine Optimization (SEO) States
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // New Source Item Temp States
  const [newSrcCat, setNewSrcCat] = useState<'academic' | 'government' | 'book' | 'court' | 'database' | 'investigative'>('academic');
  const [newSrcTitle, setNewSrcTitle] = useState('');
  const [newSrcUrl, setNewSrcUrl] = useState('');
  const [newSrcCitation, setNewSrcCitation] = useState('');

  // Reader Tips & Newsletter Lists
  const [tips, setTips] = useState<ResearchTip[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  
  // Reading Stack list
  const [readingStack, setReadingStack] = useState<ReadingItem[]>([]);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookLink, setNewBookLink] = useState('');

  // Security Credentials Overrides (Instagram-style settings)
  const [newSecurityKey, setNewSecurityKey] = useState('');
  const [confirmSecurityKey, setConfirmSecurityKey] = useState('');

  // Status/Alert Indicators
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [autoSaveActive, setAutoSaveActive] = useState(false);

  // Gemini AI Category & Tags suggestion state
  const [isSuggestingMetadata, setIsSuggestingMetadata] = useState(false);
  const [aiMetadataReasoning, setAiMetadataReasoning] = useState<string | null>(null);

  // Track editor changes for auto-save
  const lastSavedContent = useRef<string>('');

  // Drag and Drop & Image Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Resend / Newsletter Campaign states
  const [resendApiKey, setResendApiKey] = useState(() => localStorage.getItem('tol_resend_api_key') || '');
  const [selectedCampaignArticleId, setSelectedCampaignArticleId] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignHtml, setCampaignHtml] = useState('');
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignSuccessCount, setCampaignSuccessCount] = useState<number | null>(null);

  // Peer Discourse / Marginalia Board Moderation State
  const [allReviews, setAllReviews] = useState<PeerAnnotation[]>([]);
  const [unverifiedReviewsCount, setUnverifiedReviewsCount] = useState(0);

  // Review Queue / Manuscript Pitches Triage Counter
  const [pendingPitchesCount, setPendingPitchesCount] = useState(0);

  // Sandbox-compatible custom deletion confirmation states
  const [deleteConfirmReviewId, setDeleteConfirmReviewId] = useState<string | null>(null);
  const [deleteConfirmReplyId, setDeleteConfirmReplyId] = useState<{ reviewId: string; replyId: string } | null>(null);
  const [deleteConfirmSubscriberId, setDeleteConfirmSubscriberId] = useState<string | null>(null);
  const [deleteConfirmArticleId, setDeleteConfirmArticleId] = useState<string | null>(null);

  useEffect(() => {
    // Resolve current editorial user and role
    const initRole = async () => {
      const authUser = auth.currentUser || { email: 'theoligarchy.ppj@gmail.com', uid: 'founder-priyasha' };
      const resolved = await resolveEditorialUser(authUser);
      setCurrentUser(resolved);
      
      // Prefill author fields if author
      if (resolved.role === 'author') {
        setAuthorName(resolved.displayName || 'Scholar Contributor');
        setAuthorId(resolved.authorId || 'scholar-contributor');
        if (resolved.orcid) setAuthorOrcid(resolved.orcid);
      }
    };
    initRole();

    // Load Tips, Subscribers, Reading Stack, Reviews, Pitches, and Contributors
    loadTips();
    loadSubscribers();
    loadReadingStack();
    loadReviews();
    loadPitchesCount();
    loadContributorsList();

    // Auto-save loop: triggers every 15 seconds if content changes
    const autoSaveInterval = setInterval(() => {
      triggerAutoSave();
    }, 15000);

    // Look for recovered crash draft in localStorage on mount
    const recovered = localStorage.getItem('tol_autosave_recovery');
    if (recovered) {
      try {
        const parsed = JSON.parse(recovered);
        setAlert({
          text: `A crash recovery draft for "${parsed.title || 'Untitled'}" is available. Fill in form and restore it?`,
          type: 'success'
        });
      } catch (e) {
        console.error(e);
      }
    }

    return () => clearInterval(autoSaveInterval);
  }, [content, title]);

  const handleSwitchSimulatedRole = (newRole: EditorialRole | null) => {
    if (newRole) {
      localStorage.setItem('tol_simulated_role', newRole);
    } else {
      localStorage.removeItem('tol_simulated_role');
    }
    setSimulatedRole(newRole);

    // If active tab is now unauthorized, navigate to appropriate home tab
    if (newRole === 'author') {
      if (['tips', 'reading', 'subscribers', 'analytics', 'settings', 'team', 'discourse'].includes(activeTab)) {
        setActiveTab('contributor_dashboard');
      }
    } else if (newRole === 'reviewer' && ['tips', 'subscribers', 'settings', 'team', 'contributor_dashboard'].includes(activeTab)) {
      setActiveTab('pitches');
    }
    setAlert({ 
      text: newRole ? `Previewing interface as ${ROLE_LABELS[newRole].title}. Access permissions updated.` : 'Restored default editorial permissions.', 
      type: 'success' 
    });
  };

  const loadTips = async () => {
    try {
      const col = collection(db, 'tips');
      const q = query(col, orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ResearchTip));
      setTips(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubscribers = async () => {
    // Load Subscribers list
    try {
      const col = collection(db, 'subscribers');
      const snap = await getDocs(col);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubscribers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReviews = async () => {
    try {
      const col = collection(db, 'peer_reviews');
      const q = query(col, orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PeerAnnotation));
      setAllReviews(list);
      setUnverifiedReviewsCount(list.filter(r => !r.isVerifiedPeer).length);
    } catch (e) {
      console.error("Error loading reviews for admin moderation:", e);
    }
  };

  const loadContributorsList = async () => {
    try {
      const list = await fetchContributors();
      setContributors(list);
    } catch (e) {
      console.error("Error fetching contributors list in admin:", e);
    }
  };

  const loadPitchesCount = async () => {
    try {
      let count = 0;
      let submissionsList: ManuscriptSubmission[] = [];
      try {
        const col = collection(db, 'submissions');
        const snap = await getDocs(col);
        submissionsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ManuscriptSubmission));
        count = snap.docs.filter(d => d.data().status === 'received' || d.data().status === 'in_peer_review').length;
      } catch (err) {}

      try {
        const localSubs = JSON.parse(localStorage.getItem('tol_local_submissions') || '[]');
        if (localSubs.length > 0) {
          if (submissionsList.length === 0) {
            submissionsList = localSubs;
          }
          if (count === 0) {
            count = localSubs.filter((s: any) => s.status === 'received' || s.status === 'in_peer_review').length;
          }
        }
      } catch (e) {}

      setAllSubmissions(submissionsList);
      setPendingPitchesCount(count);
    } catch (e) {
      console.error("Error loading pitches count:", e);
    }
  };

  const handleConvertPitchToArticle = (submission: ManuscriptSubmission) => {
    setEditingId(null);
    setTitle(submission.title);
    setSubtitle(submission.subtitle || '');
    setSlug(generateAutoSlug(submission.title));
    setCategory(submission.category);
    setExcerpt(submission.abstract);
    setContent(submission.content);
    setAuthorName(submission.authorName);
    setAuthorId(submission.authorName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    setTags([submission.category, submission.submissionType.replace('_', ' ')]);
    setStatus('draft');
    setIsFeatured(false);
    setIsPinned(false);
    setMetaTitle(submission.title);
    setMetaDescription(submission.abstract || '');
    setCanonicalUrl('');
    
    // Parse sourcesText into sources list if present
    if (submission.sourcesText) {
      const parsedSources: Array<{ category: any; title: string; url?: string; citation?: string }> = [];
      const lines = submission.sourcesText.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        parsedSources.push({
          category: 'academic',
          title: line.replace(/^[\d\.\-\*]+\s*/, ''),
          citation: 'Submitted with Investigation'
        });
      });
      if (submission.datasetUrl) {
        parsedSources.push({
          category: 'database',
          title: 'Primary Investigation Dataset',
          url: submission.datasetUrl
        });
      }
      setSources(parsedSources);
    }

    setAlert({
      text: `Investigation manuscript "${submission.title}" converted into post editor draft! Review and publish when ready.`,
      type: 'success'
    });
    setActiveTab('write');
  };

  const handleToggleVerifyReview = async (reviewId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'peer_reviews', reviewId), {
        isVerifiedPeer: !currentStatus
      });
      setAlert({ text: `Peer review verification toggled successfully.`, type: 'success' });
      await loadReviews();
    } catch (e: any) {
      setAlert({ text: `Failed to update verification status: ${e.message}`, type: 'error' });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'peer_reviews', reviewId));
      setAlert({ text: 'Peer review successfully deleted.', type: 'success' });
      setDeleteConfirmReviewId(null);
      await loadReviews();
    } catch (e: any) {
      setAlert({ text: `Failed to delete peer review: ${e.message}`, type: 'error' });
    }
  };

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    try {
      const reviewDocRef = doc(db, 'peer_reviews', reviewId);
      const review = allReviews.find(r => r.id === reviewId);
      if (!review) return;
      const updatedReplies = review.replies.filter((r: any) => r.id !== replyId);
      await updateDoc(reviewDocRef, {
        replies: updatedReplies
      });
      setAlert({ text: 'Reply successfully removed from discourse.', type: 'success' });
      setDeleteConfirmReplyId(null);
      await loadReviews();
    } catch (e: any) {
      setAlert({ text: `Failed to delete reply: ${e.message}`, type: 'error' });
    }
  };

  // CSV Subscriber Exporter (Client-side download)
  const exportSubscribersToCSV = () => {
    if (subscribers.length === 0) {
      setAlert({ text: 'No subscribers to export.', type: 'error' });
      return;
    }
    const headers = ['Email', 'Subscribed At'];
    const rows = subscribers.map(sub => [
      sub.email,
      new Date(sub.subscribedAt || Date.now()).toISOString()
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `theoligarchy_subscribers_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAlert({ text: 'Subscribers successfully exported as CSV.', type: 'success' });
  };

  // Delete Newsletter Subscriber from Registry
  const handleDeleteSubscriber = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'subscribers', id));
      setSubscribers(prev => prev.filter(s => s.id !== id));
      setAlert({ text: 'Subscriber successfully removed from mailing list.', type: 'success' });
      setDeleteConfirmSubscriberId(null);
    } catch (e: any) {
      setAlert({ text: `Failed to delete subscriber: ${e.message}`, type: 'error' });
    }
  };

  // Resize and compress files locally as fail-safe Base64 representation
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; // Optimal width for high-density banner display
          const scale = MAX_WIDTH / img.width;
          
          if (img.width > MAX_WIDTH) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scale;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82); // 82% quality yields ultra-high-fidelity under 120KB
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Integrated direct/fallback drag-drop image uploader
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAlert({ text: 'Please upload an image file (PNG, JPG, WEBP).', type: 'error' });
      return;
    }

    setIsUploading(true);
    setUploadProgress('Compressing image locally...');

    let base64Data = '';
    try {
      base64Data = await compressImageToBase64(file);
    } catch (compressErr: any) {
      console.error('Local compression failed:', compressErr);
      setAlert({ text: `Local image compression failed: ${compressErr.message}`, type: 'error' });
      setIsUploading(false);
      setUploadProgress(null);
      return;
    }

    setUploadProgress('Uploading to Firebase...');

    try {
      // Attempt Firebase Storage upload with a strict 2-second timeout
      const storageUploadPromise = (async () => {
        const { ref: sRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage: fStorage } = await import('../firebase');
        
        const fileRef = sRef(fStorage, `banners/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('Firebase Storage request timed out (2s)')), 2000)
      );

      // Race the upload against the 2-second timeout
      const downloadURL = await Promise.race([storageUploadPromise, timeoutPromise]);
      
      setFeaturedImage(downloadURL);
      setAlert({ text: 'Banner image successfully uploaded to Firebase Storage.', type: 'success' });
    } catch (error: any) {
      console.warn('Firebase Storage upload failed or timed out. Falling back to optimized local Base64...', error);
      // Fallback is already computed, use it instantly!
      setFeaturedImage(base64Data);
      setAlert({ 
        text: 'Banner uploaded and optimized locally (Firebase Storage fallback triggered).', 
        type: 'success' 
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleImageUpload(e.target.files[0]);
    }
  };

  // Generate gorgeous academic campaign newsletter template
  const handleSelectCampaignArticle = (artId: string) => {
    setSelectedCampaignArticleId(artId);
    const art = allArticles.find(a => a.id === artId);
    if (art) {
      setCampaignSubject(`[The Oligarchy] New Critical Analysis: ${art.title}`);
      
      const emailBody = `
<div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; border: 1px solid #e0e0e0; background-color: #ffffff; color: #1a1208; text-align: left;">
  <div style="text-align: center; border-bottom: 3px double #8b1a1a; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 38px; margin: 0; color: #000000; font-weight: bold; letter-spacing: 1.5px;">The Oligarchy</h1>
    <p style="font-style: italic; font-size: 13px; color: #555555; margin: 8px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase;">Journal of Critical Inquiry &amp; Power Systems</p>
  </div>
  
  ${art.featuredImage ? `<div style="text-align: center; margin-bottom: 25px;"><img src="${art.featuredImage}" alt="${art.title}" style="width: 100%; max-width: 560px; height: auto; object-fit: cover; border-radius: 1px;" /></div>` : ''}
  
  <div style="margin-bottom: 10px;">
    <span style="font-size: 10px; font-weight: bold; font-family: sans-serif; letter-spacing: 2px; text-transform: uppercase; color: #8b1a1a; border-bottom: 1px solid #8b1a1a; padding-bottom: 2px;">NEW RELEASE</span>
    <span style="font-size: 11px; font-family: sans-serif; color: #777777; margin-left: 12px;">• ${art.readTime || '10 min read'}</span>
  </div>
  
  <h2 style="font-size: 26px; font-weight: bold; color: #111111; line-height: 1.25; margin-top: 5px; margin-bottom: 10px;">${art.title}</h2>
  ${art.subtitle ? `<h3 style="font-size: 17px; font-weight: normal; font-style: italic; color: #444444; margin-top: 0; margin-bottom: 20px; line-height: 1.4;">${art.subtitle}</h3>` : ''}
  
  <div style="font-size: 15px; line-height: 1.65; color: #222222; margin-bottom: 25px; font-family: 'Georgia', serif;">
    <p style="margin: 0; text-indent: 20px;">${art.excerpt}</p>
  </div>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="https://theoligarchy.in/?art=${art.id}" style="background-color: #8b1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 12px; font-weight: bold; font-family: sans-serif; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 1px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Access Full Investigation</a>
  </div>
  
  <p style="font-size: 13px; font-style: italic; color: #555555; margin-bottom: 30px; font-family: 'Georgia', serif; line-height: 1.5; border-left: 2px solid #8b1a1a; padding-left: 15px;">
    "To understand the systemic nature of power, we must examine the silent, structural levers of bureaucracies, psyches, and institutions."
  </p>
  
  <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 40px; font-size: 11px; font-family: sans-serif; color: #888888; text-align: center; line-height: 1.6;">
    <p style="margin: 0 0 5px 0;">You are receiving this alert because you subscribed to the independent research platform at <a href="https://theoligarchy.in" style="color: #8b1a1a; text-decoration: none; font-weight: bold;">theoligarchy.in</a>.</p>
    <p style="margin: 0;">© ${new Date().getFullYear()} The Oligarchy · Criminology, Psyche &amp; Politics. All rights reserved.</p>
  </div>
</div>
      `;
      setCampaignHtml(emailBody);
    } else {
      setCampaignSubject('');
      setCampaignHtml('');
    }
  };

  // Direct send hook via Resend Transactional Email API
  const handleSendCampaign = async () => {
    if (!resendApiKey.trim()) {
      setAlert({ text: 'Please configure your Resend API Key inside the Newsletter tab.', type: 'error' });
      return;
    }
    if (!campaignSubject.trim() || !campaignHtml.trim()) {
      setAlert({ text: 'Subject line and HTML email content cannot be empty.', type: 'error' });
      return;
    }
    if (subscribers.length === 0) {
      setAlert({ text: 'Mailing list has 0 active subscribers. Unable to dispatch campaign.', type: 'error' });
      return;
    }

    setIsSendingCampaign(true);
    setCampaignSuccessCount(null);
    localStorage.setItem('tol_resend_api_key', resendApiKey.trim());

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey.trim()}`
        },
        body: JSON.stringify({
          from: 'The Oligarchy <newsletter@theoligarchy.in>',
          to: subscribers.map(s => s.email),
          subject: campaignSubject.trim(),
          html: campaignHtml
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}`);
      }

      setCampaignSuccessCount(subscribers.length);
      setAlert({ text: `Newsletter campaign successfully dispatched to all ${subscribers.length} subscribers!`, type: 'success' });
    } catch (err: any) {
      console.error('Direct Resend delivery failed:', err);
      setAlert({ 
        text: `Resend Domain Validation Required: Direct dispatch aborted. However, you can still copy the HTML campaign below to send via your Resend/Mailchimp account!`, 
        type: 'error' 
      });
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const loadReadingStack = async () => {
    try {
      const col = collection(db, 'reading');
      const q = query(col, orderBy('addedAt', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReadingItem));
      setReadingStack(list);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to generate dynamic slugs
  const generateAutoSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!slug) {
      setSlug(generateAutoSlug(val));
    }
  };

  // Tag list helpers
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Gemini AI Category & Tag auto-suggestion handler
  const handleSuggestMetadata = async () => {
    const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title.trim() && !plainContent && !excerpt.trim()) {
      setAlert({
        text: 'Please enter an article title, excerpt, or draft text content before requesting Gemini AI suggestions.',
        type: 'error'
      });
      return;
    }

    setIsSuggestingMetadata(true);
    setAiMetadataReasoning(null);

    try {
      const res = await fetch('/api/suggest-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle,
          excerpt,
          content: plainContent.slice(0, 10000)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini metadata suggestion failed');
      }

      if (data.category && ['criminology', 'psyche', 'politics'].includes(data.category)) {
        setCategory(data.category as 'criminology' | 'psyche' | 'politics');
      }

      if (Array.isArray(data.tags) && data.tags.length > 0) {
        const cleanedNewTags = data.tags
          .map((t: string) => t.toLowerCase().replace(/[^a-z0-9\-]/g, '').trim())
          .filter(Boolean);
        const mergedTags = Array.from(new Set([...tags, ...cleanedNewTags]));
        setTags(mergedTags);
      }

      if (data.reasoning) {
        setAiMetadataReasoning(data.reasoning);
      }

      setAlert({
        text: `✨ Gemini suggested Category: "${(data.category || '').toUpperCase()}" and added ${data.tags?.length || 0} metadata tags!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Gemini metadata suggestion error:', err);
      setAlert({
        text: err.message || 'Error generating AI suggestions for category and tags.',
        type: 'error'
      });
    } finally {
      setIsSuggestingMetadata(false);
    }
  };

  // Source attachment handlers
  const addSourceItem = () => {
    if (!newSrcTitle.trim()) return;
    setSources([...sources, {
      category: newSrcCat,
      title: newSrcTitle.trim(),
      url: newSrcUrl.trim() || undefined,
      citation: newSrcCitation.trim() || undefined
    }]);
    setNewSrcTitle('');
    setNewSrcUrl('');
    setNewSrcCitation('');
  };

  const removeSourceItem = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  // Co-Author management helpers
  const addCoAuthorItem = () => {
    if (!newCoName.trim()) return;
    const newCo: CoAuthor = {
      name: newCoName.trim(),
      role: newCoRole.trim() || undefined,
      institution: newCoAffiliation.trim() || undefined,
      orcid: newCoOrcid.trim() || undefined,
      email: newCoEmail.trim() || undefined
    };
    setCoAuthors([...coAuthors, newCo]);
    setNewCoName('');
    setNewCoRole('');
    setNewCoAffiliation('');
    setNewCoOrcid('');
    setNewCoEmail('');
  };

  const removeCoAuthorItem = (index: number) => {
    setCoAuthors(coAuthors.filter((_, i) => i !== index));
  };

  // Auto save draft locally for crash recovery
  const triggerAutoSave = () => {
    if (!content || content === lastSavedContent.current || content === '<p><br></p>') return;
    
    const draftData = {
      title,
      subtitle,
      excerpt,
      content,
      category,
      tags,
      slug,
      metaTitle,
      metaDescription,
      canonicalUrl,
      savedAt: Date.now()
    };
    localStorage.setItem('tol_autosave_recovery', JSON.stringify(draftData));
    lastSavedContent.current = content;
    setAutoSaveActive(true);
    setTimeout(() => setAutoSaveActive(false), 3000);
  };

  const restoreRecoveryDraft = () => {
    const recovered = localStorage.getItem('tol_autosave_recovery');
    if (recovered) {
      try {
        const parsed = JSON.parse(recovered);
        setTitle(parsed.title || '');
        setSubtitle(parsed.subtitle || '');
        setExcerpt(parsed.excerpt || '');
        setContent(parsed.content || '');
        setCategory(parsed.category || 'criminology');
        setTags(parsed.tags || []);
        setSlug(parsed.slug || '');
        setMetaTitle(parsed.metaTitle || '');
        setMetaDescription(parsed.metaDescription || '');
        setCanonicalUrl(parsed.canonicalUrl || '');
        
        localStorage.removeItem('tol_autosave_recovery');
        setAlert({ text: 'Crash draft restored successfully.', type: 'success' });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Publish / Save Draft Action
  const handleSavePost = async (forcedStatus?: 'draft' | 'published') => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setAlert({ text: 'Please populate all mandatory fields: Title, Content, Slug.', type: 'error' });
      return;
    }

    const isAuthorOnly = effectiveRole === 'author';
    const currentStatus = isAuthorOnly ? 'draft' : (forcedStatus || status);
    const finalIsFeatured = isAuthorOnly ? false : isFeatured;
    const finalIsPinned = isAuthorOnly ? false : isPinned;

    // Smart calculated read-time estimation
    const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    const computedReadTime = `${Math.max(3, Math.ceil(words / 200))} min read`;

    // Construct article JSON payload
    const finalId = editingId || `art-${Date.now().toString(36)}`;
    
    // Find editing article to preserve versions
    const existingArt = allArticles.find(a => a.id === finalId);
    let updatedVersions: ArticleVersion[] = existingArt?.versions || [];

    if (existingArt) {
      // Append last state to edit history
      const newVersion: ArticleVersion = {
        id: `ver-${Date.now()}`,
        timestamp: Date.now(),
        title: existingArt.title,
        excerpt: existingArt.excerpt,
        content: existingArt.content,
        updatedBy: auth.currentUser?.email || currentUser?.email || 'admin'
      };
      updatedVersions = [newVersion, ...updatedVersions].slice(0, 10); // Keep last 10 versions
    }

    const articleData: Article = {
      id: finalId,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      slug: slug.trim(),
      category,
      tags,
      featuredImage: featuredImage.trim() || undefined,
      canvaEmbed: canvaEmbed.trim() || undefined,
      pdfLink: pdfLink.trim() || undefined,
      authorId: authorId.trim() || currentUser?.authorId || 'scholar-contributor',
      authorName: authorName.trim() || currentUser?.displayName || 'Scholar Contributor',
      authorOrcid: authorOrcid.trim() || currentUser?.orcid || undefined,
      createdByUid: existingArt?.createdByUid || currentUser?.uid || auth.currentUser?.uid,
      createdByEmail: existingArt?.createdByEmail || currentUser?.email || auth.currentUser?.email || undefined,
      doi: doi.trim() || undefined,
      coAuthors: coAuthors.length > 0 ? coAuthors : undefined,
      readTime: computedReadTime,
      excerpt: excerpt.trim() || title.trim(),
      content: content,
      status: currentStatus,
      publishDate: currentStatus === 'published' ? (publishDate.trim() || existingArt?.publishDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })) : undefined,
      createdAt: existingArt?.createdAt || Date.now(),
      updatedAt: Date.now(),
      views: existingArt?.views || 0,
      isFeatured: finalIsFeatured,
      isPinned: finalIsPinned,
      sources,
      seriesName: seriesName.trim() || undefined,
      seriesPart: typeof seriesPart === 'number' ? seriesPart : undefined,
      versions: updatedVersions,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      seoTitle: metaTitle.trim() || title.trim(),
      seoDescription: metaDescription.trim() || excerpt.trim() || undefined,
      canonicalUrl: canonicalUrl.trim() || undefined
    };

    try {
      await setDoc(doc(db, 'articles', finalId), cleanUndefined(articleData));
      
      // If marked as featured, toggle all other featured pins off
      if (finalIsFeatured) {
        for (const art of allArticles) {
          if (art.id !== finalId && art.isFeatured) {
            await updateDoc(doc(db, 'articles', art.id), { isFeatured: false });
          }
        }
      }

      // If submitted for peer review by author, also ensure a submission entry exists in submissions collection
      if (isAuthorOnly && forcedStatus === 'published') {
        const subCol = collection(db, 'submissions');
        await addDoc(subCol, {
          title: title.trim(),
          category,
          authorName: authorName.trim() || currentUser?.displayName || 'Scholar Contributor',
          authorEmail: currentUser?.email || auth.currentUser?.email || '',
          affiliation: currentUser?.institution || '',
          orcid: authorOrcid.trim() || currentUser?.orcid || '',
          abstract: excerpt.trim() || title.trim(),
          submittedAt: Date.now(),
          status: 'under_review',
          articleId: finalId
        });
        setAlert({ text: `Manuscript "${title}" submitted to the Peer Review Queue for editorial evaluation.`, type: 'success' });
      } else {
        setAlert({ text: `Manuscript saved successfully as ${currentStatus.toUpperCase()}.`, type: 'success' });
      }

      clearWriteForm();
      await refreshArticles();
      localStorage.removeItem('tol_autosave_recovery');
      setActiveTab('articles');
    } catch (e: any) {
      setAlert({ text: `Save failed: ${e.message}`, type: 'error' });
    }
  };

  const clearWriteForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setSlug('');
    setCategory('criminology');
    setTags([]);
    setTagInput('');
    setFeaturedImage('');
    setCanvaEmbed('');
    setPdfLink('');
    setReadTime('5 min read');
    setPublishDate('');
    setExcerpt('');
    setContent('');
    setStatus('draft');
    setIsFeatured(false);
    setIsPinned(false);
    setSeriesName('');
    setSeriesPart('');
    setAuthorId('priyasha-priyal-jena');
    setAuthorName('Priyasha Priyal Jena');
    setAuthorOrcid('');
    setDoi('');
    setCoAuthors([]);
    setNewCoName('');
    setNewCoRole('');
    setNewCoAffiliation('');
    setNewCoOrcid('');
    setNewCoEmail('');
    setSources([]);
    setSelectedVersionIndex(null);
    setAiMetadataReasoning(null);
    setMetaTitle('');
    setMetaDescription('');
    setCanonicalUrl('');
  };

  const handleEditArticle = async (art: Article) => {
    setEditingId(art.id);
    setTitle(art.title);
    setSubtitle(art.subtitle || '');
    setSlug(art.slug);
    setCategory(art.category);
    setTags(art.tags || []);
    setFeaturedImage(art.featuredImage || '');
    setCanvaEmbed(art.canvaEmbed || '');
    setPdfLink(art.pdfLink || '');
    setReadTime(art.readTime || '5 min read');
    setPublishDate(art.publishDate || '');
    setExcerpt(art.excerpt || '');
    setContent(art.content || '');
    setStatus(art.status);
    setIsFeatured(art.isFeatured || false);
    setIsPinned(art.isPinned || false);
    setSeriesName(art.seriesName || '');
    setSeriesPart(art.seriesPart || '');
    setAuthorId(art.authorId || 'priyasha-priyal-jena');
    setAuthorName(art.authorName || 'Priyasha Priyal Jena');
    setAuthorOrcid(art.authorOrcid || '');
    setDoi(art.doi || '');
    setCoAuthors(art.coAuthors || []);
    setNewCoName('');
    setNewCoRole('');
    setNewCoAffiliation('');
    setNewCoOrcid('');
    setNewCoEmail('');
    setSources(art.sources || []);
    setSelectedVersionIndex(null);
    setMetaTitle(art.metaTitle || art.seoTitle || '');
    setMetaDescription(art.metaDescription || art.seoDescription || '');
    setCanonicalUrl(art.canonicalUrl || '');
    setActiveTab('write');

    // If full content is not in summary payload, fetch full manuscript on demand
    if (!art.content || art.content.length < 50 || !art.sources || art.sources.length === 0) {
      try {
        const full = await fetchFullArticle(art.id);
        if (full) {
          if (full.content) setContent(full.content);
          if (full.sources) setSources(full.sources);
        }
      } catch (err) {
        console.error("Failed to fetch full article body for editing:", err);
      }
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'articles', id));
      setAlert({ text: 'Article deleted successfully.', type: 'success' });
      setDeleteConfirmArticleId(null);
      await refreshArticles();
    } catch (e: any) {
      setAlert({ text: `Deletion failed: ${e.message}`, type: 'error' });
    }
  };

  const handleDuplicateArticle = async (art: Article) => {
    try {
      let fullArticleData = art;
      if (!art.content || art.content.length < 50) {
        const full = await fetchFullArticle(art.id);
        if (full) fullArticleData = full;
      }

      const dupId = `art-dup-${Date.now().toString(36)}`;
      const duplicated: Article = {
        ...fullArticleData,
        id: dupId,
        title: `${art.title} (Duplicated)`,
        slug: `${art.slug}-copy`,
        status: 'draft',
        isFeatured: false,
        isPinned: false,
        views: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'articles', dupId), cleanUndefined(duplicated));
      setAlert({ text: 'Article duplicated as Draft.', type: 'success' });
      await refreshArticles();
    } catch (e: any) {
      setAlert({ text: `Duplication failed: ${e.message}`, type: 'error' });
    }
  };

  // Restore past version from edit history
  const handleRestoreVersion = (ver: ArticleVersion) => {
    setTitle(ver.title);
    setExcerpt(ver.excerpt);
    setContent(ver.content);
    setAlert({ text: 'Form populated with historical version state. Review and click Save to finalize.', type: 'success' });
    setSelectedVersionIndex(null);
  };

  // Toggle Live/Draft directly from table
  const handleTogglePublish = async (art: Article) => {
    const nextStatus = art.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'articles', art.id), { 
        status: nextStatus,
        publishDate: nextStatus === 'published' ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
      });
      setAlert({ text: `Article set to ${nextStatus.toUpperCase()}.`, type: 'success' });
      await refreshArticles();
    } catch (e: any) {
      setAlert({ text: `Toggle failed: ${e.message}`, type: 'error' });
    }
  };

  // Reading Stack Managers
  const handleAddBook = async () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;
    if (readingStack.length >= 5) {
      setAlert({ text: 'Reading stack limited to 5 concurrent entries to maintain clean layout rhythm.', type: 'error' });
      return;
    }
    const id = `book-${Date.now()}`;
    const newBook: ReadingItem = {
      id,
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      link: newBookLink.trim() || undefined,
      addedAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'reading', id), cleanUndefined(newBook));
      setAlert({ text: 'Book successfully added to reading shelf.', type: 'success' });
      setNewBookTitle('');
      setNewBookAuthor('');
      setNewBookLink('');
      await loadReadingStack();
    } catch (e: any) {
      setAlert({ text: `Failed to add book: ${e.message}`, type: 'error' });
    }
  };

  const handleRemoveBook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reading', id));
      setAlert({ text: 'Book removed from shelf.', type: 'success' });
      await loadReadingStack();
    } catch (e: any) {
      setAlert({ text: `Failed to remove book: ${e.message}`, type: 'error' });
    }
  };

  // Mark Reader Tips as read
  const handleMarkTipRead = async (tipId: string, isRead: boolean) => {
    try {
      await updateDoc(doc(db, 'tips', tipId), { isRead: !isRead });
      await loadTips();
    } catch (e) {
      console.error(e);
    }
  };

  // Securely update Administrator Password (Instagram-Style settings)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecurityKey.trim()) {
      setAlert({ text: 'Security override key cannot be empty.', type: 'error' });
      return;
    }
    if (newSecurityKey !== confirmSecurityKey) {
      setAlert({ text: 'Keys do not match.', type: 'error' });
      return;
    }
    
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newSecurityKey);
        setAlert({ text: 'Administrator security override key updated successfully.', type: 'success' });
        setNewSecurityKey('');
        setConfirmSecurityKey('');
      }
    } catch (e: any) {
      setAlert({ text: `Security update rejected: ${e.message}`, type: 'error' });
    }
  };

  const handleSignOutAction = async () => {
    try {
      localStorage.removeItem('local_admin_session');
      await signOut(auth);
      onLogout();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-midnight flex flex-col md:flex-row border-t border-paper/10 select-none">
      
      {/* Side Navigation panel */}
      <aside className="w-full md:w-60 bg-ink border-b md:border-b-0 md:border-r border-paper/10 flex flex-col pt-6 md:h-screen md:sticky md:top-0">
        <div className="px-6 pb-6 border-b border-paper/10">
          <span className="font-gothic text-2xl text-paper tracking-wider">The Oligarchy</span>
          <p className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase mt-1">
            Editorial Panel
          </p>
        </div>

        <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible divide-x md:divide-x-0 md:divide-y divide-paper/5 py-2 md:py-4 shrink-0">
          {[
            { id: 'contributor_dashboard', label: effectiveRole === 'author' ? '📊 Scholar Overview' : '📊 Contributor Hub', roles: ['admin', 'author'] },
            { id: 'write', label: effectiveRole === 'author' ? '✏ Write Manuscript' : '✏ Write Post', roles: ['admin', 'author'] },
            { id: 'articles', label: effectiveRole === 'author' ? '📋 My Manuscripts' : effectiveRole === 'reviewer' ? '📋 Scholarly Corpus' : '📋 All Articles', roles: ['admin', 'reviewer', 'author'] },
            { id: 'authors', label: `👥 Authors (${contributors.length})`, roles: ['admin'] },
            { id: 'pitches', label: effectiveRole === 'author' ? `📑 My Submissions (${pendingPitchesCount})` : `📑 Review Queue${pendingPitchesCount > 0 ? ` (${pendingPitchesCount})` : ''}`, roles: ['admin', 'reviewer', 'author'] },
            { id: 'discourse', label: `💬 Peer Marginalia (${unverifiedReviewsCount})`, roles: ['admin', 'reviewer'] },
            { id: 'team', label: '👥 Editorial Staff (RBAC)', roles: ['admin'] },
            { id: 'tips', label: `📬 Tips (${tips.filter(t => !t.isRead).length})`, roles: ['admin'] },
            { id: 'reading', label: '📚 Reading shelf', roles: ['admin', 'reviewer'] },
            { id: 'subscribers', label: `📧 Subscribers (${subscribers.length})`, roles: ['admin'] },
            { id: 'analytics', label: '📊 Analytics', roles: ['admin'] },
            { id: 'site_content', label: '🌐 Site Content & CMS', roles: ['admin'] },
            { id: 'settings', label: '⚙ Security', roles: ['admin'] }
          ]
            .filter(tab => tab.roles.includes(effectiveRole))
            .map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setAlert(null);
              }}
              className={`font-sans text-[10px] font-semibold tracking-widest uppercase text-left py-3.5 px-5 md:px-6 w-full whitespace-nowrap md:border-l-2 transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-blood/10 text-paper border-blood' 
                  : 'text-paper/45 hover:bg-paper/[0.02] border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User profile & role badge */}
        <div className="mt-auto p-4 border-t border-paper/5 hidden md:flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-serif text-xs text-paper/80 font-bold truncate max-w-36">
                {currentUser?.displayName || auth.currentUser?.email}
              </span>
              <span className={`font-sans text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded-xs border w-fit mt-0.5 ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
            </div>
            <button 
              onClick={handleSignOutAction}
              className="text-paper/40 hover:text-red-400 p-1.5 cursor-pointer rounded-xs hover:bg-paper/5 transition-colors"
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 md:p-10 select-text max-w-5xl">
        <div className="flex flex-col gap-6">
          
          {/* Workspace Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-paper/10 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-sans text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border ${roleMeta.color}`}>
                  {roleMeta.badge}
                </span>
                <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest">
                  theoligarchy.in • Role-Based Editorial Workspace
                </span>
              </div>
              <h2 className="font-display text-2xl font-semibold italic text-paper/90 capitalize">
                {activeTab === 'contributor_dashboard' ? (effectiveRole === 'author' ? 'Scholar Analytics & Manuscript Insights' : 'Contributor Intelligence & Paper Reach') : activeTab === 'write' ? (editingId ? 'Edit Manuscript' : (effectiveRole === 'author' ? 'Compose Manuscript' : 'Write Post')) : activeTab === 'team' ? 'Editorial Staff & RBAC Registry' : `${activeTab} Panel`}
              </h2>
            </div>

            {/* Persona Simulator & Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Interactive Role Switcher for seamless testing */}
              <div className="flex items-center gap-1 bg-ink border border-paper/15 p-1 rounded-sm shadow-xs">
                <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40 px-1.5 flex items-center gap-1">
                  <ShieldCheck size={10} className="text-blood" />
                  Role View:
                </span>
                {(['admin', 'reviewer', 'author'] as EditorialRole[]).map((r) => {
                  const isCurrent = effectiveRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleSwitchSimulatedRole(r === currentUser?.role ? null : r)}
                      className={`font-sans text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-xs transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-blood text-paper shadow-xs' 
                          : 'text-paper/40 hover:text-paper hover:bg-paper/5'
                      }`}
                      title={`Preview workspace with ${ROLE_LABELS[r].title} permissions`}
                    >
                      {r === 'admin' ? 'Managing Editor' : r === 'reviewer' ? 'Peer Reviewer' : 'Guest Researcher'}
                    </button>
                  );
                })}
              </div>

              {autoSaveActive && (
                <span className="font-serif text-[10px] italic text-[#8bc4a8] bg-[#8bc4a8]/5 border border-[#8bc4a8]/10 px-2 py-1 rounded-sm flex items-center gap-1">
                  <Check size={10} /> Auto-saved
                </span>
              )}
              {localStorage.getItem('tol_autosave_recovery') && activeTab === 'write' && (
                <button 
                  onClick={restoreRecoveryDraft}
                  className="font-sans text-[9px] uppercase tracking-wider bg-blood/10 border border-blood/30 hover:bg-blood/20 text-paper px-3 py-1.5 rounded-sm cursor-pointer transition-colors"
                >
                  Restore Crash Draft
                </button>
              )}
            </div>
          </div>

          {/* Error / Success Notifications */}
          {alert && (
            <div className={`p-4 border text-xs leading-relaxed flex justify-between items-center ${
              alert.type === 'success' 
                ? 'bg-green-950/20 text-[#8bc4a8] border-green-500/20' 
                : 'bg-red-950/20 text-red-400 border-red-500/20'
            }`}>
              <span className="font-serif">{alert.text}</span>
              <button onClick={() => setAlert(null)} className="text-[14px] leading-none shrink-0 ml-4 font-bold opacity-50 hover:opacity-100 cursor-pointer">×</button>
            </div>
          )}

          {/* ══ TAB: CONTRIBUTOR HUB & SCHOLAR ANALYTICS ══ */}
          {activeTab === 'contributor_dashboard' && (
            <div className="fade-in">
              <ContributorDashboard
                currentUser={currentUser}
                currentUserRole={effectiveRole}
                articles={allArticles}
                submissions={allSubmissions}
                onEditArticle={(art) => {
                  handleEditArticle(art);
                  setActiveTab('write');
                }}
                onComposeNew={() => {
                  clearWriteForm();
                  setActiveTab('write');
                }}
                onOpenReviewQueue={() => setActiveTab('pitches')}
              />
            </div>
          )}

          {/* ══ TAB 1: WRITE/EDIT POST ══ */}
          {activeTab === 'write' && (
            <div className="flex flex-col gap-6 fade-in">
              
              {/* Role Context Notification for Authors */}
              {effectiveRole === 'author' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-sm flex items-start gap-3 text-xs text-amber-200/90 font-serif shadow-xs">
                  <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-sans text-[9px] uppercase tracking-wider text-amber-400 block mb-0.5">Author / Guest Researcher Mode:</strong>
                    You are drafting a research manuscript under your author credentials. Drafts are saved privately to your account. When completed, submitting for Peer Review routes your investigation into the editorial evaluation pipeline for review and approval.
                  </div>
                </div>
              )}

              {/* Gemini AI Smart Assistant Banner */}
              <div className="bg-gradient-to-r from-navy via-navy to-blood/10 border border-blood/30 p-4 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blood/20 rounded-sm text-amber-400 border border-blood/30 shrink-0 mt-0.5">
                    <Sparkles size={18} className={isSuggestingMetadata ? "animate-spin text-amber-400" : ""} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-sm">
                        Gemini AI Assistant
                      </span>
                      <span className="font-sans text-[10px] font-semibold text-paper/50">
                        Automatic Categorization &amp; Tagging Engine
                      </span>
                    </div>
                    <p className="font-serif text-xs text-paper/70 leading-relaxed">
                      Analyze title, excerpt, and draft text with Gemini 3.6 Flash to automatically infer category (<span className="text-blood font-semibold">Criminology</span>, <span className="text-blood font-semibold">Psyche</span>, or <span className="text-blood font-semibold">Politics</span>) and generate relevant search tags.
                    </p>
                    {aiMetadataReasoning && (
                      <div className="mt-2 text-[11px] font-serif italic text-amber-200/90 bg-amber-950/20 border-l-2 border-amber-400 pl-2.5 py-1">
                        &ldquo;{aiMetadataReasoning}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSuggestMetadata}
                  disabled={isSuggestingMetadata}
                  className="bg-blood/90 hover:bg-blood border border-amber-400/40 hover:border-amber-400 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-5 rounded-sm flex items-center gap-2 cursor-pointer shrink-0 transition-all shadow-md disabled:opacity-50"
                >
                  <Sparkles size={14} className={isSuggestingMetadata ? "animate-spin text-amber-300" : "text-amber-300"} />
                  {isSuggestingMetadata ? 'Analyzing Draft...' : 'Auto-Suggest Category & Tags'}
                </button>
              </div>

              {/* Row 1: Title and Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter scholarly title..."
                    value={title}
                    onChange={handleTitleChange}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggestMetadata}
                      disabled={isSuggestingMetadata}
                      className="font-sans text-[9px] font-bold text-amber-400 hover:text-amber-300 tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      title="Use Gemini API to auto-detect category based on draft content"
                    >
                      <Sparkles size={11} className={isSuggestingMetadata ? "animate-spin" : ""} />
                      {isSuggestingMetadata ? 'Analyzing...' : 'AI Detect Category'}
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  >
                    <option value="criminology">Criminology</option>
                    <option value="psyche">Psyche</option>
                    <option value="politics">Politics</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Subtitle & Excerpt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Subtitle or Chapter header
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Part 1: Pathology of Control"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Manual Slug Override *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. psychology-of-serial-killers-1"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>
              </div>

              {/* Row 3: Series / Collections Support */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Series Name (Group name if applicable)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Psychology of Serial Killers"
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Series Part Index
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={seriesPart}
                    onChange={(e) => setSeriesPart(e.target.value ? parseInt(e.target.value) : '')}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5 justify-center md:pt-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/50">
                      <input 
                        type="checkbox" 
                        checked={isFeatured} 
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="accent-blood"
                      />
                      ★ Set Pinned Featured
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/50">
                      <input 
                        type="checkbox" 
                        checked={isPinned} 
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="accent-blood"
                      />
                      📌 Pin to top of list
                    </label>
                  </div>
                </div>
              </div>

              {/* Row: Publication Date & Estimated Read Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-paper/10 pt-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex items-center gap-1.5">
                      <Clock size={11} className="text-blood" /> Published Date (Custom / Historical)
                    </label>
                    <button
                      type="button"
                      onClick={() => setPublishDate(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}
                      className="font-sans text-[8px] uppercase tracking-wider text-blood hover:underline cursor-pointer"
                    >
                      Set Today's Date
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 14 May 2024 or 2024-05-14"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                  <span className="font-serif text-[10px] text-paper/30 italic">Leave blank to automatically stamp the date when published.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex items-center gap-1.5">
                    <Clock size={11} className="text-paper/40" /> Estimated Read Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8 min read"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                  <span className="font-serif text-[10px] text-paper/30 italic">Auto-calculated from word count if not manually specified.</span>
                </div>
              </div>

              {/* Academic Identification & Multi-Author Attribution */}
              <div className="border border-paper/10 p-5 rounded-sm bg-navy/30 space-y-4">
                <div className="flex items-center justify-between border-b border-paper/10 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={15} className="text-amber-400" />
                    <span className="font-sans text-[10px] font-bold tracking-widest text-paper uppercase">
                      Academic Attribution, ORCID &amp; Co-Authorship
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-[#a6ce39] bg-[#a6ce39]/10 px-2 py-0.5 border border-[#a6ce39]/30 rounded-xs">
                    Citation Engine Ready
                  </span>
                </div>

                {/* Author Selection from Registry */}
                <div className="bg-midnight/40 p-3 rounded-xs border border-paper/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60 flex items-center gap-1.5">
                      <Users size={12} className="text-blood" /> Select Registered Contributor / Scholar
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('authors')}
                      className="text-blood hover:underline font-sans text-[9px] uppercase tracking-wider cursor-pointer"
                    >
                      + Manage Authors Registry
                    </button>
                  </div>
                  <select
                    value={authorId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setAuthorId(selectedId);
                      const found = contributors.find(c => c.id === selectedId);
                      if (found) {
                        setAuthorName(found.name);
                        if (found.orcid) setAuthorOrcid(found.orcid);
                      }
                    }}
                    className="bg-navy border border-paper/15 rounded-xs p-2 text-paper text-xs cursor-pointer focus:outline-none focus:border-blood font-serif"
                  >
                    <option value="">-- Choose Registered Author Profile (Auto-fills Byline) --</option>
                    {contributors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isFounder ? '★ (Founder)' : `(${c.role})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                      Primary Author Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Priyasha Priyal Jena"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif focus:outline-none focus:border-blood text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex items-center justify-between">
                      <span>Primary Author ORCID iD</span>
                      <span className="font-mono text-[8px] text-paper/30">XXXX-XXXX-XXXX-XXXX</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0000-0002-1825-0097"
                      value={authorOrcid}
                      onChange={(e) => setAuthorOrcid(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                      Digital Object Identifier (DOI) / Archival Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10.5281/zenodo.10892341"
                      value={doi}
                      onChange={(e) => setDoi(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                    />
                  </div>
                </div>

                {/* Co-Authors / Secondary Researchers builder */}
                <div className="pt-2 border-t border-paper/5">
                  <span className="font-sans text-[9px] font-bold tracking-widest text-paper/50 uppercase block mb-3">
                    + Multi-Author &amp; Co-Researcher Attribution ({coAuthors.length} Attached)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end bg-navy/60 p-3 rounded-sm border border-paper/5">
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Co-Author Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. A. Sharma"
                        value={newCoName}
                        onChange={(e) => setNewCoName(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-xs py-1.5 px-2 text-paper text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Scholarly Role</label>
                      <input
                        type="text"
                        placeholder="e.g. Co-Author / Forensic Consultant"
                        value={newCoRole}
                        onChange={(e) => setNewCoRole(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-xs py-1.5 px-2 text-paper text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Institution / University</label>
                      <input
                        type="text"
                        placeholder="e.g. Oxford Criminology Dept"
                        value={newCoAffiliation}
                        onChange={(e) => setNewCoAffiliation(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-xs py-1.5 px-2 text-paper text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">ORCID iD</label>
                      <input
                        type="text"
                        placeholder="e.g. 0000-0001-2345-6789"
                        value={newCoOrcid}
                        onChange={(e) => setNewCoOrcid(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-xs py-1.5 px-2 text-paper text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCoAuthorItem}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 text-amber-300 font-sans text-[9px] font-bold tracking-widest uppercase py-2 px-3 rounded-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={11} /> Add Co-Author
                    </button>
                  </div>

                  {/* Attached Co-Authors chips */}
                  {coAuthors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {coAuthors.map((co, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 bg-navy border border-paper/15 px-3 py-1.5 rounded-sm text-xs text-paper"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-paper font-serif">{co.name}</span>
                            <span className="font-sans text-[9px] text-paper/40">
                              {co.role || 'Co-Author'} {co.institution ? `· ${co.institution}` : ''} {co.orcid ? `[ORCID: ${co.orcid}]` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCoAuthorItem(idx)}
                            className="text-red-400 hover:text-red-300 ml-2 font-bold cursor-pointer text-xs"
                            title="Remove Co-Author"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Custom tags inline constructor */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Search Metadata Tags
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestMetadata}
                    disabled={isSuggestingMetadata}
                    className="font-sans text-[9px] font-bold text-amber-400 hover:text-amber-300 tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    title="Use Gemini API to generate relevant search tags based on draft content"
                  >
                    <Sparkles size={11} className={isSuggestingMetadata ? "animate-spin" : ""} />
                    {isSuggestingMetadata ? 'Generating Tags...' : 'AI Generate Tags'}
                  </button>
                </div>
                <div className="bg-navy border border-paper/10 p-2 rounded-sm flex flex-wrap gap-2 items-center">
                  {tags.map((tag, i) => (
                    <span key={tag} className="font-sans text-[9px] font-semibold bg-blood/15 border border-blood/40 text-red-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(i)} className="hover:text-white ml-1 font-bold text-[10px]">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="bg-transparent text-paper font-serif focus:outline-none text-sm flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              {/* Row 5: Media URLs, PDF Links & Canva embeds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex justify-between items-center">
                    <span>Featured Banner Image</span>
                    {featuredImage && (
                      <button 
                        type="button" 
                        onClick={() => setFeaturedImage('')} 
                        className="text-blood hover:underline text-[9px] font-bold tracking-wider cursor-pointer"
                      >
                        REMOVE IMAGE
                      </button>
                    )}
                  </label>
                  
                  {/* Drag and Drop Box Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('featured-image-file-input')?.click()}
                    className={`relative border border-dashed rounded-sm p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all min-h-[145px] overflow-hidden ${
                      dragActive 
                        ? 'border-blood bg-blood/5' 
                        : 'border-paper/20 bg-navy hover:border-blood/50 hover:bg-paper/[0.01]'
                    }`}
                  >
                    <input
                      id="featured-image-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-t-2 border-blood rounded-full animate-spin" />
                        <span className="font-serif text-[10px] italic text-paper/60">{uploadProgress}</span>
                      </div>
                    ) : featuredImage ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
                        <img 
                          src={featuredImage} 
                          alt="Uploaded Banner Preview" 
                          className="max-h-[85px] w-full object-cover rounded-sm border border-paper/10"
                        />
                        <span className="font-mono text-[9px] text-[#8bc4a8] flex items-center gap-1">
                          ✓ Banner Loaded (Click to replace)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-paper/40 hover:text-paper/60 transition-colors">
                        <Upload size={18} className="text-blood/80" />
                        <span className="font-sans text-[9px] font-bold tracking-wider uppercase">Drag &amp; Drop Banner</span>
                        <span className="font-serif text-[10px] italic">or click to browse local files</span>
                      </div>
                    )}
                  </div>

                  {/* Manual URL Input Overlay */}
                  <div className="relative mt-1">
                    <input
                      type="url"
                      placeholder="Or paste high-res banner URL..."
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono focus:outline-none focus:border-blood text-[10px] w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    PDF / Research Report Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={pdfLink}
                    onChange={(e) => setPdfLink(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Canva Embed Link / HTML Source
                  </label>
                  <input
                    type="text"
                    placeholder="Paste Canva iframe or View URL..."
                    value={canvaEmbed}
                    onChange={(e) => setCanvaEmbed(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>
              </div>

              {/* Row 6: Article Excerpt (1-2 sentence preview summary) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Article Excerpt * (Short synopsis seen in card lists)
                </label>
                <textarea
                  placeholder="Summarise this investigative essay in 1-2 powerful sentences..."
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3.5 text-paper font-serif focus:outline-none focus:border-blood text-sm resize-none"
                />
              </div>

              {/* ══ DEDICATED SEO & SEARCH ENGINE OPTIMIZATION ENGINE ══ */}
              <div className="border border-paper/10 p-5 rounded-sm bg-navy/25 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Search size={15} className="text-blood" />
                    <span className="font-sans text-[10px] font-bold tracking-widest text-paper uppercase">
                      Search Engine Optimization (SEO) &amp; Google Snippet
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-[#8bc4a8] bg-[#8bc4a8]/10 px-2 py-0.5 border border-[#8bc4a8]/30 rounded-xs">
                      SERP &amp; OpenGraph Ready
                    </span>
                  </div>
                </div>

                {/* Live Search Engine Result Page (SERP) Preview Box */}
                <div className="bg-[#1f1f1f] border border-paper/15 rounded-sm p-4 text-left font-sans shadow-inner">
                  <div className="font-sans text-[8px] font-bold uppercase tracking-widest text-paper/40 mb-2 flex items-center gap-1.5">
                    <Globe size={10} className="text-paper/40" /> Google Search Appearance (Live Preview)
                  </div>
                  
                  {/* Google SERP Card */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#bdc1c6] truncate">
                      <span className="w-3.5 h-3.5 rounded-full bg-paper/10 flex items-center justify-center text-[9px] text-paper/70 font-serif font-bold">O</span>
                      <span className="font-sans text-[#dadce0]">theoligarchy.in</span>
                      <span className="text-[#9aa0a6] text-[10px]">› {category} › {slug || 'manuscript-slug'}</span>
                    </div>
                    
                    <div className="text-[17px] text-[#8ab4f8] hover:underline cursor-pointer font-sans leading-tight line-clamp-1">
                      {metaTitle.trim() || title.trim() || 'Untitled Investigation — The Oligarchy'} | The Oligarchy
                    </div>
                    
                    <p className="text-[12px] text-[#bdc1c6] font-sans leading-relaxed line-clamp-2 mt-0.5">
                      <span className="text-[#9aa0a6]">{publishDate || 'Recent'} — </span>
                      {metaDescription.trim() || excerpt.trim() || 'Independent research and scholarly analysis into crime, human psychology, politics, and systemic power dynamics.'}
                    </p>
                  </div>
                </div>

                {/* Meta Title and Meta Description Input Fields */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Meta Title Field */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex items-center gap-1">
                        <span>Meta Title</span>
                        <span className="text-paper/25 font-normal lowercase">(search engine headline tag)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        {title.trim() && (
                          <button
                            type="button"
                            onClick={() => setMetaTitle(title.trim())}
                            className="font-sans text-[8px] uppercase tracking-wider text-blood hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Copy size={9} /> Copy Article Title
                          </button>
                        )}
                        <span className={`font-mono text-[9px] font-bold ${
                          metaTitle.length === 0 ? 'text-paper/30' :
                          metaTitle.length <= 40 ? 'text-amber-400' :
                          metaTitle.length <= 60 ? 'text-[#8bc4a8]' : 'text-red-400'
                        }`}>
                          {metaTitle.length}/60 chars {metaTitle.length > 60 ? '• Long (may truncate)' : metaTitle.length >= 40 ? '• Optimal' : metaTitle.length > 0 ? '• Short' : ''}
                        </span>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder={title ? `${title} | The Oligarchy` : "e.g. The Psychology of Power: A Critical Study | The Oligarchy"}
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                    />
                    <span className="font-serif text-[10px] text-paper/30 italic">
                      Recommended 50–60 characters. Appears as the primary clickable title in search engine results and browser tab titles.
                    </span>
                  </div>

                  {/* Meta Description Field */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex items-center gap-1">
                        <span>Meta Description</span>
                        <span className="text-paper/25 font-normal lowercase">(search snippet preview)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        {excerpt.trim() && (
                          <button
                            type="button"
                            onClick={() => setMetaDescription(excerpt.trim())}
                            className="font-sans text-[8px] uppercase tracking-wider text-blood hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Copy size={9} /> Copy Excerpt
                          </button>
                        )}
                        <span className={`font-mono text-[9px] font-bold ${
                          metaDescription.length === 0 ? 'text-paper/30' :
                          metaDescription.length < 110 ? 'text-amber-400' :
                          metaDescription.length <= 160 ? 'text-[#8bc4a8]' : 'text-red-400'
                        }`}>
                          {metaDescription.length}/160 chars {metaDescription.length > 160 ? '• Long (may truncate)' : metaDescription.length >= 110 ? '• Optimal' : metaDescription.length > 0 ? '• Short' : ''}
                        </span>
                      </div>
                    </div>
                    <textarea
                      placeholder={excerpt ? excerpt : "e.g. An empirical investigation into institutional hierarchy, persuasion mechanisms, and psychological dynamics of power systems..."}
                      rows={2}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3.5 text-paper font-serif focus:outline-none focus:border-blood text-sm resize-none"
                    />
                    <span className="font-serif text-[10px] text-paper/30 italic">
                      Recommended 120–160 characters. Summarizes the investigation for search engines, web crawlers, and link unfurling cards.
                    </span>
                  </div>

                  {/* Canonical URL / Cross-Posting Link (Optional) */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-paper/5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40 flex items-center justify-between">
                      <span>Canonical URL (Optional Academic Cross-Posting Override)</span>
                      <span className="font-mono text-[8px] text-paper/30">Defaults to theoligarchy.in/post/{slug || '...'}</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://theoligarchy.in/post/... or external academic journal DOI/SSRN link"
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      className="bg-navy border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 7: Modern Scholarly Quill Rich-Text Editor */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Full Scholarly Content * (Quill Rich-Text Engine)
                </label>
                <QuillEditor value={content} onChange={setContent} />
              </div>

              {/* Row 8: Version history if editing */}
              {editingId && allArticles.find(a => a.id === editingId)?.versions?.length && (
                <div className="border border-paper/10 bg-navy/30 p-5 rounded-sm">
                  <span className="font-sans text-[10px] font-bold tracking-widest text-paper/40 uppercase block mb-3">
                    <History size={12} className="inline mr-1" /> Document Edits Version History (Restoration Stack)
                  </span>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-2 divide-y divide-paper/5">
                    {allArticles.find(a => a.id === editingId)?.versions?.map((ver, vIdx) => (
                      <div key={ver.id} className="pt-2 first:pt-0 flex justify-between items-center text-xs text-paper/50 font-serif">
                        <span>
                          Version saved at {new Date(ver.timestamp).toLocaleString()} by <span className="font-mono text-[10px] text-blood">{ver.updatedBy}</span>
                        </span>
                        <button 
                          onClick={() => handleRestoreVersion(ver)}
                          className="font-sans text-[8px] uppercase bg-paper/5 border border-paper/10 px-2 py-1 text-paper hover:border-blood hover:text-paper rounded-sm cursor-pointer transition-colors"
                        >
                          Restore Text
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 9: Academic Sources Manager */}
              <div className="border border-paper/10 p-5 rounded-sm bg-navy/20">
                <span className="font-sans text-[10px] font-bold tracking-widest text-blood uppercase block mb-4">
                  📚 Academic Citation Index &amp; Sources Bibliography
                </span>
                
                {/* Source Form inputs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Category</label>
                    <select
                      value={newSrcCat}
                      onChange={(e: any) => setNewSrcCat(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-2 text-paper text-xs"
                    >
                      <option value="academic">Academic Paper</option>
                      <option value="government">Government Report</option>
                      <option value="book">Book/Literature</option>
                      <option value="court">Court Record</option>
                      <option value="database">Public Database</option>
                      <option value="investigative">Investigative Journalism</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Source Title / Reference Cite</label>
                    <input
                      type="text"
                      placeholder="e.g. Michels, R. (1911). Political Parties..."
                      value={newSrcTitle}
                      onChange={(e) => setNewSrcTitle(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3.5 text-paper text-xs"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={addSourceItem}
                    className="bg-blood/10 hover:bg-blood/20 border border-blood/40 text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2 px-4 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus size={10} /> Add Source
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Optional URL Link</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newSrcUrl}
                      onChange={(e) => setNewSrcUrl(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Optional Citation/Descriptor Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Journal of Sociology, Vol. 4"
                      value={newSrcCitation}
                      onChange={(e) => setNewSrcCitation(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper text-xs"
                    />
                  </div>
                </div>

                {/* Display added sources */}
                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto mt-4 pr-1">
                  {sources.map((src, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-paper/60 border-b border-paper/5 pb-2">
                      <span className="font-serif">
                        <strong className="text-blood font-sans text-[9px] uppercase tracking-widest mr-2">[{src.category}]</strong> {src.title}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => removeSourceItem(idx)}
                        className="text-red-400 hover:text-red-300 font-sans text-[9px] uppercase tracking-wider bg-none border-none p-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaborative Draft Workflow: Fact-Checking, Legal & Citation Marginalia */}
              <div className="pt-2">
                <DraftInternalNotes
                  articleId={editingId || (slug || 'draft-manuscript-workspace')}
                  articleTitle={title || 'Untitled Manuscript Draft'}
                  currentUser={currentUser}
                  currentUserRole={effectiveRole}
                />
              </div>

              {/* Publish State Options */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-paper/10 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  {effectiveRole === 'author' ? (
                    <>
                      <button
                        onClick={() => handleSavePost('published')}
                        className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm shadow-md cursor-pointer flex items-center gap-2"
                        title="Submit your completed manuscript to the Editorial Review Queue"
                      >
                        <Send size={12} /> Submit for Peer Review
                      </button>
                      <button
                        onClick={() => handleSavePost('draft')}
                        className="bg-transparent border border-paper/20 hover:border-blood hover:text-paper hover:bg-blood/5 text-paper/60 font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm cursor-pointer transition-colors"
                      >
                        Save Working Draft
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSavePost('published')}
                        className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm shadow-md cursor-pointer"
                      >
                        {editingId ? 'Apply Updates & Publish' : 'Publish Article'}
                      </button>
                      <button
                        onClick={() => handleSavePost('draft')}
                        className="bg-transparent border border-paper/20 hover:border-blood hover:text-paper hover:bg-blood/5 text-paper/60 font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm cursor-pointer transition-colors"
                      >
                        Save as Draft
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleSuggestMetadata}
                    disabled={isSuggestingMetadata}
                    className="bg-navy border border-amber-400/30 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-6 rounded-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={13} className={isSuggestingMetadata ? "animate-spin text-amber-400" : "text-amber-400"} />
                    {isSuggestingMetadata ? 'Analyzing...' : 'AI Auto-Suggest Category & Tags'}
                  </button>
                </div>

                {editingId && (
                  <button
                    onClick={clearWriteForm}
                    className="bg-transparent border border-paper/10 hover:border-paper/40 text-paper/50 font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-6 rounded-sm cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══ TAB 2: ALL ARTICLES / MY MANUSCRIPTS ══ */}
          {activeTab === 'articles' && (
            <div className="flex flex-col gap-5 fade-in">
              {effectiveRole === 'author' && (
                <div className="bg-navy/60 border border-paper/10 p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-paper/70 font-serif">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-blood shrink-0" />
                    <span>
                      <strong>Author Corpus:</strong> Displaying your personal drafts and live published papers. Private drafts from other authors are isolated under RBAC.
                    </span>
                  </div>
                  <button 
                    onClick={() => { clearWriteForm(); setActiveTab('write'); }}
                    className="font-sans text-[9px] font-bold uppercase tracking-wider bg-blood text-paper px-3.5 py-1.5 rounded-sm hover:bg-blood-light cursor-pointer shrink-0"
                  >
                    + Compose New Manuscript
                  </button>
                </div>
              )}

              <div className="overflow-x-auto border border-paper/10 rounded-sm">
                <table className="w-full text-left border-collapse select-text">
                  <thead>
                    <tr className="border-b border-paper/10 bg-ink">
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Article</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Category</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Status</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Views</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper/5 font-serif text-sm text-paper/70">
                    {rbac.filterVisibleArticles(allArticles, currentUser || { uid: auth.currentUser?.uid || '', email: auth.currentUser?.email || '', displayName: '', role: effectiveRole }).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-paper/30 italic">No manuscripts found in your scope. Go to Write tab to begin drafting.</td>
                      </tr>
                    ) : (
                      rbac.filterVisibleArticles(allArticles, currentUser || { uid: auth.currentUser?.uid || '', email: auth.currentUser?.email || '', displayName: '', role: effectiveRole }).map((art) => (
                        <tr key={art.id} className="hover:bg-paper/[0.01] transition-colors">
                          <td className="py-4 px-4 font-bold text-paper/90 select-text">
                            {art.isFeatured && <span className="text-blood mr-1" title="Pinned Featured">★</span>}
                            {art.title}
                            {art.subtitle && <span className="block text-xs font-normal text-paper/40 mt-0.5">{art.subtitle}</span>}
                            {art.authorName && <span className="block font-sans text-[9px] text-paper/35 mt-0.5">By {art.authorName}</span>}
                          </td>
                          <td className="py-4 px-4 capitalize font-sans text-xs">{art.category}</td>
                          <td className="py-4 px-4">
                            {effectiveRole === 'admin' ? (
                              <button
                                onClick={() => handleTogglePublish(art)}
                                className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border cursor-pointer ${
                                  art.status === 'published' 
                                    ? 'bg-green-950/10 text-[#8bc4a8] border-green-800/30' 
                                    : 'bg-yellow-950/10 text-yellow-500 border-yellow-800/30'
                                }`}
                                title="Click to toggle draft/published"
                              >
                                {art.status === 'published' ? 'Live' : 'Draft'}
                              </button>
                            ) : (
                              <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border ${
                                art.status === 'published' 
                                  ? 'bg-green-950/10 text-[#8bc4a8] border-green-800/30' 
                                  : 'bg-yellow-950/10 text-yellow-500 border-yellow-800/30'
                              }`}>
                                {art.status === 'published' ? 'Live' : 'Draft'}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-paper/40">{art.views || 0}</td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setNotesArticleModal(art)}
                                className="p-1.5 border border-paper/10 text-paper/50 hover:text-amber-300 hover:border-amber-400/40 transition-colors rounded-sm cursor-pointer"
                                title="Draft Feedback, Fact-Checking & Legal Clearance Notes"
                              >
                                <MessageSquare size={13} />
                              </button>
                              {rbac.canEditArticle(art, currentUser || { uid: auth.currentUser?.uid || '', email: auth.currentUser?.email || '', displayName: '', role: effectiveRole }) && (
                                <button 
                                  onClick={() => handleEditArticle(art)}
                                  className="p-1.5 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood transition-colors rounded-sm cursor-pointer"
                                  title="Edit Manuscript"
                                >
                                  <FileEdit size={13} />
                                </button>
                              )}
                              {effectiveRole === 'admin' && (
                                <button 
                                  onClick={() => handleDuplicateArticle(art)}
                                  className="p-1.5 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood transition-colors rounded-sm cursor-pointer"
                                  title="Duplicate Article"
                                >
                                  <Copy size={13} />
                                </button>
                              )}
                              {rbac.canDeleteArticle(art, currentUser || { uid: auth.currentUser?.uid || '', email: auth.currentUser?.email || '', displayName: '', role: effectiveRole }) && (
                                deleteConfirmArticleId === art.id ? (
                                  <div className="flex items-center gap-1 bg-red-950/40 border border-red-900/50 p-1 px-1.5 rounded-sm text-[9px] font-sans">
                                    <span className="text-red-400 font-bold uppercase tracking-wider text-[7px] mr-1">Delete?</span>
                                    <button
                                      onClick={() => handleDeleteArticle(art.id)}
                                      className="bg-red-800 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 rounded-sm cursor-pointer text-[7px] uppercase"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmArticleId(null)}
                                      className="bg-paper/10 hover:bg-paper/20 text-paper/70 font-bold px-1.5 py-0.5 rounded-sm cursor-pointer text-[7px] uppercase"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setDeleteConfirmArticleId(art.id)}
                                    className="p-1.5 border border-paper/10 text-paper/30 hover:text-red-400 hover:border-red-400/40 transition-colors rounded-sm cursor-pointer"
                                    title="Delete Post"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ TAB: PEER REVIEW QUEUE & MANUSCRIPT TRIAGE PIPELINE ══ */}
          {activeTab === 'pitches' && (
            <div className="fade-in">
              <ReviewQueuePipeline 
                onConvertToArticle={handleConvertPitchToArticle}
                resendApiKey={resendApiKey}
                currentUserRole={effectiveRole}
                userEmail={currentUser?.email || auth.currentUser?.email || undefined}
              />
            </div>
          )}

          {/* ══ TAB: EDITORIAL STAFF & RBAC REGISTRY ══ */}
          {activeTab === 'team' && (
            <div className="fade-in">
              <EditorialTeamManager 
                currentUserRole={effectiveRole} 
                onSimulateRoleChange={handleSwitchSimulatedRole}
                activeSimulatedRole={simulatedRole || undefined}
              />
            </div>
          )}

          {/* ══ TAB: AUTHORS & SCHOLAR PROFILES REGISTRY ══ */}
          {activeTab === 'authors' && (
            <div className="fade-in">
              <AuthorManager
                contributors={contributors}
                allArticles={allArticles}
                onRefresh={loadContributorsList}
                onSelectAuthorForArticle={(author) => {
                  setAuthorId(author.id);
                  setAuthorName(author.name);
                  if (author.orcid) setAuthorOrcid(author.orcid);
                  setActiveTab('write');
                }}
              />
            </div>
          )}

          {/* ══ TAB 3: READER TIPS ══ */}
          {activeTab === 'tips' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="font-serif text-sm text-paper/50 bg-navy/30 border border-paper/10 p-5 rounded-sm leading-relaxed">
                CLASSIFIED DATA ENVELOPE: Submissions from readers and whistleblower investigators. All IP logging is disabled globally to maintain absolute security. Review items below.
              </div>

              <div className="flex flex-col gap-4">
                {tips.length === 0 ? (
                  <div className="border border-dashed border-paper/10 p-10 text-center text-paper/30 italic rounded-sm">
                    Inbox empty. No classified research reports received yet.
                  </div>
                ) : (
                  tips.map((tip) => (
                    <div 
                      key={tip.id} 
                      className={`border p-5 rounded-sm flex flex-col gap-3 transition-all relative ${
                        tip.isRead 
                          ? 'bg-navy/20 border-paper/10 text-paper/50' 
                          : 'bg-[#8b1a1a]/5 border-[#8b1a1a]/30 text-paper/90 shadow-lg'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-sans text-[9px] font-bold tracking-widest uppercase bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-sm text-blood mr-3">
                            {tip.contact === 'Anonymous' ? '🔒 ANONYMOUS' : '👤 DIRECT CITE'}
                          </span>
                          <span className="font-sans text-[10px] text-paper/35">
                            Received: {new Date(tip.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMarkTipRead(tip.id, tip.isRead)}
                          className="font-sans text-[8px] tracking-wider uppercase border border-paper/10 hover:border-blood px-2.5 py-1 text-paper/60 hover:text-paper rounded-sm cursor-pointer transition-colors"
                        >
                          {tip.isRead ? 'Mark Unread' : 'Mark Reviewed'}
                        </button>
                      </div>

                      <h4 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-1.5">
                        Subject: {tip.subject}
                      </h4>

                      <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap select-text">
                        {tip.message}
                      </p>

                      {tip.contact !== 'Anonymous' && (
                        <div className="bg-ink/50 p-3 rounded-sm border border-paper/5 font-mono text-[11px] text-paper/60 select-text flex items-center gap-2">
                          <Mail size={12} /> Return Channel: {tip.contact}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══ TAB 4: READING STACK ══ */}
          {activeTab === 'reading' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Book stack list */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  <h3 className="font-display text-lg font-bold text-paper/90 border-b border-paper/5 pb-2">
                    Current Reading Shelf Logs
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    {readingStack.length === 0 ? (
                      <p className="font-serif italic text-sm text-paper/30 py-4">No volumes currently added to the stack.</p>
                    ) : (
                      readingStack.map((book) => (
                        <div key={book.id} className="bg-navy border border-paper/10 p-4 rounded-sm flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-display text-sm font-bold text-paper/90">{book.title}</h4>
                            <p className="font-sans text-[10px] tracking-wider uppercase text-paper/40 mt-1">{book.author}</p>
                            {book.link && <span className="font-mono text-[9px] text-blood hover:text-blood-light hover:underline truncate block mt-1 max-w-sm transition-colors">{book.link}</span>}
                          </div>
                          <button
                            onClick={() => handleRemoveBook(book.id)}
                            className="p-2 border border-red-900/30 hover:bg-red-950/10 text-red-400 rounded-sm cursor-pointer"
                            title="Remove from stack"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add book form */}
                <div className="md:col-span-5 bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-4">
                  <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
                    Log New Literature Vol.
                  </h3>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Book Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. The Psychology of Power"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Author Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Erich Fromm"
                      value={newBookAuthor}
                      onChange={(e) => setNewBookAuthor(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Goodreads / Reference Link</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newBookLink}
                      onChange={(e) => setNewBookLink(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs focus:outline-none focus:border-blood"
                    />
                  </div>

                  <button
                    onClick={handleAddBook}
                    className="bg-blood hover:bg-blood-light text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 rounded-sm mt-2 transition-all cursor-pointer shadow-md"
                  >
                    Add Literature
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB 5: PLATFORM ANALYTICS ══ */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard 
              allArticles={allArticles} 
              subscribersCount={subscribers.length} 
            />
          )}

          {/* ══ TAB: SITE CONTENT & CMS CUSTOMIZATION ══ */}
          {activeTab === 'site_content' && (
            <div className="fade-in">
              <SiteContentManager allArticles={allArticles} />
            </div>
          )}

          {/* ══ TAB 6: SECURITY & SETTINGS ══ */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5">
                <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2 flex items-center gap-2">
                  <Lock size={14} className="text-blood" /> Password &amp; Administrative Credentials (Instagram-Style)
                </h3>
                
                <p className="font-serif text-sm text-paper/50 leading-relaxed -mt-2">
                  Update your active admin session credential key here. Updates sync directly to secure Firebase Auth structures instantly, overriding the default deployment code configurations securely.
                </p>

                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 select-text">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">New Security Override Key *</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={newSecurityKey}
                        onChange={(e) => setNewSecurityKey(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Confirm Override Key *</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmSecurityKey}
                        onChange={(e) => setConfirmSecurityKey(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 rounded-sm w-fit px-6 shadow-md transition-all cursor-pointer"
                  >
                    Commit Key Update
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ══ TAB 7: NEWSLETTER & SUBSCRIBERS ══ */}
          {activeTab === 'subscribers' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left panel: Active Subscribers */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-paper/10 pb-2">
                    <h3 className="font-display text-base font-bold text-paper/90">
                      Mailing List Registry
                    </h3>
                    <button
                      onClick={exportSubscribersToCSV}
                      className="bg-green-950/20 hover:bg-green-950/30 border border-green-500/20 text-[#8bc4a8] font-sans text-[9px] font-bold tracking-widest uppercase py-1.5 px-3 rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Export subscriber emails to standard CSV format"
                    >
                      <FileSpreadsheet size={11} /> Export CSV
                    </button>
                  </div>

                  <div className="bg-navy border border-paper/10 rounded-sm p-4 flex flex-col gap-3">
                    {subscribers.length === 0 ? (
                      <p className="font-serif italic text-xs text-paper/30 py-4 text-center">No active subscribers currently registered.</p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-2 divide-y divide-paper/5">
                        {subscribers.map((sub, index) => (
                          <div key={sub.id || index} className="pt-2 first:pt-0 flex justify-between items-center gap-4 text-xs font-serif text-paper/70">
                            <span className="truncate select-text">{sub.email}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono text-[9px] text-paper/30">
                                {new Date(sub.subscribedAt || Date.now()).toLocaleDateString('en-GB')}
                              </span>
                              {deleteConfirmSubscriberId === sub.id ? (
                                <div className="flex items-center gap-1 bg-red-950/30 border border-red-900/40 p-1 px-1.5 rounded-sm scale-95 origin-right">
                                  <span className="font-sans text-[7px] uppercase tracking-wider text-red-400 font-bold mr-1">Remove?</span>
                                  <button
                                    onClick={() => handleDeleteSubscriber(sub.id)}
                                    className="font-sans text-[7px] bg-red-800 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 rounded-sm cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmSubscriberId(null)}
                                    className="font-sans text-[7px] bg-paper/10 hover:bg-paper/20 text-paper/70 font-bold px-1.5 py-0.5 rounded-sm cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmSubscriberId(sub.id)}
                                  className="text-red-400/60 hover:text-red-400 hover:bg-red-950/20 p-1 rounded-sm cursor-pointer transition-all"
                                  title="Remove subscriber"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right panel: Campaign Alert Builder */}
                <div className="lg:col-span-7 bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5">
                  <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2 flex items-center gap-2">
                    <Send size={13} className="text-blood" /> Deploy Live Research Alert
                  </h3>

                  <p className="font-serif text-xs text-paper/50 leading-relaxed -mt-2">
                    Publishing a new analysis? Construct and dispatch a custom email update to your subscriber base. Configure your <strong>Resend API Key</strong> to send directly, or use the generated code block below to copy-paste into Mailchimp/Substack.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Resend API Key</label>
                    <input
                      type="password"
                      placeholder="re_..."
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono text-xs focus:outline-none focus:border-blood placeholder-paper/15"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Select Target Published Article *</label>
                    <select
                      value={selectedCampaignArticleId}
                      onChange={(e) => handleSelectCampaignArticle(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-2 text-paper text-xs cursor-pointer focus:outline-none focus:border-blood"
                    >
                      <option value="">-- Choose Live Post --</option>
                      {allArticles
                        .filter(a => a.status === 'published')
                        .map(a => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                    </select>
                  </div>

                  {selectedCampaignArticleId && (
                    <div className="flex flex-col gap-4 fade-in">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Email Subject Line</label>
                        <input
                          type="text"
                          placeholder="e.g. New Research Release"
                          value={campaignSubject}
                          onChange={(e) => setCampaignSubject(e.target.value)}
                          className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Academic HTML Campaign Draft</label>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(campaignHtml);
                              setAlert({ text: 'HTML Newsletter Template copied to clipboard.', type: 'success' });
                            }}
                            className="text-blood text-[9px] font-sans font-bold tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy size={10} /> COPY HTML TEMPLATE
                          </button>
                        </div>
                        <div className="bg-midnight border border-paper/10 rounded-sm p-4 max-h-[180px] overflow-y-auto font-mono text-[9px] text-paper/40 whitespace-pre-wrap select-text leading-tight">
                          {campaignHtml}
                        </div>
                      </div>

                      <button
                        onClick={handleSendCampaign}
                        disabled={isSendingCampaign}
                        className={`font-sans text-[9px] font-bold tracking-widest uppercase py-3 px-6 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                          isSendingCampaign 
                            ? 'bg-paper/10 text-paper/30 border border-paper/15 cursor-not-allowed'
                            : 'bg-blood hover:bg-blood-light text-paper'
                        }`}
                      >
                        {isSendingCampaign ? (
                          <>
                            <div className="w-3.5 h-3.5 border-t-2 border-paper rounded-full animate-spin" />
                            Dispatching Campaign...
                          </>
                        ) : (
                          <>
                            <Send size={12} /> Dispatch Alert via Resend
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB 8: PEER DISCOURSE MODERATION ══ */}
          {activeTab === 'discourse' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="font-serif text-sm text-paper/50 bg-navy/30 border border-paper/10 p-5 rounded-sm leading-relaxed">
                ACADEMIC DISCOURSE MODERATION CORE: Review and verify research annotations, critical peer reviews, and reader feedback on articles. Verified Peers will receive a highlighted badge across the public paper portal.
              </div>

              <div className="flex flex-col gap-4">
                {allReviews.length === 0 ? (
                  <div className="border border-dashed border-paper/10 p-10 text-center text-paper/30 italic rounded-sm">
                    No peer annotations or reviews logged in the database currently.
                  </div>
                ) : (
                  allReviews.map((review) => {
                    const linkedArticle = allArticles.find(a => a.id === review.articleId);
                    return (
                      <div 
                        key={review.id} 
                        className={`border p-5 rounded-sm flex flex-col gap-4 bg-navy/10 ${
                          review.isVerifiedPeer 
                            ? 'border-green-950 bg-green-950/5' 
                            : 'border-paper/10'
                        }`}
                      >
                        {/* Upper Meta */}
                        <div className="flex flex-wrap justify-between items-start gap-4 border-b border-paper/5 pb-3">
                          <div>
                            <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm border mr-3 ${
                              review.isVerifiedPeer 
                                ? 'bg-green-950/20 text-green-400 border-green-800/30' 
                                : 'bg-yellow-950/10 text-yellow-500 border-yellow-800/30'
                            }`}>
                              {review.isVerifiedPeer ? 'Verified Expert' : 'Pending Verification'}
                            </span>
                            <span className="font-sans text-[10px] text-paper/50">
                              Logged on: {new Date(review.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5">
                            {deleteConfirmReviewId === review.id ? (
                              <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/40 p-1 px-2.5 rounded-sm">
                                <span className="font-sans text-[8px] uppercase tracking-wider text-red-400 font-bold">
                                  Confirm Delete?
                                </span>
                                <button
                                  onClick={() => handleDeleteReview(review.id!)}
                                  className="font-sans text-[8px] bg-red-800 hover:bg-red-700 text-white font-bold uppercase px-2 py-0.5 rounded-sm cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmReviewId(null)}
                                  className="font-sans text-[8px] bg-paper/10 hover:bg-paper/20 text-paper/70 font-bold uppercase px-2 py-0.5 rounded-sm cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleVerifyReview(review.id!, review.isVerifiedPeer)}
                                  className={`font-sans text-[8px] tracking-wider uppercase px-2.5 py-1 rounded-sm cursor-pointer transition-colors border ${
                                    review.isVerifiedPeer
                                      ? 'border-yellow-800/40 hover:border-yellow-500 text-yellow-500 hover:text-white'
                                      : 'border-green-800/40 hover:border-green-500 text-green-400 hover:text-white'
                                  }`}
                                >
                                  {review.isVerifiedPeer ? 'Revoke Verification' : 'Verify Expert Scholar'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmReviewId(review.id!)}
                                  className="font-sans text-[8px] tracking-wider uppercase border border-red-900/30 hover:border-red-500 px-2.5 py-1 text-red-400 hover:text-white rounded-sm cursor-pointer transition-colors"
                                >
                                  Delete Review
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Scholar profile */}
                        <div className="bg-midnight/30 p-3 rounded border border-paper/5 flex flex-col gap-1 select-text">
                          <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest">SUBMITTED BY:</span>
                          <h4 className="font-display text-sm font-bold text-paper">{review.authorName}</h4>
                          <p className="font-sans text-[10px] text-blood leading-none">
                            {review.authorTitle} {review.authorInstitution && `· ${review.authorInstitution}`}
                          </p>
                        </div>

                        {/* Article & Paragraph reference */}
                        <div className="bg-navy/30 p-3 rounded-sm border border-paper/5 text-xs text-paper/50 select-text flex flex-col gap-1 font-serif leading-relaxed">
                          <div className="flex items-center gap-1.5 font-sans text-[9px] uppercase text-paper/35 tracking-wider">
                            <BookOpen size={10} />
                            <span>Linked Article Reference:</span>
                          </div>
                          <span className="text-paper/80 font-bold font-display">{linkedArticle ? linkedArticle.title : review.articleId}</span>
                          <span className="font-sans text-[9px] uppercase tracking-wider text-blood">
                            {review.paragraphIndex === -1 ? 'General Paper Review Note' : `Paragraph ${review.paragraphIndex + 1} Marginalia`}
                          </span>
                          {review.selectedText && (
                            <p className="italic text-[11px] text-paper/40 mt-1 pl-2 border-l border-paper/10">
                              "{review.selectedText.replace(/<[^>]*>/g, '')}"
                            </p>
                          )}
                        </div>

                        {/* Comment Body */}
                        <div className="select-text space-y-1 pl-1">
                          <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest block">REVIEW FEEDBACK CONTENT:</span>
                          <p className="font-serif text-sm text-paper/85 leading-relaxed whitespace-pre-wrap">
                            {review.content}
                          </p>
                        </div>

                        {/* Nested Replies threads list for administrative moderation */}
                        {(review.replies || []).length > 0 && (
                          <div className="border-t border-paper/5 pt-3 mt-1 space-y-2">
                            <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest block mb-2">Replies to this node:</span>
                            {review.replies.map((reply: any) => (
                              <div key={reply.id} className="bg-midnight/50 p-3 rounded border border-paper/5 flex justify-between items-start gap-4">
                                <div className="space-y-1 select-text">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="font-display font-semibold text-paper/80">{reply.authorName}</span>
                                    <span className="text-[9px] text-paper/40">({reply.authorTitle})</span>
                                  </div>
                                  <p className="font-serif text-xs text-paper/60 leading-relaxed pl-1">{reply.content}</p>
                                </div>
                                {deleteConfirmReplyId?.reviewId === review.id && deleteConfirmReplyId?.replyId === reply.id ? (
                                  <div className="flex items-center gap-1.5 bg-red-950/25 border border-red-900/30 p-1 px-2 rounded-sm scale-95 origin-right">
                                    <span className="font-sans text-[7px] uppercase tracking-wider text-red-400 font-bold">Confirm?</span>
                                    <button
                                      onClick={() => handleDeleteReply(review.id!, reply.id)}
                                      className="font-sans text-[7px] bg-red-800 hover:bg-red-700 text-white font-bold px-1.5 py-0.5 rounded-sm cursor-pointer"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmReplyId(null)}
                                      className="font-sans text-[7px] bg-paper/10 hover:bg-paper/20 text-paper/70 font-bold px-1.5 py-0.5 rounded-sm cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirmReplyId({ reviewId: review.id!, replyId: reply.id })}
                                    className="text-red-400/50 hover:text-red-400 text-[10px] font-sans uppercase font-bold tracking-wider cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Editorial Fact-Checking & Marginalia Modal Dialog */}
      {notesArticleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ink border border-paper/20 rounded-sm w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-paper/10 pb-4">
              <div>
                <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-blood">Editorial Clearance & Internal Notes</span>
                <h3 className="font-display text-xl font-bold text-paper mt-1">{notesArticleModal.title}</h3>
                <p className="font-sans text-xs text-paper/50">By {notesArticleModal.authorName || 'Staff'} • {notesArticleModal.category} • Status: {notesArticleModal.status}</p>
              </div>
              <button
                onClick={() => setNotesArticleModal(null)}
                className="font-sans text-xs text-paper/50 hover:text-paper uppercase tracking-wider px-3 py-1.5 border border-paper/10 hover:border-paper/30 rounded-sm cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <DraftInternalNotes
              articleId={notesArticleModal.id}
              articleTitle={notesArticleModal.title}
              currentUser={currentUser}
              currentUserRole={effectiveRole}
            />
          </div>
        </div>
      )}
    </div>
  );
}
