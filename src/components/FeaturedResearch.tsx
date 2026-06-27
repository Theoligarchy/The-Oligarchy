import React from 'react';
import { Article } from '../types';
import { Eye, Clock, Download, FileText, ArrowRight } from 'lucide-react';

interface FeaturedResearchProps {
  article: Article;
  onClick: () => void;
}

export default function FeaturedResearch({ article, onClick }: FeaturedResearchProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-navy border border-paper/10 grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-2xl hover:border-blood/40 cursor-pointer transition-all duration-300 group rounded-sm select-none"
    >
      {/* Left: High-Res Banner Media Column */}
      <div className="md:col-span-5 min-h-[250px] md:min-h-[380px] relative overflow-hidden bg-ink flex flex-col justify-end p-6 md:p-8">
        {article.featuredImage ? (
          <img 
            src={article.featuredImage} 
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blood/30 to-ink opacity-65" />
        )}
        
        {/* Subtle radial shading */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent z-10" />

        {/* Foreground Header tags inside image */}
        <div className="relative z-20 flex flex-col gap-2.5">
          <span className="font-sans text-[9px] font-bold tracking-[0.25em] uppercase text-paper bg-blood border border-blood/50 px-3 py-1 w-fit rounded-sm shadow-md">
            ★ Featured Research
          </span>
          <span className="font-sans text-[10px] tracking-widest uppercase text-paper/50">
            {article.category} {article.seriesName && `· ${article.seriesName}`}
          </span>
        </div>
      </div>

      {/* Right: Content details Column */}
      <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center gap-5 bg-navy/80 select-text">
        <h3 className="font-display text-2xl md:text-3xl font-bold text-paper group-hover:underline underline-offset-4 decoration-blood transition-all leading-tight">
          {article.title}
        </h3>
        
        {article.subtitle && (
          <h4 className="font-display text-base md:text-lg italic text-paper/50 leading-relaxed -mt-2">
            {article.subtitle}
          </h4>
        )}

        <p className="font-serif text-base text-paper/70 leading-relaxed">
          {article.excerpt}
        </p>

        {/* Action Triggers: PDF Download and Standard View */}
        <div className="flex flex-wrap gap-4 mt-2">
          {/* Main read article trigger */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-[0.18em] uppercase py-3 px-6 flex items-center gap-2 transition-all shadow-md rounded-sm cursor-pointer"
          >
            Read Analysis <ArrowRight size={12} />
          </button>

          {/* Prominent PDF report action link button */}
          {article.pdfLink && (
            <a 
              href={article.pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border border-paper/20 hover:border-blood text-paper/70 hover:text-paper hover:bg-paper/[0.02] font-sans text-[10px] font-bold tracking-[0.18em] uppercase py-3 px-6 flex items-center gap-2 transition-all rounded-sm"
              title="Download research paper report document"
            >
              <FileText size={12} /> Research Report (PDF) <Download size={12} />
            </a>
          )}
        </div>

        {/* Banner footer views and timing */}
        <div className="flex gap-6 items-center border-t border-paper/10 pt-4 mt-2 font-sans text-[10px] text-paper/30">
          <span>Published: {article.publishDate || new Date(article.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</span>
          <span className="flex items-center gap-1"><Eye size={12} /> {article.views || 0} views</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {article.readTime || '15 min read'}</span>
        </div>
      </div>
    </div>
  );
}
