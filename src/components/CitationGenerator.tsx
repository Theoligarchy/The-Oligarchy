import React, { useState } from 'react';
import { 
  Quote, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  BookOpen, 
  ShieldCheck, 
  ExternalLink, 
  Share2, 
  Layers,
  Sparkles,
  Award
} from 'lucide-react';
import { Article } from '../types';
import { 
  generateAPACitation, 
  generateChicagoCitation, 
  generateMLACitation, 
  generateHarvardCitation, 
  generateBibTeXCitation, 
  generateRISCitation, 
  downloadBibTeXFile, 
  downloadRISFile,
  getArticleAuthors,
  getArticleArchivalId,
  getArticleCanonicalUrl,
  getOrcidUrl,
  normalizeOrcid
} from '../utils/citationEngine';

interface CitationGeneratorProps {
  article: Article;
  onAuthorClick?: (authorName: string, authorId?: string) => void;
}

type CitationFormat = 'apa' | 'chicago' | 'mla' | 'harvard' | 'bibtex' | 'ris';

export default function CitationGenerator({ article, onAuthorClick }: CitationGeneratorProps) {
  const [activeFormat, setActiveFormat] = useState<CitationFormat>('apa');
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const authors = getArticleAuthors(article);
  const archivalId = getArticleArchivalId(article);
  const canonicalUrl = getArticleCanonicalUrl(article);

  // Compute active formatted text
  const getFormattedCitation = (): string => {
    switch (activeFormat) {
      case 'apa':
        return generateAPACitation(article);
      case 'chicago':
        return generateChicagoCitation(article);
      case 'mla':
        return generateMLACitation(article);
      case 'harvard':
        return generateHarvardCitation(article);
      case 'bibtex':
        return generateBibTeXCitation(article);
      case 'ris':
        return generateRISCitation(article);
      default:
        return generateAPACitation(article);
    }
  };

  const currentCitationText = getFormattedCitation();

  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(currentCitationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy citation:', err);
    }
  };

  const handleCopyArchivalId = async () => {
    try {
      await navigator.clipboard.writeText(archivalId);
      setCopiedKey('archival');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPermanentUrl = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopiedKey('url');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      id="scholarly-citation-generator" 
      className="border border-paper/15 rounded-sm bg-[#090909] p-5 sm:p-7 shadow-xl select-text relative overflow-hidden"
    >
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blood/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-paper/10 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-blood/15 border border-blood/40 flex items-center justify-center text-blood shrink-0 mt-0.5">
            <Quote size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase text-blood bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-xs">
                Citation Index
              </span>
              <span className="font-mono text-[9px] text-paper/40 uppercase tracking-wider">
                Automated Reference Generator
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-paper tracking-tight">
              Cite This Investigation
            </h3>
            <p className="font-serif text-xs text-paper/50 italic mt-0.5">
              Standardized bibliographic records for researchers, criminologists, and university citations.
            </p>
          </div>
        </div>

        {/* Archival Reference Tag */}
        <div className="flex flex-wrap sm:flex-col sm:items-end gap-1 text-right">
          <div className="flex items-center gap-1.5 bg-paper/5 border border-paper/10 px-2.5 py-1 rounded-sm">
            <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40">Archival Ref:</span>
            <span className="font-mono text-[10px] font-semibold text-paper/90">{archivalId}</span>
            <button
              onClick={handleCopyArchivalId}
              className="text-paper/40 hover:text-blood transition-colors ml-1 cursor-pointer"
              title="Copy Archival Reference ID"
            >
              {copiedKey === 'archival' ? <Check size={11} className="text-blood-light" /> : <Copy size={11} />}
            </button>
          </div>
          <button
            onClick={handleCopyPermanentUrl}
            className="font-sans text-[8px] tracking-wider uppercase text-paper/40 hover:text-blood transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === 'url' ? '✓ Link Copied' : 'Permanent Canonical Link →'}
          </button>
        </div>
      </div>

      {/* Format Switcher Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 mb-4 border-b border-paper/5">
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'apa', label: 'APA 7th', badge: 'Standard' },
            { id: 'chicago', label: 'Chicago 17th', badge: 'History/Soc' },
            { id: 'mla', label: 'MLA 9th', badge: 'Humanities' },
            { id: 'harvard', label: 'Harvard', badge: 'UK/AU' },
            { id: 'bibtex', label: 'BibTeX', badge: 'LaTeX' },
            { id: 'ris', label: 'RIS', badge: 'Zotero' }
          ].map((fmt) => {
            const isActive = activeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setActiveFormat(fmt.id as CitationFormat)}
                className={`px-3 py-2 rounded-xs font-sans text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-blood text-paper shadow-md border border-blood-light/50'
                    : 'bg-navy/60 hover:bg-navy text-paper/60 hover:text-paper border border-paper/10'
                }`}
              >
                <span>{fmt.label}</span>
                <span className={`text-[8px] opacity-70 ${isActive ? 'text-paper' : 'text-paper/40'}`}>
                  ({fmt.badge})
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick format downloads */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => downloadBibTeXFile(article)}
            className="px-2.5 py-1.5 rounded-xs bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/70 hover:text-paper font-sans text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 transition-colors cursor-pointer"
            title="Download BibTeX (.bib) file for LaTeX / Overleaf"
          >
            <Download size={10} />
            <span>.BIB</span>
          </button>
          <button
            onClick={() => downloadRISFile(article)}
            className="px-2.5 py-1.5 rounded-xs bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/70 hover:text-paper font-sans text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 transition-colors cursor-pointer"
            title="Download RIS (.ris) file for Zotero / Mendeley / EndNote"
          >
            <Download size={10} />
            <span>.RIS</span>
          </button>
        </div>
      </div>

      {/* Formatted Citation Display Box */}
      <div className="relative group">
        <div className={`p-4 sm:p-5 rounded-sm border border-paper/15 transition-all ${
          activeFormat === 'bibtex' || activeFormat === 'ris'
            ? 'bg-[#050505] font-mono text-xs text-amber-200/90 leading-relaxed overflow-x-auto whitespace-pre'
            : 'bg-navy/40 font-serif text-sm md:text-[15px] text-paper/90 leading-relaxed'
        }`}>
          {currentCitationText}
        </div>

        {/* Floating Quick Copy on hover */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={handleCopyCitation}
            className={`px-3 py-1.5 rounded-xs font-sans text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
              copied
                ? 'bg-green-800 text-white border border-green-500'
                : 'bg-blood/90 hover:bg-blood text-paper border border-blood-light/40'
            }`}
          >
            {copied ? (
              <>
                <Check size={12} className="text-white" />
                <span>Citation Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy Citation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Footer & Direct Download Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-paper/10 text-xs">
        {/* Authors and ORCID Badges strip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
            Attributed Scholars:
          </span>
          {authors.map((auth, idx) => {
            const orcidUrl = getOrcidUrl(auth.orcid);
            const normalizedOrcidStr = normalizeOrcid(auth.orcid);
            return (
              <div 
                key={idx}
                className="inline-flex items-center gap-1.5 bg-paper/5 border border-paper/10 px-2 py-1 rounded-sm text-[11px]"
              >
                <button
                  onClick={() => onAuthorClick && onAuthorClick(auth.name, article.authorId)}
                  className="font-serif text-paper/90 hover:text-blood underline underline-offset-2 decoration-paper/20 hover:decoration-blood transition-colors cursor-pointer"
                >
                  {auth.name}
                </button>
                {auth.role && (
                  <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40">
                    ({auth.role})
                  </span>
                )}
                {orcidUrl && (
                  <a
                    href={orcidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#a6ce39] hover:text-[#b8e046] transition-colors ml-0.5 font-mono text-[9px] font-semibold"
                    title={`Verified ORCID Profile: ${normalizedOrcidStr}`}
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 256 256" fill="currentColor">
                      <path d="M128,0A128,128,0,1,0,256,128,128,128,0,0,0,128,0ZM86.37,186.25H60.08V73.49h26.29Zm-13.14-126a15.35,15.35,0,1,1,15.35-15.35A15.35,15.35,0,0,1,73.23,60.25Zm122.9,91.8c0,22.25-17.75,34.2-46.7,34.2H109.84V73.49h40.35c27.1,0,45.94,14.65,45.94,37.35,0,13.79-8.4,26.47-21.75,32.32C188.08,128.51,196.13,140.48,196.13,152.05Zm-26.65,0c0-12.87-9.5-20.7-25.55-20.7H133.72v41.4h10.21C159.98,172.75,169.48,164.92,169.48,152.05Zm-4.9-46.35c0-11.45-8.5-18.4-22.75-18.4H133.72v36.8h8.11C156.08,124.1,164.58,117.15,164.58,105.7Z"/>
                    </svg>
                    <span>ORCID</span>
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Export buttons for mobile */}
        <div className="flex md:hidden items-center gap-2 w-full pt-2">
          <button
            onClick={() => downloadBibTeXFile(article)}
            className="flex-1 py-2 rounded-xs bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/80 font-sans text-[9px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={11} />
            <span>Download .BIB</span>
          </button>
          <button
            onClick={() => downloadRISFile(article)}
            className="flex-1 py-2 rounded-xs bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/80 font-sans text-[9px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={11} />
            <span>Download .RIS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
