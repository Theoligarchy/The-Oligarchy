import { EditorialRole, EditorialUser, Article, Permission } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sanitizeFirestoreData } from '../utils/firestoreSanitizer';

export const DESIGNATED_OWNER_EMAIL = 'theoligarchy.ppj@gmail.com';

export const INITIAL_EDITORIAL_TEAM: EditorialUser[] = [
  {
    uid: 'founder-priyasha',
    email: DESIGNATED_OWNER_EMAIL,
    displayName: 'Priyasha Priyal Jena',
    role: 'owner',
    authorId: 'priyasha-priyal-jena',
    institution: 'The Oligarchy',
    credentials: 'Founder & Editor-in-Chief',
    bio: 'Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power. Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do.',
    assignedCategories: ['criminology', 'psyche', 'politics'],
    status: 'active'
  },
  {
    uid: 'keluk1GwazV5dZqNNYCOQPr9JnP2',
    email: 'saniasvb26@gmail.com',
    displayName: 'Sania',
    role: 'author',
    authorId: 'sania',
    institution: 'The Oligarchy Contributing Researcher',
    credentials: 'Author & Contributing Researcher',
    bio: 'Contributing researcher and scholar exploring investigative criminology, institutional dynamics, and political analysis.',
    assignedCategories: ['criminology', 'psyche', 'politics'],
    status: 'active'
  }
];

export const ROLE_LABELS: Record<EditorialRole, { title: string; badge: string; color: string; desc: string }> = {
  owner: {
    title: 'Founder & Owner',
    badge: 'FOUNDER / OWNER',
    color: 'bg-blood/20 text-blood-light border-blood/50',
    desc: 'Sole permanent root authority. Full access to user management, role assignments, site settings, security rules, research stack, and publications.'
  },
  admin: {
    title: 'Managing Editor',
    badge: 'MANAGING EDITOR',
    color: 'bg-rose-950/40 text-rose-300 border-rose-500/40',
    desc: 'Full editorial authority: review drafts, approve/reject submissions, publish/schedule articles, manage featured papers, and assign peer reviewers.'
  },
  author: {
    title: 'Author / Scholar Contributor',
    badge: 'SCHOLAR CONTRIBUTOR',
    color: 'bg-blue-950/40 text-blue-300 border-blue-500/40',
    desc: 'Compose and save personal drafts, add sources and research notes, submit manuscripts for peer review, and manage personal author bio.'
  },
  reviewer: {
    title: 'Peer Reviewer',
    badge: 'PEER REVIEWER',
    color: 'bg-amber-950/40 text-amber-300 border-amber-500/40',
    desc: 'Inspect assigned manuscripts, leave marginalia comments, suggest edits, and submit formal peer review reports and recommendations.'
  },
  guest_reviewer: {
    title: 'Guest Reviewer (Token Access)',
    badge: 'GUEST REVIEWER',
    color: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
    desc: 'Time-limited, single-manuscript evaluation link with no administrative dashboard access.'
  }
};

/**
 * Baseline Permission Matrix matching system specification
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<EditorialRole, Record<Permission, boolean>> = {
  owner: {
    'article:create': true,
    'article:read_all': true,
    'article:read_own': true,
    'article:read_assigned': true,
    'article:edit_all': true,
    'article:edit_own_draft': true,
    'article:edit_assigned': true,
    'article:suggest_edits': true,
    'article:submit_for_review': true,
    'article:review': true,
    'article:leave_comments': true,
    'article:request_revisions': true,
    'article:approve': true,
    'article:publish': true,
    'article:schedule': true,
    'article:delete': true,
    'featured:manage': true,
    'author:manage_all': true,
    'author:manage_own': true,
    'analytics:view': true,
    'analytics:view_own': true,
    'user:invite': true,
    'user:manage': true,
    'role:assign': true,
    'settings:manage': true,
    'deployment:view': true,
    'security:manage': true,
  },
  admin: { // Managing Editor
    'article:create': true,
    'article:read_all': true,
    'article:read_own': true,
    'article:read_assigned': true,
    'article:edit_all': true,
    'article:edit_own_draft': true,
    'article:edit_assigned': true,
    'article:suggest_edits': true,
    'article:submit_for_review': true,
    'article:review': true,
    'article:leave_comments': true,
    'article:request_revisions': true,
    'article:approve': true,
    'article:publish': true,
    'article:schedule': true,
    'article:delete': true,
    'featured:manage': true,
    'author:manage_all': true,
    'author:manage_own': true,
    'analytics:view': true,
    'analytics:view_own': true,
    'user:invite': false, // Restricted exclusively to Owner
    'user:manage': false, // Restricted exclusively to Owner
    'role:assign': false, // Restricted exclusively to Owner
    'settings:manage': false, // Restricted exclusively to Owner
    'deployment:view': false, // Restricted exclusively to Owner
    'security:manage': false, // Restricted exclusively to Owner
  },
  author: { // Author / Contributor
    'article:create': true,
    'article:read_all': false,
    'article:read_own': true,
    'article:read_assigned': false,
    'article:edit_all': false,
    'article:edit_own_draft': true,
    'article:edit_assigned': false,
    'article:suggest_edits': false,
    'article:submit_for_review': true,
    'article:review': false,
    'article:leave_comments': false,
    'article:request_revisions': false,
    'article:approve': false,
    'article:publish': true, // Authors can publish their own articles directly
    'article:schedule': false,
    'article:delete': false, // Cannot delete published articles; only own unpublished drafts
    'featured:manage': false,
    'author:manage_all': false,
    'author:manage_own': true, // Can update own public scholar profile
    'analytics:view': false,
    'analytics:view_own': true, // Can view stats for own published papers
    'user:invite': false,
    'user:manage': false,
    'role:assign': false,
    'settings:manage': false,
    'deployment:view': false,
    'security:manage': false,
  },
  reviewer: { // Peer Reviewer
    'article:create': false,
    'article:read_all': false,
    'article:read_own': false,
    'article:read_assigned': true,
    'article:edit_all': false,
    'article:edit_own_draft': false,
    'article:edit_assigned': false, // Cannot directly mutate the original manuscript text
    'article:suggest_edits': true, // Suggest edits via marginalia
    'article:submit_for_review': false,
    'article:review': true,
    'article:leave_comments': true, // Leave review notes
    'article:request_revisions': true, // Recommend revisions
    'article:approve': true, // Recommend approval
    'article:publish': false, // Cannot publish
    'article:schedule': false,
    'article:delete': false,
    'featured:manage': false,
    'author:manage_all': false,
    'author:manage_own': false,
    'analytics:view': false,
    'analytics:view_own': false,
    'user:invite': false,
    'user:manage': false,
    'role:assign': false,
    'settings:manage': false,
    'deployment:view': false,
    'security:manage': false,
  },
  guest_reviewer: { // Guest Reviewer (Single Token)
    'article:create': false,
    'article:read_all': false,
    'article:read_own': false,
    'article:read_assigned': true,
    'article:edit_all': false,
    'article:edit_own_draft': false,
    'article:edit_assigned': false,
    'article:suggest_edits': true,
    'article:submit_for_review': false,
    'article:review': true,
    'article:leave_comments': true,
    'article:request_revisions': true,
    'article:approve': true,
    'article:publish': false,
    'article:schedule': false,
    'article:delete': false,
    'featured:manage': false,
    'author:manage_all': false,
    'author:manage_own': false,
    'analytics:view': false,
    'analytics:view_own': false,
    'user:invite': false,
    'user:manage': false,
    'role:assign': false,
    'settings:manage': false,
    'deployment:view': false,
    'security:manage': false,
  }
};

/**
 * Check if the user is the immutable Root Owner
 */
export function isOwner(user?: EditorialUser | null): boolean {
  if (user) {
    const emailMatch = user.email && user.email.trim().toLowerCase() === DESIGNATED_OWNER_EMAIL.toLowerCase();
    if (emailMatch || user.role === 'owner') return true;
  }
  const firebaseEmail = auth.currentUser?.email;
  if (firebaseEmail && firebaseEmail.trim().toLowerCase() === DESIGNATED_OWNER_EMAIL.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Check if a user has a specific permission, respecting:
 * 1. Owner root authority
 * 2. Account active status (suspended/revoked users denied all)
 * 3. Individual permission overrides
 * 4. Role default permissions
 */
export function hasPermission(user: EditorialUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;

  // Suspended or revoked users are immediately denied
  if (user.status === 'suspended' || user.status === 'revoked') {
    return false;
  }

  // Designated Owner is granted all permissions
  if (isOwner(user)) {
    return true;
  }

  // Check individual permission override set by Owner
  if (user.permissionOverrides && typeof user.permissionOverrides[permission] === 'boolean') {
    return Boolean(user.permissionOverrides[permission]);
  }

  // Fallback to role default
  const role = user.role || 'author';
  const roleMap = DEFAULT_ROLE_PERMISSIONS[role];
  return Boolean(roleMap && roleMap[permission]);
}

/**
 * Granular RBAC helper object
 */
export const rbac = {
  hasPermission,
  isOwner,

  canPublish: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'article:publish');
  },

  canFeatureOrPin: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'featured:manage');
  },

  canManageSubscribers: (user: EditorialUser | null | undefined): boolean => {
    return isOwner(user) || (user?.role === 'admin' && hasPermission(user, 'settings:manage'));
  },

  canManageSettings: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'settings:manage');
  },

  canManageUsers: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'user:manage');
  },

  canManageTeam: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'user:manage') || isOwner(user);
  },

  canAccessTips: (user: EditorialUser | null | undefined): boolean => {
    return isOwner(user) || user?.role === 'admin';
  },

  canAccessAnalytics: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'analytics:view');
  },

  canReviewManuscripts: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'article:review') || hasPermission(user, 'article:leave_comments');
  },

  canModerateMarginalia: (user: EditorialUser | null | undefined): boolean => {
    return isOwner(user) || user?.role === 'admin';
  },

  canWriteArticles: (user: EditorialUser | null | undefined): boolean => {
    return hasPermission(user, 'article:create');
  },

  /**
   * Check if user is authorized to read a specific article (including unpublished drafts)
   */
  canUserReadArticle: (article: Article, user: EditorialUser | null | undefined): boolean => {
    if (article.status === 'published') return true;
    if (!user || user.status === 'suspended' || user.status === 'revoked') return false;
    if (isOwner(user) || hasPermission(user, 'article:read_all')) return true;

    // Check if author's own draft
    if (user.role === 'author') {
      const isOwnerByAuthorId = article.authorId && user.authorId && article.authorId === user.authorId;
      const isOwnerByName = article.authorName && user.displayName && 
        article.authorName.trim().toLowerCase() === user.displayName.trim().toLowerCase();
      const isOwnerByUid = article.createdByUid && article.createdByUid === user.uid;
      const isOwnerByEmail = article.createdByEmail && user.email && 
        article.createdByEmail.toLowerCase() === user.email.toLowerCase();
      return Boolean(isOwnerByAuthorId || isOwnerByName || isOwnerByUid || isOwnerByEmail);
    }

    // Check if assigned to peer reviewer
    if (user.role === 'reviewer') {
      const isAssignedUid = article.assignedReviewerUids && article.assignedReviewerUids.includes(user.uid);
      const isAssignedEmail = article.assignedReviewerEmails && user.email && 
        article.assignedReviewerEmails.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
      const isAssignedInUser = user.assignedArticleIds && user.assignedArticleIds.includes(article.id);
      return Boolean(isAssignedUid || isAssignedEmail || isAssignedInUser);
    }

    return false;
  },

  /**
   * Check if user can directly modify an article
   */
  canEditArticle: (article: Article, user: EditorialUser | null | undefined): boolean => {
    if (!user || user.status === 'suspended' || user.status === 'revoked') return false;
    if (isOwner(user) || hasPermission(user, 'article:edit_all')) return true;

    // Reviewers can NOT directly edit the original manuscript (they suggest edits/marginalia)
    if (user.role === 'reviewer') {
      return false;
    }

    // Authors can edit their OWN articles (both drafts and published articles)
    if (user.role === 'author') {
      const isOwnerByAuthorId = article.authorId && user.authorId && article.authorId === user.authorId;
      const isOwnerByName = article.authorName && user.displayName && 
        article.authorName.trim().toLowerCase() === user.displayName.trim().toLowerCase();
      const isOwnerByUid = article.createdByUid && article.createdByUid === user.uid;
      const isOwnerByEmail = article.createdByEmail && user.email && 
        article.createdByEmail.toLowerCase() === user.email.toLowerCase();
      return Boolean(isOwnerByAuthorId || isOwnerByName || isOwnerByUid || isOwnerByEmail);
    }

    return false;
  },

  canDeleteArticle: (article: Article, user: EditorialUser | null | undefined): boolean => {
    if (!user || user.status === 'suspended' || user.status === 'revoked') return false;
    if (isOwner(user) || hasPermission(user, 'article:delete')) return true;

    // Authors can only delete their own unpublished drafts
    if (user.role === 'author' && article.status === 'draft') {
      return rbac.canEditArticle(article, user);
    }
    return false;
  },

  filterVisibleArticles: (articles: Article[], user: EditorialUser | null | undefined): Article[] => {
    if (!user) {
      return articles.filter(a => a.status === 'published');
    }
    if (isOwner(user) || hasPermission(user, 'article:read_all')) {
      return articles;
    }
    if (user.role === 'reviewer') {
      return articles.filter(a => a.status === 'published' || rbac.canUserReadArticle(a, user));
    }
    if (user.role === 'author') {
      return articles.filter(a => a.status === 'published' || rbac.canUserReadArticle(a, user));
    }
    return articles.filter(a => a.status === 'published');
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

    // Merge with root owner seed if not present
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
  
  // 1. Primary Owner check: always resolves to Owner role
  if (email === DESIGNATED_OWNER_EMAIL.toLowerCase()) {
    return {
      uid: uid || 'founder-priyasha',
      email: DESIGNATED_OWNER_EMAIL,
      displayName: authUser.displayName || 'Priyasha Priyal Jena',
      role: 'owner',
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
      const data = teamDoc.data() as EditorialUser;
      return { ...data, uid: teamDoc.id };
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

  // 3. Check local simulated role override (for Owner testing safely)
  const simulatedRole = localStorage.getItem('tol_simulated_role') as EditorialRole | null;
  if (simulatedRole && ['owner', 'admin', 'reviewer', 'author'].includes(simulatedRole)) {
    return {
      uid,
      email: email || 'preview.user@theoligarchy.org',
      displayName: authUser.displayName || email.split('@')[0] || 'Preview User',
      role: simulatedRole,
      authorId: email ? email.split('@')[0] : 'preview-author',
      status: 'active'
    };
  }

  // 4. Default fallback: Scholar Contributor
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
    await setDoc(docRef, sanitizeFirestoreData(member), { merge: true });
    
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

