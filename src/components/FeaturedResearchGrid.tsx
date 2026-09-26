import React from 'react';
import { Article } from '../types';
import { Clock, Calendar, ArrowRight, Eye } from 'lucide-react';
import ShareMenu from './ShareMenu';
import BookmarkButton from './BookmarkButton';
import { getOptimizedImageUrl, getArticleCoverImage, getArticleCoverVersion } from '../utils/imageOptimizer';

interface FeaturedResearchGridProps {
  articles: Article[];
  onArticleClick: (article: Article) => void;
  savedArticles?: { articleId: string }[];
  onToggleSave?: (article: Article) => void;
}

export default function FeaturedResearchGrid({
  articles,
  onArticleClick,
  savedArticles = [],
  onToggleSave
}: FeaturedResearchGridProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <section 
      id="featured-research-section" 
      aria-label="Featured Articles" 
      className="py-12 md:py-16 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto border-b border-paper/10"
    >
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-px bg-blood/60" />
          <span className="font-sans text-[10px] font-bold tracking-[0.35em] text-blood uppercase">
            Featured Research
          </span>
          <span className="w-8 h-px bg-blood/60" />
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-paper tracking-tight">
          Selected Inquiries &amp; Investigations
        </h2>
        <div className="w-12 h-px bg-paper/15 mt-3" />
      </div>

      {/* 4-Card Equal-Width Responsive Layout */}
      {/* Desktop (lg): Exactly 4 equal-width cards in ONE horizontal row */}
      {/* Tablet (sm/md): 2 cards per row (2 rows) */}
      {/* Mobile: 1 card per row (4 cards stacked vertically) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 items-stretch w-full">
        {articles.slice(0, 4).map((article, index) => {
          const isSaved = savedArticles.some(s => s.articleId === article.id);
          const publishedDate = article.originalPublishedAt || article.publishDate || (
            article.createdAt 
              ? new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Archive Record'
          );

          return (
            <article
              key={article.id || index}
              id={`featured-card-${index + 1}`}
              onClick={() => onArticleClick(article)}
              className="bg-navy/90 border border-paper/10 flex flex-col justify-between h-full overflow-hidden group cursor-pointer transition-all duration-300 hover:border-blood/50 hover:bg-paper/[0.02] shadow-xl rounded-sm select-none relative"
            >
              {/* Card Top: Banner Image & Category */}
              <div className="flex flex-col flex-grow">
                <div className="w-full h-44 sm:h-48 lg:h-40 xl:h-44 overflow-hidden relative bg-ink border-b border-paper/10 shrink-0">
                  {(() => {
                    const coverUrl = getArticleCoverImage(article);
                    const coverVer = getArticleCoverVersion(article);
                    return coverUrl ? (
                      <img
                        src={getOptimizedImageUrl(coverUrl, 'card', coverVer)}
                        alt={article.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blood/25 via-midnight to-ink flex items-center justify-center p-6 text-center">
                        <span className="font-serif italic text-paper/30 text-xs tracking-wider">
                          The Oligarchy Research Dossier
                        </span>
                      </div>
                    );
                  })()}

                  {/* Gradient vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/20 to-transparent pointer-events-none" />

                  {/* Category Badge & Bookmark */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                    <span 
                      className={`font-sans text-[8.5px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border shadow-sm ${
                        article.category === 'criminology'
                          ? 'bg-red-950/80 text-red-300 border-red-800/40'
                          : article.category === 'psyche'
                          ? 'bg-purple-950/80 text-purple-200 border-purple-800/40'
                          : 'bg-blue-950/80 text-blue-200 border-blue-800/40'
                      }`}
                    >
                      {article.category}
                    </span>

                    {/* Bookmark action (clickable, stopPropagation) */}
                    {onToggleSave && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="pointer-events-auto"
                      >
                        <BookmarkButton
                          article={article}
                          isSaved={isSaved}
                          onToggleSave={onToggleSave}
                          variant="icon"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-5 sm:p-6 flex flex-col gap-2.5 flex-grow">
                  {/* Metadata Row: Date & Reading Time */}
                  <div className="flex items-center justify-between font-sans text-[10px] text-paper/40 border-b border-paper/5 pb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-paper/30" />
                      {publishedDate}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-paper/50">
                      <Clock size={11} className="text-blood/80" />
                      {article.readTime || '5 min read'}
                    </span>
                  </div>

                  {/* Article Title */}
                  <h3 className="font-display text-lg lg:text-xl font-bold text-paper group-hover:text-paper group-hover:underline underline-offset-4 decoration-blood transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h3>

                  {/* Subtitle (if available) */}
                  {article.subtitle && (
                    <h4 className="font-display text-xs italic text-paper/55 leading-relaxed line-clamp-1">
                      {article.subtitle}
                    </h4>
                  )}

                  {/* Excerpt */}
                  {article.excerpt && (
                    <p className="font-serif text-xs text-paper/65 leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Bottom / Footer (Aligned perfectly at bottom across all cards) */}
              <div className="px-5 sm:px-6 pb-5 pt-3 mt-auto border-t border-paper/5 flex items-center justify-between gap-2 shrink-0">
                {/* Author attribution */}
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="font-sans text-[8px] uppercase tracking-widest text-blood font-bold">
                    Author
                  </span>
                  <span 
                    className="font-serif text-xs text-paper/85 font-medium truncate max-w-[100px] sm:max-w-[120px] xl:max-w-[140px]" 
                    title={article.authorName || 'The Oligarchy'}
                  >
                    {article.authorName || 'The Oligarchy'}
                  </span>
                </div>

                {/* Direct Share Menu & Read Link */}
                <div className="flex items-center gap-2 shrink-0">
                  <div onClick={(e) => e.stopPropagation()} className="relative z-20">
                    <ShareMenu article={article} />
                  </div>
                  <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood group-hover:text-blood-light flex items-center gap-1 transition-colors pl-1">
                    Read <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
