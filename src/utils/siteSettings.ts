import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SiteSettings } from '../types';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'The Oligarchy',
  tagline: 'Journal of Critical Inquiry & Power Systems',
  subheading: 'Criminology, Psyche & Politics',
  missionStatement: 'An independent investigative research publication exploring crime, psychopathology, politics, and systems of institutional control. We prioritize understanding before judgment and empirical research before outrage.',
  foundingYear: '2024',
  issnNumber: 'ISSN 2984-1029',
  
  announcementActive: false,
  announcementText: 'New Investigative Dossier: The Psychological Architecture of Corporate Control — Read Now',
  announcementLink: '',

  heroFeaturedArticleId: '',
  heroSubtitleOverride: '',
  heroExcerptOverride: '',

  criminologyHeading: 'Criminological Inquiries & Case Dossiers',
  criminologyDescription: 'Empirical investigations into serial offender typologies, forensic profiling, behavioral crime analysis, and the systemic failures of policing structures.',
  psycheHeading: 'Pathology, Psyche & Behavioral Control',
  psycheDescription: 'Psychological investigations into narcissism, dark triad psychopathology, manipulation architectures, and the cognitive mechanics of human obedience.',
  politicsHeading: 'Power Systems, Hegemony & Institutional Capture',
  politicsDescription: 'Critical examinations of bureaucratic power, oligarchical networks, digital surveillance systems, and corporate-state collusion.',

  aboutTitle: 'About The Oligarchy',
  aboutContent: 'The Oligarchy is an independent research publication exploring crime, psychology, politics, and systems of power. Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do.\n\nThe publication prioritises understanding before judgment and research before outrage. We believe that to confront systemic injustice and criminal behavior, one must first dissect the psychological and structural mechanisms that enable them.',
  editorialPrinciples: '1. Empirical Rigor: All claims must be supported by primary source documentation, court transcripts, or peer-reviewed literature.\n2. Transparent Attribution: Contributorship and data sources are published openly using CRediT taxonomy.\n3. Independent Inquiry: We accept no institutional or corporate funding that compromises editorial autonomy.',
  peerReviewPolicy: 'Every investigative dossier undergoes double-blind editorial review, source cross-verification, and legal fact-checking prior to archival publication.',

  socials: {
    instagram: 'https://instagram.com/the.oligarchy',
    twitter: 'https://x.com/the_oligarchy',
    linkedinPersonal: 'https://www.linkedin.com/in/priyasha-priyal-jena/',
    linkedinCompany: 'https://www.linkedin.com/company/the-oligarchy-ppj/',
    substack: '',
    email: 'theoligarchy.ppj@gmail.com'
  },

  footerDescription: 'An independent scholarly and investigative platform examining the structural consolidation of power across crime, psyche, and institutional politics.',
  copyrightText: 'The Oligarchy · All Rights Reserved.',
  disclaimerText: 'Published for academic, investigative, and educational purposes under critical fair inquiry doctrines.',

  defaultSeoTitle: 'The Oligarchy | Journal of Critical Inquiry & Power Systems',
  defaultSeoDescription: 'Independent research platform exploring crime, psychology, politics, and systems of power.',
  defaultOgImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop'
};

const STORAGE_KEY = 'tol_site_settings_cache';

/**
 * Returns cached site settings synchronously from localStorage if present, or defaults.
 */
export function getCachedSiteSettings(): SiteSettings {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...DEFAULT_SITE_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('LocalStorage read error for site settings:', e);
  }
  return DEFAULT_SITE_SETTINGS;
}

// Helper to scrub undefined fields for Firestore
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
 * Loads site settings with in-memory & localStorage fallback for lightning-fast render
 */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  // 1. Check local cache first
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...DEFAULT_SITE_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('LocalStorage read error for site settings:', e);
  }

  // 2. Fetch from Firestore
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'site_config'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data() as Partial<SiteSettings>;
      const merged: SiteSettings = { 
        ...DEFAULT_SITE_SETTINGS, 
        ...data,
        socials: {
          ...DEFAULT_SITE_SETTINGS.socials,
          ...(data.socials || {})
        }
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (err) {
    console.warn('Firestore site settings fetch failed, using defaults:', err);
  }

  return DEFAULT_SITE_SETTINGS;
}

/**
 * Saves updated site settings to Firestore & localStorage
 */
export async function saveSiteSettings(updated: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await fetchSiteSettings();
  const merged: SiteSettings = {
    ...current,
    ...updated,
    socials: {
      ...current.socials,
      ...(updated.socials || {})
    },
    updatedAt: Date.now()
  };

  const payload = cleanPayload(merged);

  // Update Firestore
  await setDoc(doc(db, 'settings', 'site_config'), payload, { merge: true });

  // Update local cache
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {}

  return merged;
}
