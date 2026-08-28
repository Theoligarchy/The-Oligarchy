import React, { useState } from 'react';
import { Source } from '../types';
import { ExternalLink, FileText, BookOpen, Scale, Database, Shield, Copy, Check, Quote } from 'lucide-react';

interface SourcesSectionProps {
  sources: Source[];
}

export default function SourcesSection({ sources }: SourcesSectionProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  // Map category ID to printable labels and scholarly icons
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'academic':
        return { label: 'Academic Papers & Journals', icon: <FileText size={13} className="text-blue-400" /> };
      case 'government':
        return { label: 'Government & Agency Reports', icon: <Shield size={13} className="text-red-400" /> };
      case 'book':
        return { label: 'Scholarly Literature & Books', icon: <BookOpen size={13} className="text-yellow-500" /> };
      case 'court':
        return { label: 'Court Records & Judicial Filings', icon: <Scale size={13} className="text-purple-400" /> };
      case 'database':
        return { label: 'Public Databases & Registries', icon: <Database size={13} className="text-green-400" /> };
      case 'investigative':
        return { label: 'Primary Investigative Journalism', icon: <FileText size={13} className="text-teal-400" /> };
      default:
        return { label: 'Referenced Materials & Sources', icon: <Quote size={13} className="text-paper/40" /> };
    }
  };

  const handleCopySource = async (src: Source, index: number) => {
    const textToCopy = `${src.title}${src.citation ? ` (${src.citation})` : ''}${src.url ? ` — ${src.url}` : ''}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Group sources by category while preserving global 1-based index
  const sourcesWithIndex = sources.map((src, idx) => ({ ...src, globalIndex: idx + 1 }));
  const groupedSources = sourcesWithIndex.reduce((acc, src) => {
    const cat = src.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(src);
    return acc;
  }, {} as Record<string, typeof sourcesWithIndex>);

  return (
    <div 
      className="mt-12 pt-8 border-t border-paper/10 select-text" 
      id="article-references-section"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-bold text-paper/95 tracking-wide uppercase text-blood/90 flex items-center gap-2">
          <span>References &amp; Secondary Materials</span>
          <span className="font-mono text-xs font-normal text-paper/40 bg-paper/5 px-2 py-0.5 rounded border border-paper/10">
            {sources.length} {sources.length === 1 ? 'Citation' : 'Citations'}
          </span>
        </h3>
      </div>
      
      <div className="flex flex-col gap-6">
        {Object.entries(groupedSources).map(([catId, catSources]) => {
          const { label, icon } = getCategoryDetails(catId);
          return (
            <div key={catId} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-sans text-[10px] font-bold tracking-wider uppercase text-paper/40 border-b border-paper/5 pb-1.5">
                {icon}
                <span>{label}</span>
              </div>
              <ul className="flex flex-col gap-3 font-serif text-sm">
                {catSources.map((src) => {
                  const isCopied = copiedIndex === src.globalIndex;
                  return (
                    <li 
                      key={src.globalIndex} 
                      id={`reference-${src.globalIndex}`}
                      className="group p-2.5 rounded-sm border-l-2 border-paper/15 bg-paper/[0.015] hover:bg-paper/[0.04] transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-paper/70 hover:text-paper"
                    >
                      <div className="flex-1">
                        <span className="font-mono text-xs font-bold text-blood-light bg-blood/15 border border-blood/30 px-1.5 py-0.5 rounded mr-2 inline-block">
                          [{src.globalIndex}]
                        </span>
                        <span className="font-serif leading-relaxed text-paper/90 font-medium">
                          {src.title}
                        </span>
                        {src.citation && (
                          <span className="font-sans text-[9px] tracking-wider uppercase ml-2 text-paper/50 bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-sm inline-block">
                            {src.citation}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 mt-1 sm:mt-0 self-end sm:self-start">
                        {/* Copy citation button */}
                        <button
                          type="button"
                          onClick={() => handleCopySource(src, src.globalIndex)}
                          className="opacity-60 group-hover:opacity-100 text-paper/50 hover:text-paper font-sans text-[9px] uppercase tracking-wider flex items-center gap-1 p-1 rounded hover:bg-paper/10 transition-all cursor-pointer"
                          title="Copy citation reference"
                        >
                          {isCopied ? (
                            <>
                              <Check size={10} className="text-green-400" />
                              <span className="text-green-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* Access Record Link */}
                        {src.url && (
                          <a 
                            href={src.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-blood/15 hover:bg-blood/30 border border-blood/30 text-blood-light hover:text-paper font-sans text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm flex items-center gap-1 transition-colors"
                          >
                            <span>Access Record</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
