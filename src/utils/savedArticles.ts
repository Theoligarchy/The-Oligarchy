import { doc, setDoc, getDocs, collection, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Article, SavedArticle } from '../types';

const READER_STORAGE_KEY = 'theoligarchy_reader_id';
const LOCAL_SAVED_ARTICLES_KEY = 'theoligarchy_saved_articles';

/**
 * Get or generate a persistent reader ID for session tracking across page loads
 */
export function getReaderId(): string {
  if (typeof window === 'undefined') return 'reader_anonymous';
  let readerId = localStorage.getItem(READER_STORAGE_KEY);
  if (!readerId) {
    readerId = 'reader_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(READER_STORAGE_KEY, readerId);
  }
  return readerId;
}

/**
 * Helper to retrieve local fallback articles from localStorage
 */
function getLocalSavedArticles(): SavedArticle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error parsing local saved articles:', e);
    return [];
  }
}

/**
 * Save updated local array to localStorage
 */
function setLocalSavedArticles(items: SavedArticle[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_SAVED_ARTICLES_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error persisting local saved articles:', e);
  }
}

/**
 * Fetch user saved articles from Firestore with localStorage fallback
 */
export async function fetchUserSavedArticles(): Promise<SavedArticle[]> {
  const readerId = getReaderId();
  const localItems = getLocalSavedArticles();

  try {
    const colRef = collection(db, 'user_saved_articles');
    const q = query(colRef, where('readerId', '==', readerId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const firestoreItems: SavedArticle[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SavedArticle));

      // Sort by savedAt descending
      firestoreItems.sort((a, b) => b.savedAt - a.savedAt);
      setLocalSavedArticles(firestoreItems);
      return firestoreItems;
    } else if (localItems.length > 0) {
      // Sync local items up to Firestore if empty on cloud
      for (const item of localItems) {
        const docRef = doc(db, 'user_saved_articles', item.id);
        await setDoc(docRef, item, { merge: true });
      }
      return localItems;
    }
  } catch (e) {
    console.warn('Firestore fetch user_saved_articles failed, using local cache:', e);
  }

  return localItems;
}

/**
 * Save an article to user's saved reading list in Firestore and localStorage
 */
export async function saveArticleToReadingList(article: Article, personalNote?: string): Promise<SavedArticle[]> {
  const readerId = getReaderId();
  const docId = `${readerId}_${article.id}`;
  
  const newItem: SavedArticle = {
    id: docId,
    readerId,
    articleId: article.id,
    title: article.title,
    subtitle: article.subtitle,
    category: article.category,
    authorName: article.authorName || 'Priyasha Priyal Jena',
    readTime: article.readTime || '5 min read',
    excerpt: article.excerpt || '',
    featuredImage: article.featuredImage,
    savedAt: Date.now(),
    isRead: false,
    personalNote: personalNote || '',
    pdfLink: article.pdfLink,
    slug: article.slug
  };

  // Update local storage first for zero-latency UI reaction
  const localItems = getLocalSavedArticles();
  const existingIdx = localItems.findIndex(item => item.articleId === article.id);
  let updatedList: SavedArticle[];
  if (existingIdx >= 0) {
    updatedList = [...localItems];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...newItem };
  } else {
    updatedList = [newItem, ...localItems];
  }
  setLocalSavedArticles(updatedList);

  // Sync with Firestore
  try {
    const docRef = doc(db, 'user_saved_articles', docId);
    await setDoc(docRef, newItem, { merge: true });
  } catch (e) {
    console.error('Failed to save article to Firestore user_saved_articles:', e);
  }

  return updatedList;
}

/**
 * Remove an article from user's saved reading list
 */
export async function removeArticleFromReadingList(articleId: string): Promise<SavedArticle[]> {
  const readerId = getReaderId();
  const docId = `${readerId}_${articleId}`;

  // Update local storage
  const localItems = getLocalSavedArticles();
  const updatedList = localItems.filter(item => item.articleId !== articleId && item.id !== docId);
  setLocalSavedArticles(updatedList);

  // Delete from Firestore
  try {
    const docRef = doc(db, 'user_saved_articles', docId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Failed to delete article from Firestore user_saved_articles:', e);
  }

  return updatedList;
}

/**
 * Toggle read status of a saved article
 */
export async function toggleArticleReadStatus(articleId: string, isRead: boolean): Promise<SavedArticle[]> {
  const readerId = getReaderId();
  const docId = `${readerId}_${articleId}`;

  // Update local storage
  const localItems = getLocalSavedArticles();
  const updatedList = localItems.map(item => {
    if (item.articleId === articleId || item.id === docId) {
      return { ...item, isRead };
    }
    return item;
  });
  setLocalSavedArticles(updatedList);

  // Update Firestore
  try {
    const docRef = doc(db, 'user_saved_articles', docId);
    await updateDoc(docRef, { isRead });
  } catch (e) {
    console.error('Failed to update read status in Firestore:', e);
  }

  return updatedList;
}

/**
 * Update personal note on a saved article
 */
export async function updateArticleNote(articleId: string, personalNote: string): Promise<SavedArticle[]> {
  const readerId = getReaderId();
  const docId = `${readerId}_${articleId}`;

  // Update local storage
  const localItems = getLocalSavedArticles();
  const updatedList = localItems.map(item => {
    if (item.articleId === articleId || item.id === docId) {
      return { ...item, personalNote };
    }
    return item;
  });
  setLocalSavedArticles(updatedList);

  // Update Firestore
  try {
    const docRef = doc(db, 'user_saved_articles', docId);
    await updateDoc(docRef, { personalNote });
  } catch (e) {
    console.error('Failed to update personal note in Firestore:', e);
  }

  return updatedList;
}
