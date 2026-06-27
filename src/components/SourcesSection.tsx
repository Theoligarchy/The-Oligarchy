import { Source } from '../types';
import { ExternalLink, FileText, BookOpen, Scale, Database, Shield } from 'lucide-react';

interface SourcesSectionProps {
  sources: Source[];
}

export default function SourcesSection({ sources }: SourcesSectionProps) {
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
        return { label: 'Referenced Materials & Sources', icon: <FileText size={13} className="text-paper/40" /> };
    }
  };

  // Group sources by category for cleaner research indexing
  const groupedSources = sources.reduce((acc, src) => {
    const cat = src.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(src);
    return acc;
  }, {} as Record<string, Source[]>);

  return (
    <div className="mt-12 pt-8 border-t border-paper/10 select-text">
      <h3 className="font-display text-lg font-bold text-paper/95 mb-6 tracking-wide uppercase text-blood/90">
        References &amp; Secondary Materials
      </h3>
      
      <div className="flex flex-col gap-6">
        {Object.entries(groupedSources).map(([catId, catSources]) => {
          const { label, icon } = getCategoryDetails(catId);
          return (
            <div key={catId} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-sans text-[10px] font-bold tracking-wider uppercase text-paper/40 border-b border-paper/5 pb-1.5">
                {icon}
                {label}
              </div>
              <ul className="flex flex-col gap-3 font-serif text-sm">
                {catSources.map((src, index) => (
                  <li key={index} className="pl-4 border-l border-paper/10 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-paper/60 hover:text-paper transition-colors">
                    <div>
                      <span className="font-sans text-[10px] font-bold text-blood/50 mr-2">
                        [{index + 1}]
                      </span>
                      {src.title}
                      {src.citation && (
                        <span className="font-sans text-[9px] tracking-wider uppercase ml-2 text-paper/30 bg-paper/5 border border-paper/5 px-1.5 py-0.5 rounded-sm">
                          {src.citation}
                        </span>
                      )}
                    </div>
                    {src.url && (
                      <a 
                        href={src.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blood hover:text-blood-light hover:underline font-sans text-[10px] uppercase tracking-widest flex items-center gap-1 shrink-0 mt-1 sm:mt-0 transition-colors"
                      >
                        Access Record <ExternalLink size={10} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
