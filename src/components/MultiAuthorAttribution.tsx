import React from 'react';
import { 
  Users, 
  Award, 
  Building2, 
  ExternalLink, 
  ShieldCheck, 
  Mail, 
  Globe, 
  BookOpen,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Article, CoAuthor, AuthorProfile } from '../types';
import { getArticleAuthors, normalizeOrcid, getOrcidUrl } from '../utils/citationEngine';

interface MultiAuthorAttributionProps {
  article: Article;
  onSelectContributor?: (contributorIdOrName: string) => void;
  variant?: 'header' | 'footer' | 'compact';
}

export default function MultiAuthorAttribution({ 
  article, 
  onSelectContributor, 
  variant = 'header' 
}: MultiAuthorAttributionProps) {
  const authors = getArticleAuthors(article);
  const isMultiAuthor = authors.length > 1 || (article.coAuthors && article.coAuthors.length > 0);

  const handleAuthorClick = (authorName: string, authorId?: string) => {
    if (!onSelectContributor) return;
    if (authorId) {
      onSelectContributor(authorId);
    } else {
      onSelectContributor(authorName);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER COMPACT / MASTHEAD VARIANT
  // ══════════════════════════════════════════════════════════════════════════
  if (variant === 'header' || variant === 'compact') {
    return (
      <div className="border-y border-double border-paper/20 py-3 my-3 bg-[#0a0a0a]/50 select-text">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Authors list */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-3">
            <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase text-blood flex items-center gap-1 shrink-0">
              <Users size={12} />
              {isMultiAuthor ? 'INVESTIGATIVE TEAM' : 'INVESTIGATED BY'}:
            </span>

            {authors.map((author, idx) => {
              const orcidUrl = getOrcidUrl(author.orcid);
              const normalizedOrcid = normalizeOrcid(author.orcid);
              const isPrimary = idx === 0;

              return (
                <div 
                  key={idx} 
                  className="inline-flex flex-wrap items-center gap-1.5 font-sans text-[10px] text-paper/70 bg-paper/[0.03] border border-paper/10 px-2.5 py-1 rounded-sm"
                >
                  <button
                    onClick={() => handleAuthorClick(author.name, isPrimary ? article.authorId : undefined)}
                    className="font-serif font-bold text-paper hover:text-blood underline underline-offset-2 decoration-paper/30 hover:decoration-blood transition-colors cursor-pointer"
                    title={`View ${author.name}'s scholar profile & published dossiers`}
                  >
                    {author.name}
                  </button>

                  {author.role && (
                    <span className="text-[9px] text-blood-light font-medium tracking-wide uppercase">
                      · {author.role}
                    </span>
                  )}

                  {author.institution && (
                    <span className="text-[9px] text-paper/40 italic flex items-center gap-1">
                      <Building2 size={10} className="shrink-0 text-paper/30" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{author.institution}</span>
                    </span>
                  )}

                  {orcidUrl && (
                    <a
                      href={orcidUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#a6ce39] hover:text-[#b8e046] transition-colors ml-1 font-mono text-[9px] font-bold bg-[#a6ce39]/10 border border-[#a6ce39]/30 px-1.5 py-0.2 rounded-xs"
                      title={`Verified ORCID Record: ${normalizedOrcid}`}
                    >
                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M128,0A128,128,0,1,0,256,128,128,128,0,0,0,128,0ZM86.37,186.25H60.08V73.49h26.29Zm-13.14-126a15.35,15.35,0,1,1,15.35-15.35A15.35,15.35,0,0,1,73.23,60.25Zm122.9,91.8c0,22.25-17.75,34.2-46.7,34.2H109.84V73.49h40.35c27.1,0,45.94,14.65,45.94,37.35,0,13.79-8.4,26.47-21.75,32.32C188.08,128.51,196.13,140.48,196.13,152.05Zm-26.65,0c0-12.87-9.5-20.7-25.55-20.7H133.72v41.4h10.21C159.98,172.75,169.48,164.92,169.48,152.05Zm-4.9-46.35c0-11.45-8.5-18.4-22.75-18.4H133.72v36.8h8.11C156.08,124.1,164.58,117.15,164.58,105.7Z"/>
                      </svg>
                      <span>ORCID</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick link to contributor registry */}
          <div className="shrink-0">
            <button
              onClick={() => handleAuthorClick(article.authorName, article.authorId)}
              className="font-sans text-[9px] font-bold tracking-widest uppercase text-blood hover:text-blood-light flex items-center gap-1 cursor-pointer transition-colors"
            >
              Contributors Registry &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER COMPREHENSIVE CONTRIBUTORSHIP & RESEARCH TEAM BREAKDOWN
  // ══════════════════════════════════════════════════════════════════════════
  if (!isMultiAuthor) {
    return null;
  }

  return (
    <div className="border border-paper/10 bg-[#090909] rounded-sm p-6 sm:p-7 shadow-lg my-8 select-text">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper/10 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase text-blood bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-xs">
              CRediT Taxonomy
            </span>
            <span className="font-mono text-[9px] text-paper/40 uppercase tracking-wider">
              Scholarly Attribution
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-paper">
            Investigative Team &amp; Contributorship
          </h3>
          <p className="font-serif text-xs text-paper/50 italic mt-0.5">
            Transparent attribution of research design, data collection, psychopathological modeling, and verification.
          </p>
        </div>
        <div className="font-mono text-[10px] text-paper/40 uppercase bg-paper/5 border border-paper/10 px-2.5 py-1 rounded-sm self-start sm:self-auto">
          {authors.length} {authors.length === 1 ? 'Scholar Attributed' : 'Scholars Attributed'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {authors.map((author, idx) => {
          const orcidUrl = getOrcidUrl(author.orcid);
          const normalizedOrcid = normalizeOrcid(author.orcid);
          const isPrimary = idx === 0;

          return (
            <div 
              key={idx} 
              className="border border-paper/10 rounded-sm bg-navy/40 p-5 flex flex-col justify-between hover:border-blood/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blood/90 text-paper flex items-center justify-center font-display text-lg font-bold rounded-sm border border-paper/10 shrink-0">
                      {author.name.charAt(0)}
                    </div>
                    <div>
                      <button
                        onClick={() => handleAuthorClick(author.name, isPrimary ? article.authorId : undefined)}
                        className="font-display text-base font-bold text-paper hover:text-blood transition-colors text-left cursor-pointer"
                      >
                        {author.name}
                      </button>
                      <div className="font-sans text-[9px] font-bold uppercase tracking-wider text-blood-light flex items-center gap-1.5 mt-0.5">
                        {author.role && <span>{author.role}</span>}
                        {isPrimary && (
                          <span className="bg-blood/20 text-red-300 px-1.5 py-0.2 rounded-xs text-[8px]">
                            Primary Author
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Institution affiliation */}
                {author.institution && (
                  <div className="flex items-center gap-1.5 text-paper/60 font-serif text-xs mb-3 bg-paper/5 border border-paper/10 px-2.5 py-1.5 rounded-sm">
                    <Building2 size={13} className="text-paper/40 shrink-0" />
                    <span>{author.institution}</span>
                  </div>
                )}
              </div>

              {/* Badges and links footer */}
              <div className="mt-4 pt-3 border-t border-paper/10 flex flex-wrap items-center justify-between gap-2">
                {orcidUrl ? (
                  <a
                    href={orcidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#a6ce39] hover:text-[#b8e046] font-mono text-[10px] font-bold transition-colors bg-[#a6ce39]/10 border border-[#a6ce39]/30 px-2 py-0.5 rounded-sm"
                    title={`View ORCID Profile: ${normalizedOrcid}`}
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 256 256" fill="currentColor">
                      <path d="M128,0A128,128,0,1,0,256,128,128,128,0,0,0,128,0ZM86.37,186.25H60.08V73.49h26.29Zm-13.14-126a15.35,15.35,0,1,1,15.35-15.35A15.35,15.35,0,0,1,73.23,60.25Zm122.9,91.8c0,22.25-17.75,34.2-46.7,34.2H109.84V73.49h40.35c27.1,0,45.94,14.65,45.94,37.35,0,13.79-8.4,26.47-21.75,32.32C188.08,128.51,196.13,140.48,196.13,152.05Zm-26.65,0c0-12.87-9.5-20.7-25.55-20.7H133.72v41.4h10.21C159.98,172.75,169.48,164.92,169.48,152.05Zm-4.9-46.35c0-11.45-8.5-18.4-22.75-18.4H133.72v36.8h8.11C156.08,124.1,164.58,117.15,164.58,105.7Z"/>
                    </svg>
                    <span>{normalizedOrcid}</span>
                    <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className="font-mono text-[9px] text-paper/30 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-blood-light" />
                    Verified Contributor
                  </span>
                )}

                <button
                  onClick={() => handleAuthorClick(author.name, isPrimary ? article.authorId : undefined)}
                  className="font-sans text-[9px] font-bold tracking-widest uppercase text-blood hover:text-blood-light flex items-center gap-1 cursor-pointer transition-colors"
                >
                  Scholar Profile &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
