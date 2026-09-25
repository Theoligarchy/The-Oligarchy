import React, { useState, useMemo } from 'react';
import { Article } from '../types';
import { 
  Image as ImageIcon, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Filter, 
  Trash2, 
  FileText,
  Sparkles,
  CheckCircle2,
  Info
} from 'lucide-react';

export interface MediaAsset {
  id: string;
  url: string;
  title: string;
  altText?: string;
  category?: string;
  addedAt: number;
}

interface MediaLibraryProps {
  articles: Article[];
  onSelectImage?: (url: string) => void;
  selectedImageUrl?: string;
}

const DEFAULT_STATIC_ASSETS: MediaAsset[] = [
  {
    id: 'static-logo-highres',
    url: '/logo_highres.png',
    title: 'The Oligarchy High-Resolution Logo',
    altText: 'The Oligarchy Official Crest & Typography',
    category: 'branding',
    addedAt: 1704067200000
  },
  {
    id: 'static-favicon-512',
    url: '/favicon-512x512.png',
    title: 'The Oligarchy Emblem Monogram',
    altText: 'The Oligarchy Monogram Icon',
    category: 'branding',
    addedAt: 1704067200000
  }
];

export default function MediaLibrary({
  articles,
  onSelectImage,
  selectedImageUrl
}: MediaLibraryProps) {
  // Custom uploaded/added assets from local storage
  const [customAssets, setCustomAssets] = useState<MediaAsset[]>(() => {
    try {
      const saved = localStorage.getItem('tol_custom_media_assets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'article_covers' | 'branding' | 'custom'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Asset Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAltText, setNewAltText] = useState('');
  const [newCategory, setNewCategory] = useState<'custom' | 'article_covers' | 'branding'>('article_covers');
  const [formError, setFormError] = useState<string | null>(null);

  // Derive unique image URLs used across all articles
  const articleCoverAssets = useMemo<MediaAsset[]>(() => {
    const assetsMap = new Map<string, MediaAsset>();

    articles.forEach(art => {
      if (art.featuredImage && art.featuredImage.trim()) {
        const url = art.featuredImage.trim();
        if (!assetsMap.has(url)) {
          assetsMap.set(url, {
            id: `art-cover-${art.id}`,
            url,
            title: `Cover: ${art.title}`,
            altText: art.title,
            category: 'article_covers',
            addedAt: art.createdAt || Date.now()
          });
        }
      }
    });

    return Array.from(assetsMap.values());
  }, [articles]);

  // Combine all assets
  const allMediaAssets = useMemo<MediaAsset[]>(() => {
    return [...articleCoverAssets, ...customAssets, ...DEFAULT_STATIC_ASSETS];
  }, [articleCoverAssets, customAssets]);

  // Calculate article usage for any given image URL
  const getArticlesUsingImage = (url: string) => {
    return articles.filter(a => a.featuredImage && a.featuredImage.trim() === url.trim());
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      setFormError('Image URL is required.');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('Asset title is required.');
      return;
    }

    const newAsset: MediaAsset = {
      id: `custom-${Date.now()}`,
      url: newUrl.trim(),
      title: newTitle.trim(),
      altText: newAltText.trim() || newTitle.trim(),
      category: newCategory,
      addedAt: Date.now()
    };

    const updated = [newAsset, ...customAssets];
    setCustomAssets(updated);
    try {
      localStorage.setItem('tol_custom_media_assets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setNewUrl('');
    setNewTitle('');
    setNewAltText('');
    setFormError(null);
    setShowAddModal(false);
  };

  const handleDeleteCustomAsset = (id: string) => {
    const updated = customAssets.filter(a => a.id !== id);
    setCustomAssets(updated);
    try {
      localStorage.setItem('tol_custom_media_assets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Assets
  const filteredAssets = allMediaAssets.filter(asset => {
    if (categoryFilter !== 'all' && asset.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        asset.title.toLowerCase().includes(q) ||
        asset.url.toLowerCase().includes(q) ||
        (asset.altText && asset.altText.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 fade-in select-text">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ink via-navy to-ink border border-paper/10 p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-xs flex items-center gap-1">
              <ImageIcon size={10} />
              Editorial Media Repository
            </span>
            <span className="font-mono text-[9px] text-paper/40">
              {allMediaAssets.length} Assets Cataloged
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-paper">
            Media Library &amp; Cover Imagery
          </h2>
          <p className="font-serif text-xs text-paper/50 mt-0.5 max-w-2xl leading-relaxed">
            Central repository of editorial cover photos, visual figures, and branding assets. Copy URLs directly to clipboard or apply them to article drafts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blood hover:bg-blood/90 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-sm flex items-center gap-2 cursor-pointer shadow-md transition-all border border-blood/50"
          >
            <Plus size={13} />
            Add Image Asset
          </button>
        </div>
      </div>

      {/* Recommended Standards Callout */}
      <div className="bg-navy/70 border border-paper/10 p-3.5 rounded-sm flex items-start gap-3 text-xs font-serif text-paper/60">
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-sans text-[9px] uppercase tracking-wider text-amber-300 block mb-0.5">
            Recommended Editorial Image Standards:
          </strong>
          Article cover images should ideally be <strong className="text-paper">1200 × 630 px</strong> (16:9 or 1.91:1 aspect ratio) in WebP, JPEG, or PNG format for optimal social cards (OpenGraph / Twitter) and rapid CDN delivery.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-ink border border-paper/10 p-3 rounded-sm">
        <div className="relative w-full sm:w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40" />
          <input
            type="text"
            placeholder="Search by title, url, alt text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-midnight border border-paper/10 rounded-xs pl-9 pr-3 py-1.5 text-xs text-paper font-serif focus:outline-none focus:border-blood"
          />
        </div>

        <div className="flex items-center gap-1 bg-midnight border border-paper/10 p-0.5 rounded-xs self-end sm:self-auto">
          {(['all', 'article_covers', 'branding', 'custom'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`font-sans text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                categoryFilter === cat ? 'bg-blood text-paper font-bold' : 'text-paper/50 hover:text-paper'
              }`}
            >
              {cat === 'all' ? 'All' : cat === 'article_covers' ? 'Article Covers' : cat === 'branding' ? 'Branding' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Media Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="p-12 text-center bg-navy/30 border border-paper/10 rounded-sm flex flex-col items-center gap-3">
          <ImageIcon size={32} className="text-paper/20" />
          <h3 className="font-display text-base font-bold text-paper/80">No Media Assets Found</h3>
          <p className="font-serif text-xs text-paper/50 max-w-md">
            No image assets match the selected filter or search term. Add an image asset using the button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map(asset => {
            const usedArticles = getArticlesUsingImage(asset.url);
            const isSelected = selectedImageUrl && selectedImageUrl === asset.url;

            return (
              <div 
                key={asset.id} 
                className={`bg-navy border rounded-sm overflow-hidden flex flex-col justify-between transition-all group ${
                  isSelected ? 'border-blood ring-1 ring-blood' : 'border-paper/10 hover:border-paper/30'
                }`}
              >
                {/* Image Preview Container */}
                <div className="relative aspect-video bg-ink overflow-hidden border-b border-paper/10 flex items-center justify-center">
                  <img
                    src={asset.url}
                    alt={asset.altText || asset.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/favicon-512x512.png';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-black/75 hover:bg-black text-paper rounded-xs text-xs backdrop-blur-xs cursor-pointer"
                      title="Open full image in new tab"
                    >
                      <ExternalLink size={11} />
                    </a>
                    {asset.id.startsWith('custom-') && (
                      <button
                        onClick={() => handleDeleteCustomAsset(asset.id)}
                        className="p-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-xs text-xs backdrop-blur-xs cursor-pointer"
                        title="Delete custom asset"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  {usedArticles.length > 0 && (
                    <span className="absolute bottom-2 left-2 font-sans text-[8px] font-bold uppercase tracking-wider bg-black/80 text-paper/90 px-1.5 py-0.5 rounded-xs border border-white/10 backdrop-blur-xs">
                      Used in {usedArticles.length} {usedArticles.length === 1 ? 'Article' : 'Articles'}
                    </span>
                  )}
                </div>

                {/* Details Container */}
                <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                  <div>
                    <h4 className="font-display text-xs font-bold text-paper line-clamp-1" title={asset.title}>
                      {asset.title}
                    </h4>
                    <p className="font-mono text-[9px] text-paper/40 truncate mt-0.5" title={asset.url}>
                      {asset.url}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-paper/5 flex items-center justify-between gap-2 mt-auto">
                    <button
                      onClick={() => handleCopyUrl(asset.url, asset.id)}
                      className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-xs border flex items-center gap-1 cursor-pointer transition-colors ${
                        copiedId === asset.id 
                          ? 'bg-green-950/40 text-green-300 border-green-500/50' 
                          : 'bg-paper/5 text-paper/60 border-paper/10 hover:text-paper hover:bg-paper/10'
                      }`}
                      title="Copy URL to clipboard"
                    >
                      {copiedId === asset.id ? (
                        <>
                          <Check size={10} className="text-green-300" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={10} /> Copy URL
                        </>
                      )}
                    </button>

                    {onSelectImage && (
                      <button
                        onClick={() => onSelectImage(asset.url)}
                        className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-blood text-paper' 
                            : 'bg-blood/20 text-blood hover:bg-blood hover:text-paper'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Use Cover'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Media Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ink border border-paper/20 rounded-sm w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-paper/10 pb-3">
              <h3 className="font-display text-lg font-bold text-paper">
                Add Image Asset to Repository
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                }}
                className="text-paper/40 hover:text-paper text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="flex flex-col gap-3.5">
              {formError && (
                <div className="p-2.5 bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-serif rounded-xs">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                  Image Direct URL *
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or /path.jpg"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="bg-midnight border border-paper/15 rounded-xs p-2 text-xs text-paper font-mono focus:outline-none focus:border-blood"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                  Asset Title / Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Behavioral Psyche Editorial Banner"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-midnight border border-paper/15 rounded-xs p-2 text-xs text-paper font-serif focus:outline-none focus:border-blood"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                  Alt Text (Screen Readers &amp; SEO)
                </label>
                <input
                  type="text"
                  placeholder="Description for accessibility..."
                  value={newAltText}
                  onChange={(e) => setNewAltText(e.target.value)}
                  className="bg-midnight border border-paper/15 rounded-xs p-2 text-xs text-paper font-serif focus:outline-none focus:border-blood"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="bg-midnight border border-paper/15 rounded-xs p-2 text-xs text-paper font-serif focus:outline-none focus:border-blood cursor-pointer"
                >
                  <option value="article_covers">Article Cover</option>
                  <option value="branding">Branding / Icon</option>
                  <option value="custom">Research Figure / General</option>
                </select>
              </div>

              {newUrl && (
                <div className="mt-1 p-2 bg-midnight/80 border border-paper/10 rounded-xs flex items-center gap-3">
                  <img
                    src={newUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-xs border border-paper/10 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="font-serif text-[11px] text-paper/60 italic">Live URL preview thumbnail</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper/10 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="font-sans text-[9px] uppercase tracking-wider px-3 py-2 text-paper/50 hover:text-paper cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blood hover:bg-blood/90 text-paper font-sans text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xs cursor-pointer"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
