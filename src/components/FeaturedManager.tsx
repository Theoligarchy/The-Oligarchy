import React, { useState } from 'react';
import { Article } from '../types';
import { Star, Plus, Trash2, Check, ArrowRight, Eye, ShieldCheck } from 'lucide-react';

interface FeaturedManagerProps {
  articles: Article[];
  onSetFeaturedOrder: (articleId: string, order: number | null) => Promise<void>;
  onPreviewArticle: (article: Article) => void;
}

export default function FeaturedManager({
  articles,
  onSetFeaturedOrder,
  onPreviewArticle
}: FeaturedManagerProps) {
  const publishedArticles = articles.filter(a => a.status === 'published');
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const SLOTS = [
    { num: 1, label: 'Slot 1 · Left Feature', desc: 'First card in homepage horizontal showcase' },
    { num: 2, label: 'Slot 2 · Center Feature', desc: 'Central focal point in homepage showcase' },
    { num: 3, label: 'Slot 3 · Right Feature', desc: 'Third card in homepage showcase' },
    { num: 4, label: 'Slot 4 · Secondary Feature', desc: 'Lead reserve item in research archive' }
  ];

  const handleAssign = async (slotNum: number, articleId: string) => {
    setIsUpdating(true);
    try {
      await onSetFeaturedOrder(articleId, slotNum);
      setSelectedSlotForAssignment(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnassign = async (articleId: string) => {
    setIsUpdating(true);
    try {
      await onSetFeaturedOrder(articleId, null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 fade-in select-text">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ink via-navy to-ink border border-paper/10 p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase bg-blood/10 border border-blood/30 px-2 py-0.5 rounded-xs flex items-center gap-1">
              <Star size={10} className="text-blood fill-blood" />
              Homepage Editorial Showcase
            </span>
            <span className="font-mono text-[9px] text-paper/40">
              3 Equal-Weight Primary Cards
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-paper">
            Featured Research Configuration
          </h2>
          <p className="font-serif text-xs text-paper/50 mt-0.5 max-w-2xl leading-relaxed">
            Curate the 3 leading investigative treatises that greet readers at the top of The Oligarchy homepage. Assign, re-order, or swap featured slots instantly.
          </p>
        </div>
      </div>

      {/* 4 Feature Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SLOTS.map((slot) => {
          const assignedArticle = articles.find(a => a.isFeatured && a.featuredOrder === slot.num);

          return (
            <div 
              key={slot.num}
              className={`bg-navy border rounded-sm p-4 flex flex-col justify-between transition-all ${
                assignedArticle ? 'border-paper/20 shadow-md' : 'border-dashed border-paper/15 bg-navy/40'
              }`}
            >
              <div>
                {/* Slot Header */}
                <div className="flex items-center justify-between pb-2 border-b border-paper/10 mb-3">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-blood flex items-center gap-1">
                    <Star size={11} className={assignedArticle ? "fill-blood text-blood" : "text-blood"} />
                    Slot {slot.num}
                  </span>
                  {assignedArticle && (
                    <button
                      onClick={() => handleUnassign(assignedArticle.id)}
                      disabled={isUpdating}
                      className="font-sans text-[9px] text-red-400 hover:text-red-300 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      title="Unassign article from this slot"
                    >
                      Unassign
                    </button>
                  )}
                </div>

                <span className="font-serif text-[10px] text-paper/40 block mb-3">
                  {slot.desc}
                </span>

                {/* Assigned Article Card */}
                {assignedArticle ? (
                  <div className="space-y-2.5">
                    {assignedArticle.featuredImage && (
                      <div className="aspect-video w-full rounded-xs overflow-hidden bg-ink border border-paper/10">
                        <img
                          src={assignedArticle.featuredImage}
                          alt={assignedArticle.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-blood bg-blood/10 px-1.5 py-0.2 rounded-xs">
                      {assignedArticle.category}
                    </span>
                    <h4 className="font-display text-sm font-bold text-paper line-clamp-2">
                      {assignedArticle.title}
                    </h4>
                    <p className="font-serif text-[10px] text-paper/50">
                      By {assignedArticle.authorName || 'Priyasha Priyal Jena'}
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <Star size={24} className="text-paper/20" />
                    <span className="font-serif text-xs text-paper/40 italic">
                      Slot currently empty
                    </span>
                  </div>
                )}
              </div>

              {/* Slot Actions */}
              <div className="pt-3 border-t border-paper/5 mt-4 flex items-center justify-between gap-2">
                {assignedArticle ? (
                  <button
                    onClick={() => onPreviewArticle(assignedArticle)}
                    className="font-sans text-[9px] uppercase tracking-wider text-paper/50 hover:text-paper flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={11} /> Preview
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedSlotForAssignment(selectedSlotForAssignment === slot.num ? null : slot.num)}
                  disabled={isUpdating}
                  className="font-sans text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper rounded-xs cursor-pointer ml-auto transition-colors"
                >
                  {assignedArticle ? 'Change Article' : '+ Assign Article'}
                </button>
              </div>

              {/* In-Slot Article Selector Dropdown */}
              {selectedSlotForAssignment === slot.num && (
                <div className="mt-3 pt-3 border-t border-blood/30 space-y-2">
                  <span className="font-sans text-[8px] uppercase tracking-wider text-paper/50 font-bold block">
                    Choose published article:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {publishedArticles.length === 0 ? (
                      <span className="font-serif text-[10px] text-paper/40 italic block p-2">
                        No published articles available.
                      </span>
                    ) : (
                      publishedArticles.map(art => (
                        <button
                          key={art.id}
                          onClick={() => handleAssign(slot.num, art.id)}
                          className="w-full text-left p-1.5 rounded-xs hover:bg-paper/10 font-serif text-[11px] text-paper/80 truncate block transition-colors cursor-pointer"
                          title={art.title}
                        >
                          <span className="capitalize text-blood font-sans text-[9px] mr-1">[{art.category}]</span>
                          {art.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
