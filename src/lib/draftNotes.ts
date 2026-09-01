import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { 
  DraftInternalNote, 
  DraftNoteCategory, 
  DraftNoteStatus, 
  DraftNoteReply, 
  Article, 
  ContributorStats, 
  SavedArticle,
  PeerAnnotation
} from '../types';

const DRAFT_NOTES_COLLECTION = 'draft_notes';
const LOCAL_STORAGE_DRAFT_NOTES_KEY = 'tol_draft_notes_cache';

// No fabricated internal notes by default
const INITIAL_DEMO_NOTES: DraftInternalNote[] = [];

// Helper to get local cached notes
function getLocalDraftNotes(): DraftInternalNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DRAFT_NOTES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_DRAFT_NOTES_KEY, JSON.stringify(INITIAL_DEMO_NOTES));
      return INITIAL_DEMO_NOTES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_NOTES;
  }
}

// Helper to save local cached notes
function saveLocalDraftNotes(notes: DraftInternalNote[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DRAFT_NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to write local notes cache:', e);
  }
}

/**
 * Fetch all internal draft feedback notes, optionally filtered by articleId
 */
export async function fetchDraftNotes(articleId?: string): Promise<DraftInternalNote[]> {
  try {
    const colRef = collection(db, DRAFT_NOTES_COLLECTION);
    const q = articleId 
      ? query(colRef, where('articleId', '==', articleId))
      : query(colRef, orderBy('timestamp', 'desc'));
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as DraftInternalNote[];
      
      // Sort by timestamp descending
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return list;
    }
    
    // If remote is empty, check or seed local storage
    const local = getLocalDraftNotes();
    if (articleId) {
      return local.filter(n => n.articleId === articleId);
    }
    return local;
  } catch (e) {
    console.warn('Firestore draft notes query failed, using local store:', e);
    const local = getLocalDraftNotes();
    if (articleId) {
      return local.filter(n => n.articleId === articleId);
    }
    return local;
  }
}

/**
 * Create a new internal draft note thread
 */
export async function createDraftNote(noteData: Omit<DraftInternalNote, 'id' | 'timestamp' | 'replies' | 'status'>): Promise<DraftInternalNote> {
  const newNote: DraftInternalNote = {
    ...noteData,
    id: `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'open',
    timestamp: Date.now(),
    replies: []
  };

  try {
    const docRef = doc(db, DRAFT_NOTES_COLLECTION, newNote.id);
    await setDoc(docRef, newNote);
  } catch (e) {
    console.warn('Failed to save draft note to Firestore, falling back to localStorage:', e);
  }

  // Also update local cache
  const local = getLocalDraftNotes();
  const updated = [newNote, ...local.filter(n => n.id !== newNote.id)];
  saveLocalDraftNotes(updated);

  return newNote;
}

/**
 * Add a reply to an internal draft note thread
 */
export async function addDraftNoteReply(
  noteId: string, 
  replyData: Omit<DraftNoteReply, 'id' | 'timestamp'>
): Promise<DraftNoteReply> {
  const newReply: DraftNoteReply = {
    ...replyData,
    id: `rep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    timestamp: Date.now()
  };

  // Update local cache
  const local = getLocalDraftNotes();
  const target = local.find(n => n.id === noteId);
  if (target) {
    target.replies = [...(target.replies || []), newReply];
    saveLocalDraftNotes(local);
  }

  // Update Firestore
  try {
    const docRef = doc(db, DRAFT_NOTES_COLLECTION, noteId);
    const currentReplies = target ? target.replies : [newReply];
    await updateDoc(docRef, { replies: currentReplies });
  } catch (e) {
    console.warn('Failed to update draft note in Firestore:', e);
  }

  return newReply;
}

/**
 * Update the status of an internal note (open / in_progress / resolved)
 */
export async function updateDraftNoteStatus(
  noteId: string, 
  status: DraftNoteStatus,
  resolvedBy?: string,
  resolutionNote?: string
): Promise<void> {
  const updatePayload: Partial<DraftInternalNote> = {
    status,
    ...(status === 'resolved' ? {
      resolvedAt: Date.now(),
      resolvedBy: resolvedBy || 'Editorial Staff',
      resolutionNote: resolutionNote || 'Marked resolved upon verification'
    } : {
      resolvedAt: undefined,
      resolvedBy: undefined,
      resolutionNote: undefined
    })
  };

  // Update local
  const local = getLocalDraftNotes();
  const target = local.find(n => n.id === noteId);
  if (target) {
    Object.assign(target, updatePayload);
    saveLocalDraftNotes(local);
  }

  // Update Firestore
  try {
    const docRef = doc(db, DRAFT_NOTES_COLLECTION, noteId);
    await updateDoc(docRef, updatePayload);
  } catch (e) {
    console.warn('Failed to update note status in Firestore:', e);
  }
}

/**
 * Delete an internal draft note
 */
export async function deleteDraftNote(noteId: string): Promise<void> {
  const local = getLocalDraftNotes();
  saveLocalDraftNotes(local.filter(n => n.id !== noteId));

  try {
    const docRef = doc(db, DRAFT_NOTES_COLLECTION, noteId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Failed to delete note from Firestore:', e);
  }
}

/**
 * Aggregate real-time stats for a contributor / author
 */
export interface PaperMetricBreakdown {
  articleId: string;
  views: number;
  citations: number;
  bookmarks: number;
  annotations: number;
}

export async function compileContributorStats(
  authorEmail: string,
  authorDisplayName: string,
  authorArticles: Article[]
): Promise<{
  stats: ContributorStats;
  bookmarksCount: number;
  peerAnnotationsCount: number;
  notesList: DraftInternalNote[];
  perArticleMetrics: Record<string, PaperMetricBreakdown>;
}> {
  const articleIds = new Set(authorArticles.map(a => a.id));
  const publishedCount = authorArticles.filter(a => a.status === 'published').length;
  const draftsCount = authorArticles.filter(a => a.status === 'draft').length;
  const totalViews = authorArticles.reduce((acc, a) => acc + (a.views || 0), 0);

  const perArticleMetrics: Record<string, PaperMetricBreakdown> = {};

  // Initialize metrics per article with strictly authentic counts (0 default)
  authorArticles.forEach(a => {
    perArticleMetrics[a.id] = {
      articleId: a.id,
      views: a.views || 0,
      citations: 0,
      bookmarks: 0,
      annotations: 0
    };
  });

  let bookmarksCount = 0;
  let peerAnnotationsCount = 0;

  // 1. Query Saved Articles (bookmarks) across both collection names
  try {
    const userSavedCol = collection(db, 'user_saved_articles');
    const savedSnap = await getDocs(userSavedCol);
    savedSnap.forEach(d => {
      const data = d.data() as SavedArticle;
      if (articleIds.has(data.articleId)) {
        bookmarksCount++;
        if (perArticleMetrics[data.articleId]) {
          perArticleMetrics[data.articleId].bookmarks++;
        }
      }
    });

    const legacySavedCol = collection(db, 'saved_articles');
    const legacySnap = await getDocs(legacySavedCol);
    legacySnap.forEach(d => {
      const data = d.data() as SavedArticle;
      if (articleIds.has(data.articleId)) {
        bookmarksCount++;
        if (perArticleMetrics[data.articleId]) {
          perArticleMetrics[data.articleId].bookmarks++;
        }
      }
    });
  } catch (e) {
    console.warn('Bookmarks collection unavailable:', e);
  }

  // 2. Query Peer Annotations / Marginalia
  try {
    const annotationsCol = collection(db, 'peer_annotations');
    const annotSnap = await getDocs(annotationsCol);
    annotSnap.forEach(d => {
      const data = d.data() as PeerAnnotation;
      if (articleIds.has(data.articleId)) {
        peerAnnotationsCount++;
        if (perArticleMetrics[data.articleId]) {
          perArticleMetrics[data.articleId].annotations++;
        }
      }
    });
  } catch (e) {
    console.warn('Peer annotations collection unavailable:', e);
  }

  // Total citations count from actual article metadata references
  const totalCitationsGenerated = authorArticles.reduce((acc, a) => {
    return acc + (perArticleMetrics[a.id]?.citations || 0);
  }, 0);

  // 3. Query Draft Internal Notes for Author's Articles
  const allNotes = await fetchDraftNotes();
  const authorNotes = allNotes.filter(n => articleIds.has(n.articleId) || n.authorEmail.toLowerCase() === authorEmail.toLowerCase());
  const openRevisionNotesCount = authorNotes.filter(n => n.status !== 'resolved').length;
  const resolvedRevisionNotesCount = authorNotes.filter(n => n.status === 'resolved').length;

  const stats: ContributorStats = {
    totalArticles: authorArticles.length,
    publishedCount,
    draftsCount,
    totalViews,
    totalBookmarks: bookmarksCount || Object.values(perArticleMetrics).reduce((s, m) => s + m.bookmarks, 0),
    totalPeerAnnotations: peerAnnotationsCount || Object.values(perArticleMetrics).reduce((s, m) => s + m.annotations, 0),
    totalCitationsGenerated,
    openRevisionNotesCount,
    resolvedRevisionNotesCount
  };

  return {
    stats,
    bookmarksCount: stats.totalBookmarks,
    peerAnnotationsCount: stats.totalPeerAnnotations,
    notesList: authorNotes,
    perArticleMetrics
  };
}

export const CATEGORY_LABELS: Record<DraftNoteCategory, { label: string; icon: string; color: string; badgeBg: string }> = {
  fact_checking: {
    label: 'Fact-Checking',
    icon: 'Search',
    color: 'text-amber-400 border-amber-500/30',
    badgeBg: 'bg-amber-950/30 text-amber-300 border-amber-700/40'
  },
  legal_review: {
    label: 'Legal Clearance',
    icon: 'Scale',
    color: 'text-red-400 border-red-500/30',
    badgeBg: 'bg-red-950/30 text-red-300 border-red-700/40'
  },
  citation_validation: {
    label: 'Citation & DOI Audit',
    icon: 'BookOpen',
    color: 'text-blue-400 border-blue-500/30',
    badgeBg: 'bg-blue-950/30 text-blue-300 border-blue-700/40'
  },
  methodology: {
    label: 'Methodological Rigor',
    icon: 'GraduationCap',
    color: 'text-purple-400 border-purple-500/30',
    badgeBg: 'bg-purple-950/30 text-purple-300 border-purple-700/40'
  },
  general: {
    label: 'Editorial Pacing & Tone',
    icon: 'FileText',
    color: 'text-paper/70 border-paper/20',
    badgeBg: 'bg-paper/10 text-paper/80 border-paper/20'
  }
};
