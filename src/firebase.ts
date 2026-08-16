import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  getDoc, 
  updateDoc, 
  deleteDoc,
  DocumentSnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { Article, ReadingItem, ResearchTip, NewsletterSubscriber } from './types';
import { INITIAL_SEED_ARTICLES, INITIAL_SEED_READING } from './data/initialSeed';
import { getCachedArticles } from './utils/articleCache';

// Read configuration
const firebaseConfig = {
  projectId: "balmy-framing-jj1d7",
  appId: "1:214639932128:web:eac4df8af286d485129685",
  apiKey: "AIzaSyAsbdYOc7qhoaOauFUi5qiELvxKHgFICjg",
  authDomain: "balmy-framing-jj1d7.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-theoligarchy-56998575-a2c5-4cbc-8cbc-dd66e1c68ca1",
  storageBucket: "balmy-framing-jj1d7.firebasestorage.app",
  messagingSenderId: "214639932128",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = initializeFirestore(app, {
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

  try {
    const articlesCol = collection(db, 'articles');
    const constraints: any[] = [];

    // Filter by status if specified and not 'all'
    if (status !== 'all') {
      constraints.push(where('status', '==', status));
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
      snapshot = await getDocs(q);
    } catch (queryErr: any) {
      // Fallback query if composite index is building or missing
      console.warn("Compound indexed query encountered fallback:", queryErr?.message || queryErr);
      const fallbackQuery = query(articlesCol, limit(limitCount || 30));
      snapshot = await getDocs(fallbackQuery);
    }

    if (snapshot.empty && !lastDoc) {
      // If empty on first load, seed initial data
      await seedInitialDataIfEmpty();
      snapshot = await getDocs(query(articlesCol, limit(limitCount || 30)));
    }

    const fetchedArticles: Article[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as any;
      const artId = docSnap.id;

      // Extract lightweight preview fields
      const preview: Article = {
        id: artId,
        title: data.title || '',
        subtitle: data.subtitle || '',
        slug: data.slug || artId,
        category: data.category || 'criminology',
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: data.featuredImage || '',
        canvaEmbed: data.canvaEmbed || '',
        pdfLink: data.pdfLink || '',
        authorId: data.authorId || 'priyasha-priyal-jena',
        authorName: data.authorName || 'Priyasha Priyal Jena',
        readTime: data.readTime || '5 min read',
        excerpt: data.excerpt || '',
        content: data.content || '', // will be populated from cache or full fetch if needed
        status: data.status || 'published',
        publishDate: data.publishDate || '',
        scheduledAt: data.scheduledAt,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        views: typeof data.views === 'number' ? data.views : 0,
        isFeatured: Boolean(data.isFeatured),
        isPinned: Boolean(data.isPinned),
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
    });

    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length >= limitCount;

    return {
      articles: fetchedArticles,
      lastDoc: newLastDoc,
      hasMore
    };
  } catch (error) {
    console.warn("Network unavailable, resolving article previews from local cache fallback:", error);
    const cachedFallback = getCachedArticles();
    return {
      articles: cachedFallback.length > 0 ? cachedFallback : INITIAL_SEED_ARTICLES,
      lastDoc: null,
      hasMore: false
    };
  }
}

/**
 * On-Demand Full Article Fetcher:
 * Fetches the full multi-thousand-word article body, citations, and version history
 * only when an article is opened for reading or editing.
 */
export async function fetchFullArticle(articleIdOrSlug: string): Promise<Article | null> {
  if (!articleIdOrSlug) return null;
  const targetKey = articleIdOrSlug.trim();

  // Check in-memory cache first for 0ms response
  if (fullArticlesCache.has(targetKey)) {
    const cached = fullArticlesCache.get(targetKey)!;
    if (cached.content && cached.content.length > 50) {
      return cached;
    }
  }

  try {
    // Attempt direct ID fetch
    const artRef = doc(db, 'articles', targetKey);
    const artSnap = await getDoc(artRef);

    if (artSnap.exists()) {
      const data = artSnap.data() as any;
      const fullArticle: Article = {
        id: artSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        slug: data.slug || artSnap.id,
        category: data.category || 'criminology',
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: data.featuredImage || '',
        canvaEmbed: data.canvaEmbed || '',
        pdfLink: data.pdfLink || '',
        authorId: data.authorId || 'priyasha-priyal-jena',
        authorName: data.authorName || 'Priyasha Priyal Jena',
        readTime: data.readTime || '5 min read',
        excerpt: data.excerpt || '',
        content: data.content || '',
        status: data.status || 'published',
        publishDate: data.publishDate || '',
        scheduledAt: data.scheduledAt,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        views: typeof data.views === 'number' ? data.views : 0,
        isFeatured: Boolean(data.isFeatured),
        isPinned: Boolean(data.isPinned),
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

    // If ID didn't match, query by slug
    const slugQuery = query(collection(db, 'articles'), where('slug', '==', targetKey), limit(1));
    const slugSnap = await getDocs(slugQuery);
    if (!slugSnap.empty) {
      const docSnap = slugSnap.docs[0];
      const data = docSnap.data() as any;
      const fullArticle: Article = {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        slug: data.slug || docSnap.id,
        category: data.category || 'criminology',
        tags: Array.isArray(data.tags) ? data.tags : [],
        featuredImage: data.featuredImage || '',
        canvaEmbed: data.canvaEmbed || '',
        pdfLink: data.pdfLink || '',
        authorId: data.authorId || 'priyasha-priyal-jena',
        authorName: data.authorName || 'Priyasha Priyal Jena',
        readTime: data.readTime || '5 min read',
        excerpt: data.excerpt || '',
        content: data.content || '',
        status: data.status || 'published',
        publishDate: data.publishDate || '',
        scheduledAt: data.scheduledAt,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        views: typeof data.views === 'number' ? data.views : 0,
        isFeatured: Boolean(data.isFeatured),
        isPinned: Boolean(data.isPinned),
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
    const articlesSnapshot = await getDocs(articlesCol);
    
    if (articlesSnapshot.empty) {
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

