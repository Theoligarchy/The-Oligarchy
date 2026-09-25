import React from 'react';
import { Article } from '../types';
import { 
  X, 
  Edit3, 
  ExternalLink, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Award, 
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface ArticlePreviewModalProps {
  article: Article | null;
  onClose: () => void;
  onEdit: (article: Article) => void;
}

export default function ArticlePreviewModal({
  article,
  onClose,
  onEdit
}: ArticlePreviewModalProps) {
  if (!article) return null;

  const formatDate = (timestamp?: number, fallbackStr?: string) => {
    if (fallbackStr) return fallbackStr;
    if (!timestamp) return 'Unpublished';
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-ink border border-paper/20 rounded-sm w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-paper/10 bg-navy/80 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`font-sans text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs border ${
              article.status === 'published'
                ? 'bg-green-950/20 text-[#8bc4a8] border-green-800/30'
                : article.status === 'scheduled'
                ? 'bg-blue-950/20 text-blue-300 border-blue-800/30'
                : 'bg-yellow-950/20 text-yellow-500 border-yellow-800/30'
            }`}>
              {article.status.toUpperCase()}
            </span>
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-blood bg-blood/10 border border-blood/20 px-2 py-0.5 rounded-xs">
              {article.category}
            </span>
            <span className="font-mono text-[9px] text-paper/40 hidden sm:inline">
              Slug: /post/{article.slug}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(article);
              }}
              className="bg-blood hover:bg-blood/90 text-paper font-sans text-[9px] font-bold uppercase tracking-widest py-1.5 px-3 rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Edit3 size={11} />
              Edit Manuscript
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-paper/40 hover:text-paper hover:bg-paper/10 rounded-xs transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="p-6 md:p-12 overflow-y-auto flex-1 select-text bg-[#0e0e11] text-paper">
          <article className="max-w-3xl mx-auto space-y-8">
            {/* Meta Header */}
            <div className="space-y-4 border-b border-paper/10 pb-8">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-paper/50">
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-blood" />
                  {formatDate(article.createdAt, article.originalPublishedAt || article.publishDate)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-blood" />
                  {article.readTime || '8 min read'}
                </span>
                {article.doi && (
                  <>
                    <span>•</span>
                    <span className="text-blood font-mono">
                      DOI: {article.doi}
                    </span>
                  </>
                )}
              </div>

              {/* Title & Subtitle */}
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-paper leading-[1.15]">
                {article.title}
              </h1>

              {article.subtitle && (
                <p className="font-serif text-lg md:text-xl text-paper/70 italic leading-relaxed">
                  {article.subtitle}
                </p>
              )}

              {/* Author Attribution */}
              <div className="pt-4 border-t border-paper/5 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blood/20 border border-blood/40 flex items-center justify-center text-paper font-serif font-bold text-sm">
                    {(article.authorName || 'Priyasha Priyal Jena').charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm font-bold text-paper">
                        {article.authorName || 'Priyasha Priyal Jena'}
                      </span>
                      {(!article.authorId || article.authorId === 'priyasha-priyal-jena' || article.authorName === 'Priyasha Priyal Jena') && (
                        <span className="font-sans text-[8px] font-bold uppercase tracking-wider bg-blood/10 text-blood border border-blood/30 px-1.5 py-0.2 rounded-xs">
                          Founder &amp; Editor
                        </span>
                      )}
                    </div>
                    <span className="font-sans text-[10px] text-paper/40">
                      {article.authorTitle || article.authorInstitution || 'The Oligarchy'}
                      {article.authorOrcid ? ` · ORCID: ${article.authorOrcid}` : ''}
                    </span>
                  </div>
                </div>

                {/* Co-Authors List if present */}
                {Array.isArray(article.coAuthors) && article.coAuthors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-paper/5 flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-bold">
                      Co-Authors:
                    </span>
                    {article.coAuthors.map((ca, i) => (
                      <span key={i} className="font-serif text-xs text-paper/80 bg-navy border border-paper/10 px-2 py-0.5 rounded-xs">
                        {ca.name} {ca.role ? `(${ca.role})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Featured Image */}
            {article.featuredImage && (
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-sm overflow-hidden bg-ink border border-paper/10">
                  <img
                    src={article.featuredImage}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Excerpt */}
            {article.excerpt && (
              <div className="border-l-2 border-blood pl-4 py-1 italic font-serif text-base text-paper/80 bg-blood/[0.03]">
                &ldquo;{article.excerpt}&rdquo;
              </div>
            )}

            {/* Main Content Body */}
            <div 
              className="prose prose-invert max-w-none font-serif text-paper/80 text-sm md:text-base leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: article.content || '<p class="italic text-paper/40">No content drafted.</p>' }}
            />

            {/* Sources & Citations */}
            {Array.isArray(article.sources) && article.sources.length > 0 && (
              <div className="mt-12 pt-6 border-t border-paper/15 space-y-3">
                <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-paper/60">
                  Sources &amp; Academic Bibliography ({article.sources.length})
                </h4>
                <ul className="space-y-2 font-serif text-xs text-paper/70">
                  {article.sources.map((src, i) => (
                    <li key={i} className="flex items-start gap-2 bg-navy/40 p-2.5 rounded-xs border border-paper/5">
                      <span className="font-mono text-blood font-bold text-[10px] shrink-0 mt-0.5">[{i + 1}]</span>
                      <div className="flex-1">
                        <span className="font-semibold text-paper">{src.title}</span>
                        {src.citation && <span className="block text-[10px] text-paper/50 mt-0.5">{src.citation}</span>}
                        {src.url && (
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] text-blood hover:underline block mt-0.5 truncate">
                            {src.url}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search Tags */}
            {Array.isArray(article.tags) && article.tags.length > 0 && (
              <div className="pt-4 border-t border-paper/5 flex flex-wrap items-center gap-1.5">
                <span className="font-sans text-[9px] uppercase tracking-wider text-paper/30 font-bold mr-1">
                  Tags:
                </span>
                {article.tags.map(t => (
                  <span key={t} className="font-sans text-[9px] bg-paper/5 border border-paper/10 text-paper/60 px-2 py-0.5 rounded-xs">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
