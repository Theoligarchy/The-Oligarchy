import { EditorialRole, EditorialUser, Article } from '../types';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const INITIAL_EDITORIAL_TEAM: EditorialUser[] = [
  {
    uid: 'founder-priyasha',
    email: 'theoligarchy.ppj@gmail.com',
    displayName: 'Priyasha Priyal Jena',
    role: 'admin',
    authorId: 'priyasha-priyal-jena',
    institution: 'The Oligarchy',
    credentials: 'Founder & Editor-in-Chief',
    // orcid left undefined unless explicitly provided by Priyasha
    bio: 'Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power. Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do.',
    assignedCategories: ['criminology', 'psyche', 'politics'],
    status: 'active'
  }
];

export const ROLE_LABELS: Record<EditorialRole, { title: string; badge: string; color: string; desc: string }> = {
  admin: {
    title: 'Managing Editor / Administrator',
    badge: 'MANAGING EDITOR',
    color: 'bg-blood/20 text-blood-light border-blood/40',
    desc: 'Full publishing authority, homepage curation, featured paper selection, editorial staff RBAC management, and newsletter dispatch.'
  },
  reviewer: {
    title: 'Peer Reviewer / Editor',
    badge: 'PEER REVIEWER',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Access to peer review queue pipeline, line-by-line editorial marginalia annotations, scoring scorecards, and approval / revision requests.'
  },
  author: {
    title: 'Author / Guest Researcher',
    badge: 'GUEST RESEARCHER',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    desc: 'Compose and save drafts, submit manuscripts for peer review, and manage personal scholar bio without access to subscriber lists or site-wide configuration.'
  }
};

/**
 * Check if the user has permission to perform specific editorial actions
 */
export const rbac = {
  canPublish: (role: EditorialRole): boolean => {
    return role === 'admin';
  },

  canFeatureOrPin: (role: EditorialRole): boolean => {
    return role === 'admin';
  },

  canManageSubscribers: (role: EditorialRole): boolean => {
    return role === 'admin';
  },

  canManageSettings: (role: EditorialRole): boolean => {
    return role === 'admin';
  },

  canManageTeam: (role: EditorialRole): boolean => {
    return role === 'admin';
  },

  canAccessTips: (role: EditorialRole): boolean => {
    return role === 'admin';
  },

  canAccessAnalytics: (role: EditorialRole): boolean => {
    return role === 'admin' || role === 'reviewer';
  },

  canReviewManuscripts: (role: EditorialRole): boolean => {
    return role === 'admin' || role === 'reviewer';
  },

  canModerateMarginalia: (role: EditorialRole): boolean => {
    return role === 'admin' || role === 'reviewer';
  },

  canWriteArticles: (_role: EditorialRole): boolean => {
    return true; // all editorial users can write/draft
  },

  canEditArticle: (article: Article, user: EditorialUser): boolean => {
    if (user.role === 'admin') return true;
    if (user.role === 'reviewer') return true; // Reviewers can edit / add peer annotations
    
    // Authors can only edit their own manuscripts
    const isOwnerByAuthorId = article.authorId && user.authorId && article.authorId === user.authorId;
    const isOwnerByName = article.authorName && user.displayName && 
      article.authorName.trim().toLowerCase() === user.displayName.trim().toLowerCase();
    const isOwnerByUid = article.createdByUid && article.createdByUid === user.uid;
    const isOwnerByEmail = article.createdByEmail && user.email && 
      article.createdByEmail.toLowerCase() === user.email.toLowerCase();

    return Boolean(isOwnerByAuthorId || isOwnerByName || isOwnerByUid || isOwnerByEmail);
  },

  canDeleteArticle: (article: Article, user: EditorialUser): boolean => {
    if (user.role === 'admin') return true;
    // Authors can only delete their own unpublished drafts
    if (user.role === 'author' && article.status === 'draft') {
      return rbac.canEditArticle(article, user);
    }
    return false;
  },

  filterVisibleArticles: (articles: Article[], user: EditorialUser): Article[] => {
    if (user.role === 'admin' || user.role === 'reviewer') {
      return articles;
    }
    // Guest Researchers only see published articles + their own drafts
    return articles.filter(art => {
      if (art.status === 'published') return true;
      return rbac.canEditArticle(art, user);
    });
  }
};

const LOCAL_STORAGE_TEAM_KEY = 'tol_editorial_team_cache';

/**
 * Fetch all registered editorial team members
 */
export async function fetchEditorialTeam(): Promise<EditorialUser[]> {
  try {
    const colRef = collection(db, 'editorial_team');
    const snap = await getDocs(colRef);
    
    let members: EditorialUser[] = [];
    if (!snap.empty) {
      members = snap.docs.map(d => ({ ...d.data(), uid: d.id } as EditorialUser));
    }

    // Merge with initial seeds if not present
    const existingEmails = new Set(members.map(m => m.email.toLowerCase()));
    INITIAL_EDITORIAL_TEAM.forEach(seed => {
      if (!existingEmails.has(seed.email.toLowerCase())) {
        members.push(seed);
      }
    });

    localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, JSON.stringify(members));
    return members;
  } catch (err) {
    console.warn('Failed to fetch editorial team from Firestore, loading local cache:', err);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_TEAM_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return INITIAL_EDITORIAL_TEAM;
  }
}

/**
 * Resolve an EditorialUser from Firebase Auth user or local session
 */
export async function resolveEditorialUser(authUser: { email?: string | null; uid?: string; displayName?: string | null }): Promise<EditorialUser> {
  const email = (authUser.email || '').toLowerCase().trim();
  const uid = authUser.uid || 'anon-uid';
  
  // 1. Primary Owner check
  if (email === 'theoligarchy.ppj@gmail.com') {
    return {
      uid: uid || 'founder-priyasha',
      email: 'theoligarchy.ppj@gmail.com',
      displayName: authUser.displayName || 'Priyasha Priyal Jena',
      role: 'admin',
      authorId: 'priyasha-priyal-jena',
      institution: 'The Oligarchy',
      credentials: 'Founder & Editor-in-Chief',
      bio: 'Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power.',
      assignedCategories: ['criminology', 'psyche', 'politics'],
      status: 'active'
    };
  }

  // 2. Check team registry in Firestore
  try {
    const teamDoc = await getDoc(doc(db, 'editorial_team', uid));
    if (teamDoc.exists()) {
      return { ...teamDoc.data(), uid: teamDoc.id } as EditorialUser;
    }

    // Also check by email
    const team = await fetchEditorialTeam();
    const found = team.find(m => m.email.toLowerCase() === email);
    if (found) {
      return found;
    }
  } catch (e) {
    console.warn('Error resolving user from editorial team registry:', e);
  }

  // 3. Check local simulated role override
  const simulatedRole = localStorage.getItem('tol_simulated_role') as EditorialRole | null;
  if (simulatedRole && (simulatedRole === 'admin' || simulatedRole === 'reviewer' || simulatedRole === 'author')) {
    return {
      uid,
      email: email || 'guest.researcher@theoligarchy.org',
      displayName: authUser.displayName || email.split('@')[0] || 'Guest Researcher',
      role: simulatedRole,
      authorId: email ? email.split('@')[0] : 'guest-researcher',
      status: 'active'
    };
  }

  // 4. Default for any new authenticated scholar: Author / Guest Researcher
  return {
    uid,
    email: email || 'contributor@theoligarchy.org',
    displayName: authUser.displayName || (email ? email.split('@')[0] : 'Scholar Contributor'),
    role: 'author',
    authorId: email ? email.split('@')[0].replace(/[^a-z0-9]/g, '-') : 'guest-author',
    status: 'active'
  };
}

/**
 * Save / Update an Editorial Member in Firestore
 */
export async function saveEditorialMember(member: EditorialUser): Promise<void> {
  try {
    const docRef = doc(db, 'editorial_team', member.uid);
    await setDoc(docRef, member, { merge: true });
    
    // Update local cache
    const team = await fetchEditorialTeam();
    const idx = team.findIndex(m => m.uid === member.uid || m.email.toLowerCase() === member.email.toLowerCase());
    if (idx >= 0) {
      team[idx] = member;
    } else {
      team.push(member);
    }
    localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, JSON.stringify(team));
  } catch (err) {
    console.error('Failed to save editorial member:', err);
    // Fallback to local storage
    const team = await fetchEditorialTeam();
    const idx = team.findIndex(m => m.uid === member.uid || m.email.toLowerCase() === member.email.toLowerCase());
    if (idx >= 0) {
      team[idx] = member;
    } else {
      team.push(member);
    }
    localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, JSON.stringify(team));
  }
}

/**
 * Delete an Editorial Member from Firestore
 */
export async function deleteEditorialMember(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'editorial_team', uid));
    const team = await fetchEditorialTeam();
    const updated = team.filter(m => m.uid !== uid);
    localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete editorial member:', err);
  }
}
