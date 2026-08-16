import React from 'react';
import { Article } from '../types';
import { Eye, Clock, Calendar } from 'lucide-react';
import ShareMenu from './ShareMenu';
import BookmarkButton from './BookmarkButton';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface ArticleCardProps {
  key?: string;
  article: Article;
  onClick: () => void;
  isSaved?: boolean;
  onToggleSave?: (article: Article) => void;
}

export default function ArticleCard({ article, onClick, isSaved = false, onToggleSave }: ArticleCardProps) {
  return (
    <article 
      onClick={onClick}
      className="bg-navy border border-paper/10 overflow-hidden flex flex-col cursor-pointer hover:bg-paper/[0.02] hover:border-blood/40 transition-all duration-300 group rounded-sm select-none"
    >
      {/* Optional Featured Thumbnail Header with native lazy loading and CDN query optimization */}
      {article.featuredImage && (
        <div className="w-full h-44 sm:h-48 overflow-hidden relative bg-ink/60 border-b border-paper/10">
          <img 
            src={getOptimizedImageUrl(article.featuredImage, 'card')}
            alt={article.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-6 md:p-8 flex flex-col gap-4 flex-1">
        {/* Card Header Metadata */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Main Category Badge */}
            <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border ${
              article.category === 'criminology' 
                ? 'bg-red-950/10 text-red-400 border-red-900/30' 
                : article.category === 'psyche'
                ? 'bg-purple-950/10 text-purple-300 border-purple-900/30'
                : 'bg-blue-950/10 text-blue-300 border-blue-900/30'
            }`}>
              {article.category}
            </span>
            
            {/* Post Type / Series Badge */}
            {article.seriesName && (
              <span className="font-sans text-[9px] font-bold tracking-widest uppercase bg-paper/5 border border-paper/10 text-paper/40 px-2.5 py-1 rounded-sm">
                Series: {article.seriesName} {article.seriesPart && `(Pt. ${article.seriesPart})`}
              </span>
            )}
          </div>
          
          {/* Right Header: Date & Bookmark Button */}
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1">
              <Calendar size={11} />
              {article.publishDate || new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>

            {onToggleSave && (
              <div onClick={(e) => e.stopPropagation()}>
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

        {/* Article Title */}
        <h3 className="font-display text-xl font-semibold text-paper group-hover:underline underline-offset-4 decoration-blood transition-all duration-200 leading-snug">
          {article.title}
        </h3>

        {/* Excerpt Summary */}
        <p className="font-serif text-sm text-paper/60 leading-relaxed line-clamp-3">
          {article.excerpt}
        </p>

        {/* Card Footer Metadata */}
        <div className="flex justify-between items-center mt-auto pt-4 border-t border-paper/5">
          {/* Views & Tags */}
          <div className="flex items-center gap-3 font-sans text-[10px] text-paper/30">
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {article.views || 0}
            </span>
            <span className="hidden sm:inline">
              {(article.tags || []).slice(0, 2).join(', ')}
            </span>
          </div>

          {/* Direct Card-level Share Widget */}
          <div onClick={(e) => e.stopPropagation()} className="relative z-30">
            <ShareMenu article={article} />
          </div>

          {/* Action / Read Time */}
          <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood group-hover:text-blood-light flex items-center gap-1 transition-colors">
            <Clock size={11} className="mr-0.5" />
            {article.readTime || '5 min read'} &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}
