import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, doc, setDoc, query, where, orderBy, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { Article, ReadingItem, ResearchTip, NewsletterSubscriber } from './types';

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

import { INITIAL_SEED_ARTICLES, INITIAL_SEED_READING } from './data/initialSeed';

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
