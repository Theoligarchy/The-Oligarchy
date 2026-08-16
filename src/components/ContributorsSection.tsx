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
  Layers
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

// Default Founder Profile
export const DEFAULT_FOUNDER_PROFILE: AuthorProfile = {
  id: 'priyasha-priyal-jena',
  name: 'Priyasha Priyal Jena',
  role: 'Founder & Editor-in-Chief',
  institution: 'The Oligarchy Research Group',
  bio: 'Founder and Editor of The Oligarchy, an independent research publication exploring crime, psychology, politics, and systems of power. Founded at 19, the project began as an attempt to understand why people, institutions, and societies behave the way they do. The publication prioritises understanding before judgment and research before outrage.',
  tags: ['Criminology', 'Behavioral Psyche', 'Corporate Fraud', 'Systems of Power', 'Institutional Behavior'],
  socials: {
    instagram: SOCIAL_LINKS.instagram,
    twitter: SOCIAL_LINKS.twitter,
    linkedin: SOCIAL_LINKS.linkedinPersonal,
    website: 'https://theoligarchy.in'
  },
  isFounder: true,
  joinedDate: '2024'
};

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

interface ContributorsSectionProps {
  articles: Article[];
  contributors?: AuthorProfile[];
  onSelectArticle: (article: Article) => void;
  onOpenContact: () => void;
  selectedContributorId?: string | null;
  onCloseContributorModal?: () => void;
}

export default function ContributorsSection({
  articles,
  contributors = [],
  onSelectArticle,
  onOpenContact,
  selectedContributorId,
  onCloseContributorModal
}: ContributorsSectionProps) {
  const [allContributors, setAllContributors] = useState<AuthorProfile[]>([DEFAULT_FOUNDER_PROFILE]);
  const [activeContributor, setActiveContributor] = useState<AuthorProfile | null>(null);

  useEffect(() => {
    // Merge provided contributors with founder, ensuring no duplicate IDs
    const list = [DEFAULT_FOUNDER_PROFILE];
    contributors.forEach(c => {
      if (!list.some(item => item.id === c.id || item.name.toLowerCase() === c.name.toLowerCase())) {
        list.push(c);
      }
    });
    setAllContributors(list);
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

  // Helper to filter published articles by a contributor
  const getContributorArticles = (profile: AuthorProfile) => {
    return articles.filter(a => {
      if (a.status !== 'published') return false;
      const matchId = a.authorId && a.authorId.toLowerCase() === profile.id.toLowerCase();
      const matchName = a.authorName && a.authorName.toLowerCase() === profile.name.toLowerCase();
      // If founder, also match articles authored by default
      if (profile.isFounder && (!a.authorName || a.authorName.toLowerCase().includes('priyasha'))) {
        return true;
      }
      return matchId || matchName;
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

                {/* Research Focus Tags */}
                {profile.tags && profile.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {profile.tags.map(tag => (
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
                <div className="flex items-center gap-2">
                  {profile.socials?.instagram && (
                    <a 
                      href={profile.socials.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-paper/40 hover:text-blood transition-colors p-1"
                      title="Instagram Profile"
                    >
                      <Instagram size={14} />
                    </a>
                  )}
                  {profile.socials?.twitter && (
                    <a 
                      href={profile.socials.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-paper/40 hover:text-blood transition-colors p-1"
                      title="Twitter / X Profile"
                    >
                      <Twitter size={14} />
                    </a>
                  )}
                  {profile.socials?.linkedin && (
                    <a 
                      href={profile.socials.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-paper/40 hover:text-blood transition-colors p-1"
                      title="LinkedIn Profile"
                    >
                      <Linkedin size={14} />
                    </a>
                  )}
                </div>

                <button
                  onClick={() => setActiveContributor(profile)}
                  className="font-sans text-[10px] font-bold tracking-widest uppercase bg-blood/10 hover:bg-blood border border-blood/30 hover:border-blood text-paper/90 hover:text-paper py-2 px-4 rounded-sm flex items-center gap-1.5 transition-all cursor-pointer"
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
            <button
              onClick={onOpenContact}
              className="bg-blood hover:bg-blood-light text-paper font-sans text-[11px] font-bold tracking-widest uppercase py-3 px-6 rounded-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              Submit Research Proposal / Apply
              <ArrowRight size={14} />
            </button>
            <span className="font-serif text-xs italic text-paper/40">
              Co-authorship and guest scholar opportunities available.
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

                    <p className="font-sans text-xs font-bold tracking-widest uppercase text-blood mt-1">
                      {activeContributor.role}
                    </p>

                    {activeContributor.institution && (
                      <p className="font-serif text-sm text-paper/50 italic mt-0.5 flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-blood-light" />
                        {activeContributor.institution}
                      </p>
                    )}

                    {/* Social Links Bar */}
                    <div className="flex items-center gap-3 mt-3">
                      {activeContributor.socials?.instagram && (
                        <a 
                          href={activeContributor.socials.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-sans text-[10px] font-semibold text-paper/60 hover:text-paper bg-navy border border-paper/10 hover:border-blood px-2.5 py-1 rounded-xs flex items-center gap-1 transition-colors"
                        >
                          <Instagram size={11} /> Instagram
                        </a>
                      )}
                      {activeContributor.socials?.twitter && (
                        <a 
                          href={activeContributor.socials.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-sans text-[10px] font-semibold text-paper/60 hover:text-paper bg-navy border border-paper/10 hover:border-blood px-2.5 py-1 rounded-xs flex items-center gap-1 transition-colors"
                        >
                          <Twitter size={11} /> Twitter
                        </a>
                      )}
                      {activeContributor.socials?.linkedin && (
                        <a 
                          href={activeContributor.socials.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-sans text-[10px] font-semibold text-paper/60 hover:text-paper bg-navy border border-paper/10 hover:border-blood px-2.5 py-1 rounded-xs flex items-center gap-1 transition-colors"
                        >
                          <Linkedin size={11} /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Scholarly Statistics Summary Cards */}
                <div className="py-6 border-b border-paper/10">
                  <h3 className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-blood mb-3 flex items-center gap-1.5">
                    <BarChart2 size={13} />
                    Scholar Research Statistics
                  </h3>

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

                {/* Biography Body */}
                <div className="py-6 border-b border-paper/10">
                  <h3 className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-blood mb-2">
                    Biography &amp; Academic Focus
                  </h3>
                  <p className="font-serif text-sm sm:text-base text-paper/80 leading-relaxed whitespace-pre-line">
                    {activeContributor.bio}
                  </p>

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
