import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  collection, 
  getDocs, 
  getDocsFromServer,
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  getDoc, 
  getDocFromServer,
  updateDoc, 
  deleteDoc,
  DocumentSnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { Article, ReadingItem, ResearchTip, NewsletterSubscriber } from './types';
import { INITIAL_SEED_ARTICLES, INITIAL_SEED_READING } from './data/initialSeed';
import { getCachedArticles } from './utils/articleCache';

import firebaseAppletConfig from '../firebase-applet-config.json';

// Read configuration
const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId,
  appId: firebaseAppletConfig.appId,
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || 'default',
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };

// In-memory cache for full articles to prevent redundant network fetches
const fullArticlesCache = new Map<string, Article>();

// Populate initial seeds into cache
INITIAL_SEED_ARTICLES.forEach(art => {
  fullArticlesCache.set(art.id, art);
  if (art.slug) fullArticlesCache.set(art.slug, art);
});

export function clearFullArticlesCache(): void {
  fullArticlesCache.clear();
  INITIAL_SEED_ARTICLES.forEach(art => {
    fullArticlesCache.set(art.id, art);
    if (art.slug) fullArticlesCache.set(art.slug, art);
  });
}

export function resolveArticleAuthorInfo(data: any): { authorId: string; authorName: string } {
  const rawId = (data.authorId || '').trim();
  const rawName = (data.authorName || data.author || '').trim();
  
  return {
    authorId: rawId || 'priyasha-priyal-jena',
    authorName: rawName || 'Priyasha Priyal Jena'
  };
}

export interface FetchArticlesOptions {
  status?: 'published' | 'draft' | 'all';
  category?: string;
  sortBy?: 'createdAt' | 'views' | 'publishDate';
  limitCount?: number;
  lastDoc?: DocumentSnapshot;
}

export interface FetchArticlesResult {
  articles: Article[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Helper to parse a Firestore document snapshot into a typed Article preview
 */
export function parseArticlePreviewDoc(docSnap: DocumentSnapshot): Article {
  const data = (docSnap.data() || {}) as any;
  const artId = docSnap.id;
  const authorInfo = resolveArticleAuthorInfo(data);
  const rawCover = (data.featuredImage || data.coverImage || data.coverImageUrl || '').trim();
  const rawCoverVersion = data.coverImageUpdatedAt || data.updatedAt || data.createdAt || undefined;

  const preview: Article = {
    id: artId,
    title: data.title || '',
    subtitle: data.subtitle || '',
    slug: data.slug || artId,
    category: data.category || 'criminology',
    tags: Array.isArray(data.tags) ? data.tags : [],
    featuredImage: rawCover,
    coverImage: rawCover,
    coverImageUrl: rawCover,
    coverImageUpdatedAt: rawCoverVersion,
    fromCache: docSnap.metadata ? docSnap.metadata.fromCache : undefined,
    hasPendingWrites: docSnap.metadata ? docSnap.metadata.hasPendingWrites : undefined,
    canvaEmbed: data.canvaEmbed || '',
    pdfLink: data.pdfLink || '',
    authorId: authorInfo.authorId,
    authorName: authorInfo.authorName,
    authorTitle: data.authorTitle || undefined,
    authorInstitution: data.authorInstitution || undefined,
    authorOrcid: data.authorOrcid || undefined,
    coAuthors: Array.isArray(data.coAuthors) ? data.coAuthors : [],
    doi: data.doi || undefined,
    archivalRefId: data.archivalRefId || undefined,
    createdByUid: data.createdByUid || undefined,
    createdByEmail: data.createdByEmail || undefined,
    assignedReviewerUids: Array.isArray(data.assignedReviewerUids) ? data.assignedReviewerUids : [],
    assignedReviewerEmails: Array.isArray(data.assignedReviewerEmails) ? data.assignedReviewerEmails : [],
    readTime: data.readTime || '5 min read',
    excerpt: data.excerpt || '',
    content: data.content || '',
    status: data.status || 'published',
    originalPublishedAt: data.originalPublishedAt || data.publishDate || undefined,
    publishDate: data.originalPublishedAt || data.publishDate || '',
    scheduledAt: data.scheduledAt,
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || Date.now(),
    views: typeof data.views === 'number' ? data.views : 0,
    isFeatured: Boolean(data.isFeatured),
    isPinned: Boolean(data.isPinned),
    featuredOrder: data.featuredOrder,
    seriesName: data.seriesName || '',
    seriesPart: data.seriesPart,
    sources: Array.isArray(data.sources) ? data.sources : [],
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    canonicalUrl: data.canonicalUrl,
  };

  // If full content is present in the document, update the in-memory cache
  if (data.content && data.content.length > 50) {
    fullArticlesCache.set(artId, preview);
    if (preview.slug) fullArticlesCache.set(preview.slug, preview);
  }

  return preview;
}

/**
 * Optimized Article Previews Fetcher:
 * Uses compound Firestore queries (leveraging composite indexes) and produces
 * lightweight article objects for feeds and search without multi-megabyte content payloads.
 */
export async function fetchArticlePreviews(options: FetchArticlesOptions = {}): Promise<FetchArticlesResult> {
  const {
    status = 'published',
    category,
    sortBy = 'createdAt',
    limitCount = 20,
    lastDoc
  } = options;

  // Zero-trust check: Unauthenticated clients must only query published articles to satisfy security rules.
  // Managing editor can query 'all' when authenticated.
  const currentUser = auth.currentUser;
  const currentEmail = (currentUser?.email || '').toLowerCase().trim();
  const isPrivilegedEditor = Boolean(currentUser && currentEmail === 'theoligarchy.ppj@gmail.com');

  const effectiveStatus = (!isPrivilegedEditor && status === 'all') ? 'published' : status;

  try {
    const articlesCol = collection(db, 'articles');
    const constraints: any[] = [];

    // Filter by status if specified and not 'all'
    if (effectiveStatus !== 'all') {
      constraints.push(where('status', '==', effectiveStatus));
    }

    // Optional category filtering in query
    if (category && category !== 'all') {
      constraints.push(where('category', '==', category));
    }

    // Compound Order By
    constraints.push(orderBy(sortBy, 'desc'));

    // Pagination limit
    if (limitCount > 0) {
      constraints.push(limit(limitCount));
    }

    // Cursor for infinite scroll / pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    let q = query(articlesCol, ...constraints);
    let snapshot;

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          snapshot = await getDocsFromServer(q);
        } catch {
          snapshot = await getDocs(q);
        }
      } else {
        snapshot = await getDocs(q);
      }
    } catch (queryErr: any) {
      // Fallback query if composite index is building or missing:
      // Preserve the security-critical status filter so security rules pass without permission denied!
      console.warn("Compound indexed query encountered fallback:", queryErr?.message || queryErr);
      const fallbackConstraints: any[] = [];
      if (effectiveStatus !== 'all') {
        fallbackConstraints.push(where('status', '==', effectiveStatus));
      }
      if (category && category !== 'all') {
        fallbackConstraints.push(where('category', '==', category));
      }
      fallbackConstraints.push(limit(limitCount || 30));
      const fallbackQuery = query(articlesCol, ...fallbackConstraints);
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          snapshot = await getDocsFromServer(fallbackQuery);
        } else {
          snapshot = await getDocs(fallbackQuery);
        }
      } catch {
        snapshot = await getDocs(fallbackQuery);
      }
    }

    if (snapshot.empty && !lastDoc) {
      // If empty on first load, seed initial data safely
      await seedInitialDataIfEmpty();
      const retryConstraints: any[] = [];
      if (effectiveStatus !== 'all') {
        retryConstraints.push(where('status', '==', effectiveStatus));
      }
      retryConstraints.push(limit(limitCount || 30));
      snapshot = await getDocs(query(articlesCol, ...retryConstraints));
    }

    const fetchedArticles: Article[] = snapshot.docs.map(parseArticlePreviewDoc);

    // Ensure robust in-memory sorting
    fetchedArticles.sort((a, b) => {
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'publishDate') {
        const dateA = new Date(a.publishDate || a.createdAt).getTime();
        const dateB = new Date(b.publishDate || b.createdAt).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length >= limitCount;

    return {
      articles: fetchedArticles,
      lastDoc: newLastDoc,
      hasMore
    };
  } catch (error) {
    console.warn("Resolving article previews from local cache fallback:", error);
    const cachedFallback = getCachedArticles();
    return {
      articles: cachedFallback.length > 0 ? cachedFallback : INITIAL_SEED_ARTICLES,
      lastDoc: null,
      hasMore: false
    };
  }
}

/**
 * Fetch drafts owned by a specific authenticated author
 */
export async function fetchAuthorDraftArticles(userInfo: { uid?: string; email?: string; authorId?: string }): Promise<Article[]> {
  if (!userInfo.uid && !userInfo.email && !userInfo.authorId) return [];

  const articlesCol = collection(db, 'articles');
  const results: Article[] = [];
  const seenIds = new Set<string>();

  // 1. By authorId
  if (userInfo.authorId) {
    try {
      const q = query(articlesCol, where('authorId', '==', userInfo.authorId), where('status', '==', 'draft'));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push(parseArticlePreviewDoc(d));
        }
      });
    } catch {
      try {
        const qFallback = query(articlesCol, where('authorId', '==', userInfo.authorId));
        const snap = await getDocs(qFallback);
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'draft' && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push(parseArticlePreviewDoc(d));
          }
        });
      } catch {}
    }
  }

  // 2. By createdByEmail
  if (userInfo.email) {
    const email = userInfo.email.toLowerCase().trim();
    try {
      const qEmail = query(articlesCol, where('createdByEmail', '==', email), where('status', '==', 'draft'));
      const snap = await getDocs(qEmail);
      snap.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push(parseArticlePreviewDoc(d));
        }
      });
    } catch {
      try {
        const qFallback = query(articlesCol, where('createdByEmail', '==', email));
        const snap = await getDocs(qFallback);
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'draft' && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push(parseArticlePreviewDoc(d));
          }
        });
      } catch {}
    }
  }

  // 3. By createdByUid
  if (userInfo.uid) {
    try {
      const qUid = query(articlesCol, where('createdByUid', '==', userInfo.uid), where('status', '==', 'draft'));
      const snap = await getDocs(qUid);
      snap.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push(parseArticlePreviewDoc(d));
        }
      });
    } catch {}
  }

  return results;
}

/**
 * On-Demand Full Article Fetcher:
 * Fetches the full multi-thousand-word article body, citations, and version history
 * only when an article is opened for reading or editing.
 */
export async function fetchFullArticle(articleIdOrSlug: string, forceFresh: boolean = false): Promise<Article | null> {
  if (!articleIdOrSlug) return null;
  const targetKey = articleIdOrSlug.trim();

  // Check in-memory cache first for 0ms response unless forced fresh
  if (!forceFresh && fullArticlesCache.has(targetKey)) {
    const cached = fullArticlesCache.get(targetKey)!;
    if (cached.content && cached.content.length > 50) {
      return cached;
    }
  }

  try {
    // Attempt direct ID fetch from server first when online
    const artRef = doc(db, 'articles', targetKey);
    let artSnap;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        artSnap = await getDocFromServer(artRef);
      } else {
        artSnap = await getDoc(artRef);
      }
    } catch {
      artSnap = await getDoc(artRef);
    }

    if (artSnap.exists()) {
      const data = artSnap.data() as any;
      const authorInfo = resolveArticleAuthorInfo(data);
      const rawCover = (data.featuredImage || data.coverImage || data.coverImageUrl || '').trim();
      const rawCoverVersion = data.coverImageUpdatedAt || data.updatedAt || data.createdAt || undefined;

      const fullArticle: Article = {
        id: artSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        slug: data.slug || artSnap.id,
        category: data.category || 'criminology',
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: rawCover,
        coverImage: rawCover,
        coverImageUrl: rawCover,
        coverImageUpdatedAt: rawCoverVersion,
        fromCache: artSnap.metadata ? artSnap.metadata.fromCache : undefined,
        hasPendingWrites: artSnap.metadata ? artSnap.metadata.hasPendingWrites : undefined,
        canvaEmbed: data.canvaEmbed || '',
        pdfLink: data.pdfLink || '',
        authorId: authorInfo.authorId,
        authorName: authorInfo.authorName,
        authorTitle: data.authorTitle || undefined,
        authorInstitution: data.authorInstitution || undefined,
        authorOrcid: data.authorOrcid || undefined,
        coAuthors: Array.isArray(data.coAuthors) ? data.coAuthors : [],
        doi: data.doi || undefined,
        archivalRefId: data.archivalRefId || undefined,
        createdByUid: data.createdByUid || undefined,
        createdByEmail: data.createdByEmail || undefined,
        assignedReviewerUids: Array.isArray(data.assignedReviewerUids) ? data.assignedReviewerUids : [],
        assignedReviewerEmails: Array.isArray(data.assignedReviewerEmails) ? data.assignedReviewerEmails : [],
        readTime: data.readTime || '5 min read',
        excerpt: data.excerpt || '',
        content: data.content || '',
        status: data.status || 'published',
        originalPublishedAt: data.originalPublishedAt || data.publishDate || undefined,
        publishDate: data.originalPublishedAt || data.publishDate || '',
        scheduledAt: data.scheduledAt,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        views: typeof data.views === 'number' ? data.views : 0,
        isFeatured: Boolean(data.isFeatured),
        isPinned: Boolean(data.isPinned),
        featuredOrder: data.featuredOrder,
        seriesName: data.seriesName || '',
        seriesPart: data.seriesPart,
        sources: Array.isArray(data.sources) ? data.sources : [],
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        canonicalUrl: data.canonicalUrl,
        versions: Array.isArray(data.versions) ? data.versions : []
      };

      fullArticlesCache.set(fullArticle.id, fullArticle);
      if (fullArticle.slug) fullArticlesCache.set(fullArticle.slug, fullArticle);
      return fullArticle;
    }

    // If ID didn't match, query by slug with orderBy createdAt desc
    let slugSnap;
    try {
      const slugQuery = query(collection(db, 'articles'), where('slug', '==', targetKey), orderBy('createdAt', 'desc'), limit(1));
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        slugSnap = await getDocsFromServer(slugQuery);
      } else {
        slugSnap = await getDocs(slugQuery);
      }
    } catch {
      // Fallback query without orderBy
      const fallbackSlugQuery = query(collection(db, 'articles'), where('slug', '==', targetKey), limit(5));
      slugSnap = await getDocs(fallbackSlugQuery);
    }

    if (!slugSnap.empty) {
      // If multiple, sort newest first
      const docsSorted = [...slugSnap.docs].sort((a, b) => {
        const aCreated = a.data()?.createdAt || 0;
        const bCreated = b.data()?.createdAt || 0;
        return bCreated - aCreated;
      });
      const docSnap = docsSorted[0];
      const data = docSnap.data() as any;
      const authorInfo = resolveArticleAuthorInfo(data);
      const rawCover = (data.featuredImage || data.coverImage || data.coverImageUrl || '').trim();
      const rawCoverVersion = data.coverImageUpdatedAt || data.updatedAt || data.createdAt || undefined;

      const fullArticle: Article = {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        slug: data.slug || docSnap.id,
        category: data.category || 'criminology',
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: rawCover,
        coverImage: rawCover,
        coverImageUrl: rawCover,
        coverImageUpdatedAt: rawCoverVersion,
        fromCache: docSnap.metadata ? docSnap.metadata.fromCache : undefined,
        hasPendingWrites: docSnap.metadata ? docSnap.metadata.hasPendingWrites : undefined,
        canvaEmbed: data.canvaEmbed || '',
        pdfLink: data.pdfLink || '',
        authorId: authorInfo.authorId,
        authorName: authorInfo.authorName,
        authorTitle: data.authorTitle || undefined,
        authorInstitution: data.authorInstitution || undefined,
        authorOrcid: data.authorOrcid || undefined,
        coAuthors: Array.isArray(data.coAuthors) ? data.coAuthors : [],
        doi: data.doi || undefined,
        archivalRefId: data.archivalRefId || undefined,
        createdByUid: data.createdByUid || undefined,
        createdByEmail: data.createdByEmail || undefined,
        assignedReviewerUids: Array.isArray(data.assignedReviewerUids) ? data.assignedReviewerUids : [],
        assignedReviewerEmails: Array.isArray(data.assignedReviewerEmails) ? data.assignedReviewerEmails : [],
        readTime: data.readTime || '5 min read',
        excerpt: data.excerpt || '',
        content: data.content || '',
        status: data.status || 'published',
        originalPublishedAt: data.originalPublishedAt || data.publishDate || undefined,
        publishDate: data.originalPublishedAt || data.publishDate || '',
        scheduledAt: data.scheduledAt,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        views: typeof data.views === 'number' ? data.views : 0,
        isFeatured: Boolean(data.isFeatured),
        isPinned: Boolean(data.isPinned),
        featuredOrder: data.featuredOrder,
        seriesName: data.seriesName || '',
        seriesPart: data.seriesPart,
        sources: Array.isArray(data.sources) ? data.sources : [],
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        canonicalUrl: data.canonicalUrl,
        versions: Array.isArray(data.versions) ? data.versions : []
      };

      fullArticlesCache.set(fullArticle.id, fullArticle);
      if (fullArticle.slug) fullArticlesCache.set(fullArticle.slug, fullArticle);
      return fullArticle;
    }

    // Check local storage cached articles fallback
    const cachedArticles = getCachedArticles();
    const cachedFound = cachedArticles.find(a => a.id === targetKey || a.slug === targetKey);
    if (cachedFound && cachedFound.content && cachedFound.content.length > 50) {
      return cachedFound;
    }

    // Check seed fallback
    const seedFound = INITIAL_SEED_ARTICLES.find(a => a.id === targetKey || a.slug === targetKey);
    if (seedFound) {
      return seedFound;
    }

    return cachedFound || null;
  } catch (error) {
    console.warn("Network unavailable, resolving full article detail from local fallback:", error);
    const cachedArticles = getCachedArticles();
    const cachedFound = cachedArticles.find(a => a.id === targetKey || a.slug === targetKey);
    if (cachedFound && cachedFound.content && cachedFound.content.length > 50) {
      return cachedFound;
    }
    const seedFound = INITIAL_SEED_ARTICLES.find(a => a.id === targetKey || a.slug === targetKey);
    return seedFound || cachedFound || null;
  }
}

// Seed initial articles if Firestore is empty
export async function seedInitialDataIfEmpty() {
  try {
    const articlesCol = collection(db, 'articles');
    const articlesSnapshot = await getDocs(query(articlesCol, where('status', '==', 'published'), limit(1)));
    
    if (articlesSnapshot.empty && auth.currentUser) {
      console.log('Database empty. Seeding initial academic-journal articles...');
      for (const article of INITIAL_SEED_ARTICLES) {
        await setDoc(doc(db, 'articles', article.id), article);
      }
      
      // Seed default reading item
      for (const sampleBook of INITIAL_SEED_READING) {
        await setDoc(doc(db, 'reading', sampleBook.id), sampleBook);
      }
      
      console.log('Seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

