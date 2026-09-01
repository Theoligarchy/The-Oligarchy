import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { AuthorProfile } from '../types';

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/theoligarchy.in?igsh=bjV4ZGhpdnJxbjV4',
  twitter: 'https://x.com/the_oligarchy',
  linkedinPersonal: 'https://www.linkedin.com/in/priyasha-priyal-jena/',
  linkedinCompany: 'https://www.linkedin.com/company/the-oligarchy-ppj/'
};

// Initial Genuine Profile for Founder
export const INITIAL_CONTRIBUTORS: AuthorProfile[] = [
  {
    id: 'priyasha-priyal-jena',
    name: 'Priyasha Priyal Jena',
    slug: 'priyasha-priyal-jena',
    role: 'Founder & Editor-in-Chief',
    institution: 'The Oligarchy',
    credentials: 'Founder & Editor-in-Chief',
    // orcid is left undefined unless explicitly provided by Priyasha
    bio: 'Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power. Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do. The publication prioritises understanding before judgment and research before outrage.',
    researchAreas: ['Forensic Criminology', 'Behavioral Psyche', 'Power Systems', 'Corporate Fraud'],
    specializations: ['Criminology', 'Behavioral Psyche', 'Corporate Fraud', 'Systems of Power', 'Institutional Behavior'],
    affiliations: ['The Oligarchy'],
    tags: ['Criminology', 'Behavioral Psyche', 'Corporate Fraud', 'Systems of Power', 'Institutional Behavior'],
    socials: {
      instagram: SOCIAL_LINKS.instagram,
      twitter: SOCIAL_LINKS.twitter,
      linkedin: SOCIAL_LINKS.linkedinPersonal,
      email: 'theoligarchy.ppj@gmail.com'
    },
    email: 'theoligarchy.ppj@gmail.com',
    isFounder: true,
    isVisible: true,
    displayOrder: 1,
    joinedDate: '2024',
    createdAt: 1704067200000,
    updatedAt: Date.now()
  }
];

// Helper to scrub undefined fields
function cleanPayload<T>(obj: T): T {
  if (obj === undefined) return undefined as any;
  if (obj === null) return null as any;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanPayload(item)) as any;
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    Object.keys(obj as any).forEach((key) => {
      const val = (obj as any)[key];
      if (val !== undefined) {
        clean[key] = cleanPayload(val);
      }
    });
    return clean;
  }
  return obj;
}

/**
 * Fetch all authors/contributors from Firestore.
 * Automatically seeds the collection with INITIAL_CONTRIBUTORS if empty.
 */
export async function fetchContributors(): Promise<AuthorProfile[]> {
  try {
    const colRef = collection(db, 'contributors');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      // Seed Firestore with initial contributors
      for (const item of INITIAL_CONTRIBUTORS) {
        await setDoc(doc(db, 'contributors', item.id), cleanPayload(item));
      }
      return INITIAL_CONTRIBUTORS;
    }

    // Known fake/demo profiles to automatically scrub
    const FAKE_PROFILE_IDS = new Set([
      'dr-arvind-somasekharan',
      'adv-meera-nair',
      'vikramaditya-sen',
      'dr-alistair-vance',
      'marcus-thorne'
    ]);

    const contributors: AuthorProfile[] = [];

    for (const d of snap.docs) {
      if (FAKE_PROFILE_IDS.has(d.id)) {
        // Asynchronously scrub from database
        deleteDoc(doc(db, 'contributors', d.id)).catch(() => {});
        continue;
      }

      const data = d.data() as any;
      const id = d.id;
      const isFounder = Boolean(data.isFounder || id === 'priyasha-priyal-jena');

      contributors.push({
        id,
        name: data.name || (isFounder ? 'Priyasha Priyal Jena' : 'Author'),
        slug: data.slug || id,
        role: data.role || (isFounder ? 'Founder & Editor-in-Chief' : 'Contributor'),
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || data.profileImage || undefined,
        profileImage: data.profileImage || data.avatarUrl || undefined,
        institution: data.institution || undefined,
        credentials: data.credentials || (isFounder ? 'Founder & Editor-in-Chief' : undefined),
        orcid: data.orcid || undefined,
        researchAreas: Array.isArray(data.researchAreas) ? data.researchAreas : (Array.isArray(data.specializations) ? data.specializations : []),
        specializations: Array.isArray(data.specializations) ? data.specializations : (Array.isArray(data.researchAreas) ? data.researchAreas : []),
        affiliations: Array.isArray(data.affiliations) ? data.affiliations : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        email: data.email || undefined,
        socials: data.socials || {},
        isVisible: data.isVisible !== false, // default true
        displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : (isFounder ? 1 : 99),
        isFounder,
        joinedDate: data.joinedDate || undefined,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        featuredArticleIds: Array.isArray(data.featuredArticleIds) ? data.featuredArticleIds : []
      });
    }

    // If founder is not present in collection, add founder
    if (!contributors.some(c => c.isFounder || c.id === 'priyasha-priyal-jena')) {
      contributors.unshift(INITIAL_CONTRIBUTORS[0]);
    }

    // Sort: Founder first, then displayOrder ascending, then name
    contributors.sort((a, b) => {
      if (a.isFounder && !b.isFounder) return -1;
      if (!a.isFounder && b.isFounder) return 1;
      const orderA = a.displayOrder ?? 99;
      const orderB = b.displayOrder ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return contributors;
  } catch (error) {
    console.warn("Failed to fetch contributors from Firestore, using initial fallback:", error);
    return INITIAL_CONTRIBUTORS;
  }
}

/**
 * Save (create or update) an author profile in Firestore
 */
export async function saveContributor(contributor: AuthorProfile): Promise<void> {
  const finalId = contributor.id.trim() || `author-${Date.now().toString(36)}`;
  const slug = contributor.slug?.trim() || finalId;
  
  const payload: AuthorProfile = {
    ...contributor,
    id: finalId,
    slug,
    name: contributor.name.trim(),
    role: contributor.role.trim(),
    bio: contributor.bio.trim(),
    avatarUrl: contributor.avatarUrl?.trim() || contributor.profileImage?.trim() || undefined,
    profileImage: contributor.profileImage?.trim() || contributor.avatarUrl?.trim() || undefined,
    institution: contributor.institution?.trim() || undefined,
    credentials: contributor.credentials?.trim() || undefined,
    orcid: contributor.orcid?.trim() || undefined,
    email: contributor.email?.trim() || undefined,
    researchAreas: contributor.researchAreas || contributor.specializations || [],
    specializations: contributor.specializations || contributor.researchAreas || [],
    affiliations: contributor.affiliations || [],
    tags: contributor.tags || contributor.researchAreas || [],
    socials: contributor.socials || {},
    isVisible: contributor.isVisible !== false,
    displayOrder: typeof contributor.displayOrder === 'number' ? contributor.displayOrder : 99,
    isFounder: Boolean(contributor.isFounder),
    joinedDate: contributor.joinedDate || new Date().getFullYear().toString(),
    createdAt: contributor.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  const docRef = doc(db, 'contributors', finalId);
  await setDoc(docRef, cleanPayload(payload));
}

/**
 * Delete an author profile from Firestore
 */
export async function deleteContributor(id: string): Promise<void> {
  const docRef = doc(db, 'contributors', id);
  await deleteDoc(docRef);
}

/**
 * Toggle author public visibility
 */
export async function toggleContributorVisibility(id: string, isVisible: boolean): Promise<void> {
  const docRef = doc(db, 'contributors', id);
  await updateDoc(docRef, {
    isVisible,
    updatedAt: Date.now()
  });
}

/**
 * Clean & Format Social Links
 */
export function resolveSocialUrl(platform: string, handleOrUrl: string): string {
  if (!handleOrUrl || !handleOrUrl.trim()) return '';
  const trimmed = handleOrUrl.trim();

  if (platform === 'email') {
    return trimmed.startsWith('mailto:') ? trimmed : `mailto:${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (platform === 'twitter') {
    const handle = trimmed.replace(/^@/, '').replace(/^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\//i, '');
    return `https://x.com/${handle}`;
  }

  if (platform === 'linkedin') {
    const clean = trimmed.replace(/^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in\/)?/i, '').replace(/^in\//i, '');
    if (clean.includes('/')) return `https://www.linkedin.com/${clean}`;
    return `https://www.linkedin.com/in/${clean}`;
  }

  if (platform === 'instagram') {
    const handle = trimmed.replace(/^@/, '').replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '');
    return `https://instagram.com/${handle}`;
  }

  if (['website', 'googleScholar', 'researchGate', 'ssrn'].includes(platform)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}
