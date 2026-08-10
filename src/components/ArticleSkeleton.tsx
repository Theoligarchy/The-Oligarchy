import React from 'react';

export default function ArticleSkeleton() {
  return (
    <div className="py-12 md:py-16 px-6 max-w-5xl mx-auto select-none animate-pulse">
      {/* Back Button Skeleton */}
      <div className="w-36 h-8 bg-paper/10 rounded-sm mb-10"></div>

      {/* Article Container Block */}
      <div className="flex flex-col gap-6">
        
        {/* Banner Image Skeleton */}
        <div className="w-full h-[220px] md:h-[400px] bg-paper/10 rounded-sm border border-paper/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-paper/5 to-transparent animate-shimmer" />
        </div>

        {/* Upper Metadata Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-24 h-6 bg-paper/15 rounded-sm"></div>
          <div className="w-32 h-4 bg-paper/10 rounded-sm"></div>
          <div className="w-28 h-4 bg-paper/10 rounded-sm"></div>
          <div className="w-20 h-4 bg-paper/10 rounded-sm"></div>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-paper/10 pb-4 mt-2">
          <div className="flex gap-2.5">
            <div className="w-36 h-9 bg-paper/10 rounded-sm"></div>
            <div className="w-44 h-9 bg-blood/20 border border-blood/30 rounded-sm"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-9 bg-navy/80 border border-paper/10 rounded-sm"></div>
            <div className="w-28 h-9 bg-navy/80 border border-paper/10 rounded-sm"></div>
          </div>
        </div>

        {/* Title & Subtitle Skeleton */}
        <div className="space-y-3 mt-2">
          <div className="h-10 md:h-14 bg-paper/20 rounded-sm w-11/12"></div>
          <div className="h-6 md:h-8 bg-paper/10 rounded-sm w-3/4"></div>
        </div>

        {/* Author Line Skeleton */}
        <div className="border-y border-double border-paper/20 py-3 my-2 flex justify-between items-center">
          <div className="w-72 h-4 bg-paper/15 rounded-sm"></div>
          <div className="w-32 h-4 bg-blood/20 rounded-sm"></div>
        </div>

        {/* Excerpt Box Skeleton */}
        <div className="p-5 border-l-2 border-blood bg-navy/40 rounded-sm space-y-2 my-2">
          <div className="h-4 bg-paper/15 rounded-sm w-full"></div>
          <div className="h-4 bg-paper/15 rounded-sm w-5/6"></div>
        </div>

        {/* Article Body Content Paragraphs Skeleton */}
        <div className="space-y-4 my-4">
          <div className="h-7 bg-paper/20 rounded-sm w-1/3 mb-2"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-full"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-11/12"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-full"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-4/5"></div>

          <div className="p-6 bg-navy/30 border-l-4 border-blood rounded-sm my-6 space-y-2">
            <div className="h-5 bg-paper/15 rounded-sm w-11/12 italic"></div>
            <div className="h-5 bg-paper/15 rounded-sm w-2/3 italic"></div>
          </div>

          <div className="h-7 bg-paper/20 rounded-sm w-1/4 mt-8 mb-2"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-full"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-11/12"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-9/12"></div>
        </div>

        {/* Sources Bibliography Skeleton */}
        <div className="border border-paper/10 bg-navy/20 p-6 rounded-sm mt-6 space-y-3">
          <div className="h-5 bg-paper/20 rounded-sm w-48"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-3/4"></div>
          <div className="h-4 bg-paper/10 rounded-sm w-2/3"></div>
        </div>

        {/* Recommended for You Skeleton */}
        <div className="border border-paper/10 bg-[#0a0a0a] p-6 rounded-sm mt-8 space-y-4">
          <div className="h-5 bg-paper/20 rounded-sm w-56"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-paper/10 p-4 rounded-sm bg-navy/30 space-y-3">
                <div className="h-3 bg-paper/15 rounded-sm w-1/2"></div>
                <div className="h-5 bg-paper/20 rounded-sm w-full"></div>
                <div className="h-4 bg-paper/10 rounded-sm w-full"></div>
                <div className="h-3 bg-paper/10 rounded-sm w-2/3"></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
