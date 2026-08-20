import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Award, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Mail, 
  Globe,
  ExternalLink, 
  X, 
  ArrowRight, 
  Sparkles, 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ShieldCheck, 
  Eye, 
  Activity, 
  TrendingUp, 
  BarChart2, 
  Compass, 
  Layers,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { Article, AuthorProfile } from '../types';
import { SOCIAL_LINKS } from './Footer';
import { motion, AnimatePresence } from 'motion/react';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { normalizeOrcid, getOrcidUrl } from '../utils/citationEngine';

/**
 * Normalizes author social / academic portfolio URLs to ensure valid external linking
 */
export function normalizeSocialUrl(
  platform: 'linkedin' | 'twitter' | 'instagram' | 'website' | 'email' | 'googleScholar' | 'researchGate' | 'ssrn', 
  value?: string
): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (platform === 'email') {
    return trimmed.startsWith('mailto:') ? trimmed : `mailto:${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Handle bare domain or handle prefixes
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

  if (platform === 'website' || platform === 'googleScholar' || platform === 'researchGate' || platform === 'ssrn') {
    return `https://${trimmed}`;
  }

  return trimmed;
}

// Default Founder Profile (The single real founder profile)
export const DEFAULT_FOUNDER_PROFILE: AuthorProfile = {
  id: 'priyasha-priyal-jena',
  name: 'Priyasha Priyal Jena',
  role: 'Founder & Editor-in-Chief',
  institution: 'The Oligarchy',
  credentials: 'Founder & Editor-in-Chief',
  bio: 'Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power. Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do. The publication prioritises understanding before judgment and research before outrage.',
  researchAreas: ['Forensic Criminology', 'Behavioral Psyche', 'Power Systems', 'Corporate Fraud'],
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
  joinedDate: '2024'
};

// Default Board of Contributors — only real founder profile
export const DEFAULT_BOARD_CONTRIBUTORS: AuthorProfile[] = [
  DEFAULT_FOUNDER_PROFILE
];

export interface ResolvedSocialLinks {
  linkedinUrl: string | null;
  twitterUrl: string | null;
  portfolioUrl: string | null;
  googleScholarUrl: string | null;
  researchGateUrl: string | null;
  ssrnUrl: string | null;
  instagramUrl: string | null;
  emailUrl: string | null;
  orcidUrl: string | null;
  normalizedOrcid: string | null;
  hasAnySocial: boolean;
}

/**
 * Resolves and extracts all social, professional, and academic portfolio links
 * across varied author profile schemas, flat keys, and nested objects.
 */
export function resolveAuthorSocialLinks(profile: Partial<AuthorProfile> & Record<string, any>): ResolvedSocialLinks {
  if (!profile) {
    return {
      linkedinUrl: null,
      twitterUrl: null,
      portfolioUrl: null,
      googleScholarUrl: null,
      researchGateUrl: null,
      ssrnUrl: null,
      instagramUrl: null,
      emailUrl: null,
      orcidUrl: null,
      normalizedOrcid: null,
      hasAnySocial: false
    };
  }

  const socials = profile.socials || {};

  // 1. LinkedIn resolution
  let rawLinkedin = socials.linkedin || profile.linkedin || profile.linkedinUrl;
  
  // 2. Twitter / X resolution
  let rawTwitter = socials.twitter || profile.twitter || profile.twitterUrl || profile.x || profile.xUrl;
  
  // 3. Academic Portfolio / Personal Website resolution
  let rawPortfolio = socials.website || profile.website || profile.portfolio || profile.portfolioUrl || profile.academicPortfolio || profile.profileUrl;
  
  // 4. Google Scholar resolution
  let rawScholar = socials.googleScholar || profile.googleScholar || profile.scholarUrl;
  
  // 5. ResearchGate resolution
  let rawResearchGate = socials.researchGate || profile.researchGate;
  
  // 6. SSRN resolution
  let rawSsrn = socials.ssrn || profile.ssrn;
  
  // 7. Instagram resolution
  let rawInstagram = socials.instagram || profile.instagram || profile.instagramUrl;
  
  // 8. Generic authorSocialUrl parsing (e.g. from manuscript submission or editorial author records)
  const genericSocial = profile.authorSocialUrl || profile.socialUrl;
  if (genericSocial && typeof genericSocial === 'string') {
    const s = genericSocial.trim().toLowerCase();
    if (s.includes('linkedin.com') && !rawLinkedin) {
      rawLinkedin = genericSocial;
    } else if ((s.includes('twitter.com') || s.includes('x.com')) && !rawTwitter) {
      rawTwitter = genericSocial;
    } else if (s.includes('scholar.google') && !rawScholar) {
      rawScholar = genericSocial;
    } else if (s.includes('researchgate.net') && !rawResearchGate) {
      rawResearchGate = genericSocial;
    } else if (s.includes('ssrn.com') && !rawSsrn) {
      rawSsrn = genericSocial;
    } else if (s.includes('instagram.com') && !rawInstagram) {
      rawInstagram = genericSocial;
    } else if (!rawPortfolio && (s.startsWith('http://') || s.startsWith('https://') || s.includes('.'))) {
      rawPortfolio = genericSocial;
    }
  }

  const linkedinUrl = normalizeSocialUrl('linkedin', rawLinkedin);
  const twitterUrl = normalizeSocialUrl('twitter', rawTwitter);
  const portfolioUrl = normalizeSocialUrl('website', rawPortfolio);
  const googleScholarUrl = normalizeSocialUrl('googleScholar', rawScholar);
  const researchGateUrl = normalizeSocialUrl('researchGate', rawResearchGate);
  const ssrnUrl = normalizeSocialUrl('ssrn', rawSsrn);
  const instagramUrl = normalizeSocialUrl('instagram', rawInstagram);
  const emailUrl = normalizeSocialUrl('email', profile.email || (socials as Record<string, any>)?.email);
  const orcid = profile.orcid || profile.authorOrcid;
  const orcidUrl = getOrcidUrl(orcid);
  const normalizedOrcid = normalizeOrcid(orcid);

  const hasAnySocial = Boolean(
    linkedinUrl || twitterUrl || portfolioUrl || googleScholarUrl || 
    researchGateUrl || ssrnUrl || instagramUrl || emailUrl || orcidUrl
  );

  return {
    linkedinUrl,
    twitterUrl,
    portfolioUrl,
    googleScholarUrl,
    researchGateUrl,
    ssrnUrl,
    instagramUrl,
    emailUrl,
    orcidUrl,
    normalizedOrcid,
    hasAnySocial
  };
}

export interface AuthorStats {
  totalArticles: number;
  totalViews: number;
  topDiscipline: string;
  categoryDistribution: { category: string; count: number }[];
  radarData: { subject: string; value: number; fullMark: number }[];
}

export function computeAuthorStats(profile: AuthorProfile, authorArticles: Article[]): AuthorStats {
  const publishedArticles = authorArticles.filter(a => a.status === 'published');
  const totalArticles = publishedArticles.length;
  const totalViews = publishedArticles.reduce((sum, art) => sum + (art.views || 0), 0);

  // Category counts
  const catCount: Record<string, number> = {
    criminology: 0,
    psyche: 0,
    politics: 0
  };

  publishedArticles.forEach(art => {
    const c = (art.category || '').toLowerCase();
    if (catCount[c] !== undefined) {
      catCount[c]++;
    }
  });

  // Calculate top discipline
  let topDiscipline = 'Criminological Inquiries';
  if (catCount.psyche > catCount.criminology && catCount.psyche >= catCount.politics) {
    topDiscipline = 'Behavioral Psyche';
  } else if (catCount.politics > catCount.criminology && catCount.politics > catCount.psyche) {
    topDiscipline = 'Political Systems';
  } else if (catCount.criminology > 0) {
    topDiscipline = 'Criminology & Forensics';
  } else if (profile.tags && profile.tags.length > 0) {
    topDiscipline = profile.tags[0];
  }

  // Calculate Academic Interest Radar (0 to 100)
  const combinedContext = [
    (profile.tags || []).join(' '),
    profile.bio || '',
    profile.role || '',
    publishedArticles.map(a => `${a.title} ${a.subtitle || ''} ${(a.tags || []).join(' ')}`).join(' ')
  ].join(' ').toLowerCase();

  const calculateAxisScore = (keywords: string[], articleCount: number): number => {
    let score = 32 + (articleCount * 20);
    keywords.forEach(kw => {
      if (combinedContext.includes(kw)) {
        score += 15;
      }
    });
    return Math.min(100, Math.max(25, Math.round(score)));
  };

  const radarData = [
    {
      subject: 'Criminology',
      value: calculateAxisScore(['criminology', 'crime', 'justice', 'forensics', 'homicide', 'investigation'], catCount.criminology),
      fullMark: 100
    },
    {
      subject: 'Behavioral Psyche',
      value: calculateAxisScore(['psyche', 'psychology', 'behavior', 'dark triad', 'motives', 'deviance', 'cognition'], catCount.psyche),
      fullMark: 100
    },
    {
      subject: 'Political Systems',
      value: calculateAxisScore(['politics', 'power', 'oligarchy', 'state', 'authoritarian', 'governance', 'corruption'], catCount.politics),
      fullMark: 100
    },
    {
      subject: 'Forensic Analysis',
      value: calculateAxisScore(['forensic', 'evidence', 'ballistics', 'dna', 'digital', 'investigative', 'pathology'], 0),
      fullMark: 100
    },
    {
      subject: 'Corporate Fraud',
      value: calculateAxisScore(['fraud', 'corporate', 'financial', 'embezzlement', 'malfeasance', 'white-collar', 'banking'], 0),
      fullMark: 100
    },
    {
      subject: 'Institutional Theory',
      value: calculateAxisScore(['institution', 'theory', 'sociology', 'systemic', 'bureaucracy', 'structural', 'policy'], 0),
      fullMark: 100
    }
  ];

  return {
    totalArticles,
    totalViews,
    topDiscipline,
    categoryDistribution: Object.entries(catCount).map(([category, count]) => ({ category, count })),
    radarData
  };
}

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-[#0a0a0a] border border-blood/60 p-2.5 rounded-sm shadow-2xl text-xs font-sans">
        <p className="font-bold text-paper text-[11px] mb-1 uppercase tracking-wider">{item.payload.subject}</p>
        <div className="flex items-center gap-2">
          <span className="text-blood font-mono font-bold text-sm">{item.value}%</span>
          <span className="text-paper/50 text-[10px]">Academic Index</span>
        </div>
      </div>
    );
  }
  return null;
};

function AuthorAcademicRadar({ data, authorName }: { data: { subject: string; value: number; fullMark: number }[]; authorName: string }) {
  return (
    <div className="w-full bg-[#050505] border border-paper/10 rounded-sm p-4 sm:p-5 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="font-sans text-[10px] font-bold tracking-[0.25em] uppercase text-blood flex items-center gap-1.5">
          <Activity size={13} />
          Academic Interest Radar
        </span>
        <span className="font-mono text-[9px] text-paper/40 uppercase tracking-widest bg-paper/5 px-2 py-0.5 rounded-xs">
          Thematic Index
        </span>
      </div>
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
            <PolarGrid stroke="#e0e0e0" strokeOpacity={0.12} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#e0e0e0', opacity: 0.75, fontSize: 10, fontFamily: 'serif' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#e0e0e0', opacity: 0.25, fontSize: 8 }} 
              stroke="#e0e0e0"
              strokeOpacity={0.1}
            />
            <Radar
              name={authorName}
              dataKey="value"
              stroke="#8b0000"
              strokeWidth={2}
              fill="#8b0000"
              fillOpacity={0.35}
            />
            <RechartsTooltip content={<CustomRadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-paper/10 text-center">
        {data.slice(0, 3).map((d) => (
          <div key={d.subject} className="bg-paper/5 px-2 py-1 rounded-xs">
            <div className="font-mono text-[10px] font-bold text-blood">{d.value}%</div>
            <div className="font-sans text-[8px] text-paper/40 truncate">{d.subject}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Clickable social & academic portfolio icon strip for contributor card
 */
function ContributorCardSocialIcons({ 
  profile,
  socials, 
  email,
  authorName,
  orcid
}: { 
  profile?: Partial<AuthorProfile> & Record<string, any>;
  socials?: AuthorProfile['socials']; 
  email?: string;
  authorName?: string;
  orcid?: string;
}) {
  const mergedProfile = profile || { socials, email, name: authorName, orcid };
  const name = profile?.name || authorName || 'Contributor';
  const resolved = resolveAuthorSocialLinks(mergedProfile);

  if (!resolved.hasAnySocial) {
    return (
      <span className="font-sans text-[9px] text-paper/30 italic">
        Public channels available on request
      </span>
    );
  }

  return (
    <div 
      className="flex flex-wrap items-center gap-1.5" 
      onClick={(e) => e.stopPropagation()}
      aria-label={`Social & Academic profiles for ${name}`}
    >
      {/* 1. LinkedIn */}
      {resolved.linkedinUrl && (
        <a
          href={resolved.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-white hover:bg-[#0a66c2] hover:border-[#0a66c2] transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-[#0a66c2]"
          title={`${name}'s LinkedIn Profile`}
          aria-label={`${name}'s LinkedIn Profile`}
        >
          <Linkedin size={13} className="group-hover:text-white transition-colors" />
        </a>
      )}

      {/* 2. Twitter / X */}
      {resolved.twitterUrl && (
        <a
          href={resolved.twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-white hover:bg-black hover:border-paper/50 transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-paper"
          title={`${name}'s Twitter / X Profile`}
          aria-label={`${name}'s Twitter / X Profile`}
        >
          {/* Custom X / Twitter logo */}
          <svg className="w-3 h-3 fill-current group-hover:text-white transition-colors" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      )}

      {/* 3. Academic Portfolio / Personal Website */}
      {resolved.portfolioUrl && (
        <a
          href={resolved.portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-white hover:bg-blood hover:border-blood transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-blood"
          title={`${name}'s Academic Portfolio & Institutional Website`}
          aria-label={`${name}'s Academic Portfolio & Institutional Website`}
        >
          <Globe size={13} className="group-hover:text-white transition-colors" />
        </a>
      )}

      {/* 4. Google Scholar Citations */}
      {resolved.googleScholarUrl && (
        <a
          href={resolved.googleScholarUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-amber-200 hover:bg-amber-600/30 hover:border-amber-400/60 transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-amber-400"
          title={`${name}'s Google Scholar Citations`}
          aria-label={`${name}'s Google Scholar Citations`}
        >
          <GraduationCap size={13} className="group-hover:text-amber-300 transition-colors" />
        </a>
      )}

      {/* 5. ResearchGate Profile */}
      {resolved.researchGateUrl && (
        <a
          href={resolved.researchGateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-white hover:bg-[#00ccbb]/40 hover:border-[#00ccbb] transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-[#00ccbb]"
          title={`${name}'s ResearchGate Profile`}
          aria-label={`${name}'s ResearchGate Profile`}
        >
          <BookOpen size={13} className="group-hover:text-[#00ccbb] transition-colors" />
        </a>
      )}

      {/* 6. SSRN Research Library */}
      {resolved.ssrnUrl && (
        <a
          href={resolved.ssrnUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-white hover:bg-blood/40 hover:border-blood transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-blood"
          title={`${name}'s SSRN Library`}
          aria-label={`${name}'s SSRN Library`}
        >
          <FileText size={13} className="group-hover:text-blood-light transition-colors" />
        </a>
      )}

      {/* 7. Verified ORCID Badge */}
      {resolved.orcidUrl && (
        <a
          href={resolved.orcidUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="h-7 px-2 flex items-center gap-1 rounded-sm bg-[#a6ce39]/10 border border-[#a6ce39]/30 text-[#a6ce39] hover:bg-[#a6ce39]/25 hover:text-[#c4ea4f] hover:border-[#a6ce39]/60 transition-all duration-200 shadow-xs font-mono text-[9px] font-bold focus:outline-hidden focus:ring-1 focus:ring-[#a6ce39]"
          title={`Verified ORCID iD: ${resolved.normalizedOrcid}`}
          aria-label={`${name}'s Verified ORCID Profile`}
        >
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 256 256" fill="currentColor">
            <path d="M128,0A128,128,0,1,0,256,128,128,128,0,0,0,128,0ZM86.37,186.25H60.08V73.49h26.29Zm-13.14-126a15.35,15.35,0,1,1,15.35-15.35A15.35,15.35,0,0,1,73.23,60.25Zm122.9,91.8c0,22.25-17.75,34.2-46.7,34.2H109.84V73.49h40.35c27.1,0,45.94,14.65,45.94,37.35,0,13.79-8.4,26.47-21.75,32.32C188.08,128.51,196.13,140.48,196.13,152.05Zm-26.65,0c0-12.87-9.5-20.7-25.55-20.7H133.72v41.4h10.21C159.98,172.75,169.48,164.92,169.48,152.05Zm-4.9-46.35c0-11.45-8.5-18.4-22.75-18.4H133.72v36.8h8.11C156.08,124.1,164.58,117.15,164.58,105.7Z"/>
          </svg>
          <span className="font-mono">ORCID</span>
        </a>
      )}

      {/* 8. Instagram */}
      {resolved.instagramUrl && (
        <a
          href={resolved.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-white hover:bg-[#e1306c]/40 hover:border-[#e1306c] transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-[#e1306c]"
          title={`${name}'s Instagram Profile`}
          aria-label={`${name}'s Instagram Profile`}
        >
          <Instagram size={13} className="group-hover:text-[#e1306c] transition-colors" />
        </a>
      )}

      {/* 9. Institutional Email */}
      {resolved.emailUrl && (
        <a
          href={resolved.emailUrl}
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 flex items-center justify-center rounded-sm bg-black/40 border border-paper/15 text-paper/60 hover:text-amber-200 hover:bg-amber-500/20 hover:border-amber-400/50 transition-all duration-200 shadow-xs group focus:outline-hidden focus:ring-1 focus:ring-amber-400"
          title={`Institutional Contact: ${name}`}
          aria-label={`Institutional Contact: ${name}`}
        >
          <Mail size={13} className="group-hover:text-amber-300 transition-colors" />
        </a>
      )}
    </div>
  );
}

/**
 * Clickable badges with full labels for contributor profile modal
 */
function ContributorModalSocialBadges({ 
  profile,
  socials, 
  email,
  authorName,
  orcid
}: { 
  profile?: Partial<AuthorProfile> & Record<string, any>;
  socials?: AuthorProfile['socials']; 
  email?: string;
  authorName?: string;
  orcid?: string;
}) {
  const mergedProfile = profile || { socials, email, name: authorName, orcid };
  const resolved = resolveAuthorSocialLinks(mergedProfile);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {resolved.orcidUrl && (
        <a 
          href={resolved.orcidUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-mono text-[10px] font-bold text-[#a6ce39] hover:text-[#b8e046] bg-[#a6ce39]/10 hover:bg-[#a6ce39]/20 border border-[#a6ce39]/40 px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
          title={`Verified ORCID Profile: ${resolved.normalizedOrcid}`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 256 256" fill="currentColor">
            <path d="M128,0A128,128,0,1,0,256,128,128,128,0,0,0,128,0ZM86.37,186.25H60.08V73.49h26.29Zm-13.14-126a15.35,15.35,0,1,1,15.35-15.35A15.35,15.35,0,0,1,73.23,60.25Zm122.9,91.8c0,22.25-17.75,34.2-46.7,34.2H109.84V73.49h40.35c27.1,0,45.94,14.65,45.94,37.35,0,13.79-8.4,26.47-21.75,32.32C188.08,128.51,196.13,140.48,196.13,152.05Zm-26.65,0c0-12.87-9.5-20.7-25.55-20.7H133.72v41.4h10.21C159.98,172.75,169.48,164.92,169.48,152.05Zm-4.9-46.35c0-11.45-8.5-18.4-22.75-18.4H133.72v36.8h8.11C156.08,124.1,164.58,117.15,164.58,105.7Z"/>
          </svg>
          <span>ORCID: {resolved.normalizedOrcid}</span>
          <ExternalLink size={10} className="text-[#a6ce39]/60 group-hover:text-[#b8e046] transition-colors" />
        </a>
      )}

      {resolved.googleScholarUrl && (
        <a 
          href={resolved.googleScholarUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-amber-500/20 border border-amber-400/30 hover:border-amber-400 px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <GraduationCap size={12} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
          <span>Google Scholar</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.researchGateUrl && (
        <a 
          href={resolved.researchGateUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-[#00ccbb]/20 border border-[#00ccbb]/30 hover:border-[#00ccbb] px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <BookOpen size={12} className="text-[#00ccbb] group-hover:text-paper transition-colors" />
          <span>ResearchGate</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.ssrnUrl && (
        <a 
          href={resolved.ssrnUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-blood/20 border border-paper/15 hover:border-blood px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <FileText size={12} className="text-blood-light group-hover:text-paper transition-colors" />
          <span>SSRN Library</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.linkedinUrl && (
        <a 
          href={resolved.linkedinUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-[#0a66c2]/20 border border-[#0a66c2]/30 hover:border-[#0a66c2] px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <Linkedin size={12} className="text-[#0a66c2] group-hover:text-paper transition-colors" />
          <span>LinkedIn</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.twitterUrl && (
        <a 
          href={resolved.twitterUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-white/10 border border-paper/20 hover:border-paper px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <svg className="w-3 h-3 fill-current text-[#1da1f2] group-hover:text-white transition-colors" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Twitter / X</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.portfolioUrl && (
        <a 
          href={resolved.portfolioUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-blood/20 border border-blood/30 hover:border-blood px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <Globe size={12} className="text-blood-light group-hover:text-paper transition-colors" />
          <span>Academic Portfolio</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.instagramUrl && (
        <a 
          href={resolved.instagramUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-[#e1306c]/20 border border-[#e1306c]/30 hover:border-[#e1306c] px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <Instagram size={12} className="text-[#e1306c] group-hover:text-paper transition-colors" />
          <span>Instagram</span>
          <ExternalLink size={10} className="text-paper/40 group-hover:text-paper transition-colors" />
        </a>
      )}

      {resolved.emailUrl && (
        <a 
          href={resolved.emailUrl} 
          className="font-sans text-[10px] font-semibold text-paper/85 hover:text-paper bg-navy hover:bg-amber-500/20 border border-amber-400/30 hover:border-amber-400 px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition-all shadow-sm group"
        >
          <Mail size={12} className="text-amber-400 group-hover:text-paper transition-colors" />
          <span>Institutional Contact</span>
        </a>
      )}
    </div>
  );
}

interface ContributorsSectionProps {
  articles: Article[];
  contributors?: AuthorProfile[];
  onSelectArticle: (article: Article) => void;
  onOpenContact: () => void;
  onOpenSubmitInvestigation?: () => void;
  onOpenContributorDashboard?: (contributorId: string) => void;
  selectedContributorId?: string | null;
  onCloseContributorModal?: () => void;
}

export default function ContributorsSection({
  articles,
  contributors = [],
  onSelectArticle,
  onOpenContact,
  onOpenSubmitInvestigation,
  onOpenContributorDashboard,
  selectedContributorId,
  onCloseContributorModal
}: ContributorsSectionProps) {
  const [allContributors, setAllContributors] = useState<AuthorProfile[]>(DEFAULT_BOARD_CONTRIBUTORS);
  const [activeContributor, setActiveContributor] = useState<AuthorProfile | null>(null);

  useEffect(() => {
    // Merge provided contributors with default board contributors, ensuring no duplicate IDs
    const list = [...DEFAULT_BOARD_CONTRIBUTORS];
    contributors.forEach(c => {
      const existingIdx = list.findIndex(
        item => item.id === c.id || item.name.toLowerCase() === c.name.toLowerCase()
      );
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...c };
      } else {
        list.push(c);
      }
    });
    // Filter only visible contributors for public presentation (defaults to true)
    const visibleList = list.filter(c => c.isVisible !== false);
    setAllContributors(visibleList);
  }, [contributors]);

  // Handle external modal trigger by selectedContributorId
  useEffect(() => {
    if (selectedContributorId) {
      const match = allContributors.find(
        c => c.id === selectedContributorId || c.name.toLowerCase() === selectedContributorId.toLowerCase()
      );
      if (match) {
        setActiveContributor(match);
      } else {
        // Fallback search or create temporary view profile
        const matchedArticles = articles.filter(
          a => a.authorId === selectedContributorId || a.authorName.toLowerCase() === selectedContributorId.toLowerCase()
        );
        if (matchedArticles.length > 0) {
          const authorName = matchedArticles[0].authorName || selectedContributorId;
          setActiveContributor({
            id: selectedContributorId,
            name: authorName,
            role: 'Research Contributor',
            bio: `Research contributor and co-author at The Oligarchy publication.`,
            tags: ['Research', 'Scholarly Writing'],
            socials: {}
          });
        } else {
          setActiveContributor(DEFAULT_FOUNDER_PROFILE);
        }
      }
    }
  }, [selectedContributorId, allContributors, articles]);

  const handleCloseModal = () => {
    setActiveContributor(null);
    if (onCloseContributorModal) {
      onCloseContributorModal();
    }
  };

  // Helper to filter published articles by a contributor (primary author or co-author)
  const getContributorArticles = (profile: AuthorProfile) => {
    return articles.filter(a => {
      if (a.status !== 'published') return false;
      const matchId = a.authorId && a.authorId.toLowerCase() === profile.id.toLowerCase();
      const matchName = a.authorName && a.authorName.toLowerCase() === profile.name.toLowerCase();
      
      // Also match if listed as a co-author
      const matchCoAuthor = Array.isArray(a.coAuthors) && a.coAuthors.some(
        ca => ca.name && ca.name.toLowerCase() === profile.name.toLowerCase()
      );

      // If founder, also match articles authored by default
      if (profile.isFounder && (!a.authorName || a.authorName.toLowerCase().includes('priyasha'))) {
        return true;
      }
      return matchId || matchName || matchCoAuthor;
    });
  };

  // Overall Board Aggregate Statistics
  const aggregateStats = useMemo(() => {
    const published = articles.filter(a => a.status === 'published');
    const totalViews = published.reduce((acc, art) => acc + (art.views || 0), 0);
    return {
      totalScholars: allContributors.length,
      totalTreatises: published.length,
      totalViews: totalViews
    };
  }, [articles, allContributors]);

  return (
    <section className="bg-midnight py-12 md:py-16 px-4 sm:px-6 md:px-12 max-w-6xl mx-auto fade-in">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="font-sans text-[10px] font-bold tracking-[0.35em] uppercase text-blood mb-3 flex items-center justify-center gap-3">
          <span className="w-8 h-px bg-blood" />
          EDITORIAL BOARD &amp; SCHOLARS
          <span className="w-8 h-px bg-blood" />
        </div>
        
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-paper tracking-tight leading-tight">
          Research Contributors
        </h1>
        
        <p className="font-serif text-sm sm:text-base text-paper/60 italic mt-4 leading-relaxed">
          The Oligarchy brings together independent scholars, student researchers, and analytical writers investigating criminology, human psyche, and systems of power.
        </p>

        {/* Aggregate Scholarly Footprint Summary */}
        <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl mx-auto bg-navy/60 border border-paper/10 p-3 rounded-sm">
          <div className="flex flex-col items-center">
            <span className="font-mono text-base sm:text-lg font-bold text-paper">{aggregateStats.totalScholars}</span>
            <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40">Active Scholars</span>
          </div>
          <div className="flex flex-col items-center border-x border-paper/10">
            <span className="font-mono text-base sm:text-lg font-bold text-blood">{aggregateStats.totalTreatises}</span>
            <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40">Published Treatises</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono text-base sm:text-lg font-bold text-paper">{aggregateStats.totalViews.toLocaleString()}</span>
            <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40">Total Readership</span>
          </div>
        </div>
      </div>

      {/* Contributors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {allContributors.map((profile) => {
          const authorArticles = getContributorArticles(profile);
          const stats = computeAuthorStats(profile, authorArticles);
          const initials = profile.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          return (
            <div 
              key={profile.id}
              className="bg-navy/80 border border-paper/10 hover:border-blood/50 rounded-sm p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl relative group"
            >
              <div>
                {/* Top Header Card Info */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    {profile.avatarUrl ? (
                      <img 
                        src={getOptimizedImageUrl(profile.avatarUrl, 'avatar')} 
                        alt={profile.name} 
                        className="w-14 h-14 rounded-full object-cover border border-paper/20 shadow-md shrink-0" 
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-blood text-paper flex items-center justify-center font-display text-xl font-bold rounded-full border border-paper/20 shadow-md shrink-0">
                        {initials}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display text-xl font-bold text-paper/90 group-hover:text-paper transition-colors">
                          {profile.name}
                        </h2>
                        {profile.isFounder && (
                          <span className="font-sans text-[8px] font-bold tracking-widest uppercase bg-blood/20 text-blood-light border border-blood/30 px-2 py-0.5 rounded-xs">
                            Founder
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-[10px] font-bold tracking-wider uppercase text-blood mt-0.5">
                        {profile.role}
                      </p>
                      {profile.credentials && (
                        <span className="font-mono text-[9px] text-amber-300/90 font-medium bg-amber-500/10 border border-amber-400/20 px-1.5 py-0.2 rounded-xs inline-block mt-0.5">
                          {profile.credentials}
                        </span>
                      )}
                      {profile.institution && (
                        <p className="font-serif text-xs text-paper/40 italic mt-0.5">
                          {profile.institution}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="font-sans text-[10px] font-semibold text-paper/50 bg-paper/5 border border-paper/10 px-2.5 py-1 rounded-sm shrink-0 flex items-center gap-1">
                    <BookOpen size={11} className="text-blood-light" />
                    {stats.totalArticles} {stats.totalArticles === 1 ? 'Paper' : 'Papers'}
                  </span>
                </div>

                {/* Key Author Statistics Metric Pill Bar */}
                <div className="grid grid-cols-3 gap-2 bg-black/40 border border-paper/10 p-2.5 rounded-sm mb-5">
                  <div className="flex flex-col">
                    <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
                      <FileText size={9} className="text-blood" />
                      Treatises
                    </span>
                    <span className="font-mono text-xs font-bold text-paper">
                      {stats.totalArticles}
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-paper/10 px-2">
                    <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
                      <Eye size={9} className="text-amber-400/80" />
                      Engagement
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-300/90">
                      {stats.totalViews.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
                      <Compass size={9} className="text-blood-light" />
                      Focus
                    </span>
                    <span className="font-sans text-[10px] font-bold text-paper/80 truncate" title={stats.topDiscipline}>
                      {stats.topDiscipline}
                    </span>
                  </div>
                </div>

                {/* Short Bio */}
                <p className="font-serif text-sm text-paper/70 leading-relaxed line-clamp-3 mb-5">
                  {profile.bio}
                </p>

                {/* Research Focus & Areas Tags */}
                {((profile.researchAreas && profile.researchAreas.length > 0) || (profile.tags && profile.tags.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {(profile.researchAreas || profile.tags || []).slice(0, 5).map(tag => (
                      <span 
                        key={tag}
                        className="font-sans text-[8px] font-semibold tracking-wider uppercase bg-paper/5 border border-paper/10 text-paper/50 px-2.5 py-1 rounded-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Action */}
              <div className="pt-4 border-t border-paper/10 flex items-center justify-between gap-4">
                <ContributorCardSocialIcons 
                  profile={profile}
                  socials={profile.socials} 
                  email={profile.email} 
                  authorName={profile.name} 
                  orcid={profile.orcid}
                />

                <button
                  onClick={() => setActiveContributor(profile)}
                  className="font-sans text-[10px] font-bold tracking-widest uppercase bg-blood/10 hover:bg-blood border border-blood/30 hover:border-blood text-paper/90 hover:text-paper py-2 px-4 rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Activity size={12} className="text-blood-light" />
                  Stats &amp; Papers
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Join as Student Contributor Callout */}
      <div className="bg-gradient-to-r from-navy via-ink to-navy border border-paper/15 rounded-sm p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-blood">
          <GraduationCap size={160} />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-blood mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            STUDENT RESEARCH FELLOWSHIP &amp; PEER SUBMISSIONS
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-paper tracking-tight mb-4">
            Contribute to The Oligarchy
          </h2>

          <p className="font-serif text-sm sm:text-base text-paper/70 leading-relaxed mb-6">
            Are you an undergraduate or postgraduate student, criminologist, or independent scholar working on criminological theory, behavioral psychology, corporate fraud, or political systems? We welcome peer-reviewed research papers and investigative proposals.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-paper/5 border border-paper/10 p-4 rounded-sm">
              <div className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood-light mb-1">
                ✦ Scholar Credit
              </div>
              <p className="font-serif text-xs text-paper/60">
                Full author credit, dedicated contributor profile, and permanent archived record.
              </p>
            </div>

            <div className="bg-paper/5 border border-paper/10 p-4 rounded-sm">
              <div className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood-light mb-1">
                ✦ Peer Review
              </div>
              <p className="font-serif text-xs text-paper/60">
                Editorial review and constructive marginalia feedback from our academic board.
              </p>
            </div>

            <div className="bg-paper/5 border border-paper/10 p-4 rounded-sm">
              <div className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood-light mb-1">
                ✦ Open Access
              </div>
              <p className="font-serif text-xs text-paper/60">
                Distributed open-access scholarly archive indexed for search engines and academia.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {onOpenSubmitInvestigation ? (
              <button
                onClick={onOpenSubmitInvestigation}
                className="bg-blood hover:bg-blood-light text-paper font-sans text-[11px] font-bold tracking-widest uppercase py-3.5 px-7 rounded-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                ✍️ Submit an Investigation / Manuscript
                <ArrowRight size={14} />
              </button>
            ) : null}
            <button
              onClick={onOpenContact}
              className="bg-navy hover:bg-navy/80 text-paper/80 hover:text-paper border border-paper/20 hover:border-paper/40 font-sans text-[11px] font-bold tracking-widest uppercase py-3.5 px-6 rounded-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              Contact Editorial Board
            </button>
            <span className="font-serif text-xs italic text-paper/40">
              Open to criminologists, psychologists, and political researchers.
            </span>
          </div>
        </div>
      </div>

      {/* Contributor Bio & Academic Radar Modal */}
      <AnimatePresence>
        {activeContributor && (() => {
          const authorArticles = getContributorArticles(activeContributor);
          const stats = computeAuthorStats(activeContributor, authorArticles);

          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-midnight border border-paper/20 rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8"
              >
                {/* Modal Close Button */}
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 text-paper/50 hover:text-paper bg-navy hover:bg-blood/20 border border-paper/10 p-2 rounded-full transition-colors cursor-pointer"
                  aria-label="Close contributor profile modal"
                >
                  <X size={18} />
                </button>

                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-paper/10 pr-8">
                  {activeContributor.avatarUrl ? (
                    <img 
                      src={getOptimizedImageUrl(activeContributor.avatarUrl, 'avatar')} 
                      alt={activeContributor.name} 
                      className="w-20 h-20 rounded-full object-cover border-2 border-blood/60 shadow-lg shrink-0" 
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-blood text-paper flex items-center justify-center font-display text-3xl font-bold rounded-full border-2 border-paper/20 shadow-lg shrink-0">
                      {activeContributor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-paper">
                        {activeContributor.name}
                      </h2>
                      {activeContributor.isFounder && (
                        <span className="font-sans text-[9px] font-bold tracking-widest uppercase bg-blood text-paper border border-paper/20 px-2.5 py-0.5 rounded-xs">
                          Founder &amp; Editor
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="font-sans text-xs font-bold tracking-widest uppercase text-blood">
                        {activeContributor.role}
                      </p>
                      {activeContributor.credentials && (
                        <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 rounded-xs font-semibold">
                          {activeContributor.credentials}
                        </span>
                      )}
                    </div>

                    {activeContributor.institution && (
                      <p className="font-serif text-sm text-paper/70 italic mt-1 flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-blood-light shrink-0" />
                        {activeContributor.institution}
                      </p>
                    )}

                    {activeContributor.affiliations && activeContributor.affiliations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">Affiliations:</span>
                        {activeContributor.affiliations.map(aff => (
                          <span key={aff} className="font-sans text-[9px] bg-paper/5 border border-paper/10 text-paper/70 px-2 py-0.5 rounded-xs">
                            {aff}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Social & Academic Channels Bar */}
                    <ContributorModalSocialBadges 
                      profile={activeContributor}
                      socials={activeContributor.socials} 
                      email={activeContributor.email} 
                      authorName={activeContributor.name} 
                      orcid={activeContributor.orcid}
                    />
                  </div>
                </div>

                {/* Key Scholarly Statistics Summary Cards */}
                <div className="py-6 border-b border-paper/10">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-blood flex items-center gap-1.5">
                      <BarChart2 size={13} />
                      Scholar Research Statistics
                    </h3>

                    {onOpenContributorDashboard && (
                      <button
                        onClick={() => {
                          const cId = activeContributor.id;
                          handleCloseModal();
                          onOpenContributorDashboard(cId);
                        }}
                        className="font-sans text-[9px] font-bold uppercase tracking-wider bg-blood/10 hover:bg-blood border border-blood/30 hover:border-blood text-paper py-1.5 px-3 rounded-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <BarChart2 size={11} /> Open Contributor Dashboard →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-[#050505] border border-paper/10 p-3.5 rounded-sm flex flex-col justify-between">
                      <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
                        <FileText size={11} className="text-blood" />
                        Treatises Published
                      </span>
                      <div className="mt-2">
                        <span className="font-mono text-2xl font-bold text-paper">{stats.totalArticles}</span>
                        <p className="font-serif text-[11px] text-paper/40 mt-0.5">Peer-reviewed papers</p>
                      </div>
                    </div>

                    <div className="bg-[#050505] border border-paper/10 p-3.5 rounded-sm flex flex-col justify-between">
                      <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
                        <Eye size={11} className="text-amber-400/80" />
                        Total Engagement
                      </span>
                      <div className="mt-2">
                        <span className="font-mono text-2xl font-bold text-amber-300/90">{stats.totalViews.toLocaleString()}</span>
                        <p className="font-serif text-[11px] text-paper/40 mt-0.5">Direct reader visits</p>
                      </div>
                    </div>

                    <div className="bg-[#050505] border border-paper/10 p-3.5 rounded-sm flex flex-col justify-between">
                      <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 flex items-center gap-1">
                        <Compass size={11} className="text-blood-light" />
                        Primary Specialization
                      </span>
                      <div className="mt-2">
                        <span className="font-display text-sm font-bold text-paper block truncate" title={stats.topDiscipline}>
                          {stats.topDiscipline}
                        </span>
                        <p className="font-serif text-[11px] text-paper/40 mt-0.5">Core thematic focus</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Interest Radar Chart */}
                  <AuthorAcademicRadar data={stats.radarData} authorName={activeContributor.name} />
                </div>

                {/* Biography Body & Research Areas */}
                <div className="py-6 border-b border-paper/10">
                  <h3 className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-blood mb-2">
                    Biography &amp; Academic Focus
                  </h3>
                  <p className="font-serif text-sm sm:text-base text-paper/80 leading-relaxed whitespace-pre-line">
                    {activeContributor.bio}
                  </p>

                  {/* Research Areas */}
                  {activeContributor.researchAreas && activeContributor.researchAreas.length > 0 && (
                    <div className="mt-4">
                      <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-blood-light block mb-1.5">
                        Specialized Research Areas
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeContributor.researchAreas.map(area => (
                          <span 
                            key={area}
                            className="font-sans text-[9px] font-semibold bg-blood/10 border border-blood/30 text-paper/90 px-3 py-1 rounded-xs"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specialty Tags */}
                  {activeContributor.tags && activeContributor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {activeContributor.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="font-sans text-[9px] font-semibold tracking-wider uppercase bg-paper/5 border border-paper/10 text-paper/60 px-3 py-1 rounded-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Articles by this Contributor */}
                <div className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-sans text-[11px] font-bold tracking-[0.2em] uppercase text-paper flex items-center gap-2">
                      <FileText size={14} className="text-blood" />
                      Published Research Papers ({authorArticles.length})
                    </h3>
                  </div>

                  {authorArticles.length > 0 ? (
                    <div className="space-y-4">
                      {authorArticles.map(art => (
                        <div 
                          key={art.id}
                          className="bg-navy/60 hover:bg-navy border border-paper/10 hover:border-blood/40 p-4 rounded-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-sans text-[9px] font-bold tracking-widest uppercase bg-blood/20 text-blood-light px-2 py-0.5 rounded-xs">
                                {art.category}
                              </span>
                              <span className="font-sans text-[10px] text-paper/40 flex items-center gap-1">
                                <Calendar size={10} />
                                {art.publishDate || 'Recent'}
                              </span>
                              <span className="font-sans text-[10px] text-paper/40 flex items-center gap-1">
                                <Clock size={10} />
                                {art.readTime}
                              </span>
                              {typeof art.views === 'number' && art.views > 0 && (
                                <span className="font-sans text-[10px] text-amber-400/70 flex items-center gap-1">
                                  <Eye size={10} />
                                  {art.views.toLocaleString()} views
                                </span>
                              )}
                            </div>

                            <h4 className="font-display text-base font-bold text-paper group-hover:text-blood-light transition-colors">
                              {art.title}
                            </h4>
                            {art.subtitle && (
                              <p className="font-serif text-xs italic text-paper/50">
                                {art.subtitle}
                              </p>
                            )}
                            <p className="font-serif text-xs text-paper/60 line-clamp-2 mt-1">
                              {art.excerpt}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              handleCloseModal();
                              onSelectArticle(art);
                            }}
                            className="font-sans text-[10px] font-bold tracking-widest uppercase bg-blood hover:bg-blood-light text-paper py-2 px-4 rounded-sm shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
                          >
                            Read Article
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-navy/30 border border-paper/10 p-6 rounded-sm text-center">
                      <p className="font-serif text-sm text-paper/50 italic">
                        No published papers found under this contributor profile yet. New research works are currently undergoing peer review.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}
