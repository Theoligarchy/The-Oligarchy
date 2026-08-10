import React, { useState } from 'react';
import { ReadingItem, SavedArticle, Article } from '../types';
import { Bookmark, BookOpen, Clock, Trash2, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

interface ReadingStackProps {
  items: ReadingItem[];
  savedArticles?: SavedArticle[];
  articles?: Article[];
  onOpenReadingList?: () => void;
  onSelectArticle?: (article: Article) => void;
  onRemoveSaved?: (articleId: string) => void;
}

export default function ReadingStack({ 
  items, 
  savedArticles = [], 
  articles = [],
  onOpenReadingList,
  onSelectArticle,
  onRemoveSaved
}: ReadingStackProps) {
  const [activeTab, setActiveTab] = useState<'saved' | 'curated'>('saved');

  const unreadCount = savedArticles.filter(a => !a.isRead).length;

  return (
    <div className="bg-navy border border-paper/10 overflow-hidden rounded-sm transition-all duration-300 shadow-xl">
      {/* Header with Dual Tabs */}
      <div className="bg-blood/90 border-b border-paper/10 flex items-center justify-between">
        <div className="flex w-full">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 font-sans text-[10px] font-bold tracking-wider uppercase py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r border-paper/10 ${
              activeTab === 'saved'
                ? 'bg-blood text-paper font-black'
                : 'bg-navy/60 text-paper/70 hover:text-paper hover:bg-navy/40'
            }`}
          >
            <Bookmark size={12} className={unreadCount > 0 ? 'text-paper' : ''} />
            Saved List ({savedArticles.length})
          </button>

          <button
            onClick={() => setActiveTab('curated')}
            className={`flex-1 font-sans text-[10px] font-bold tracking-wider uppercase py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'curated'
                ? 'bg-blood text-paper font-black'
                : 'bg-navy/60 text-paper/70 hover:text-paper hover:bg-navy/40'
            }`}
          >
            <BookOpen size={12} />
            Editor's Desk ({items.length})
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col">
        {activeTab === 'saved' ? (
          /* USER'S SAVED PAPERS */
          <div>
            {savedArticles.length === 0 ? (
              <div className="py-4 text-center">
                <p className="font-serif italic text-xs text-paper/40 mb-3">
                  No saved papers in your reading stack. Click the bookmark icon on any paper to save it across sessions.
                </p>
                {onOpenReadingList && (
                  <button
                    onClick={onOpenReadingList}
                    className="font-sans text-[9px] font-bold tracking-widest uppercase bg-blood/20 hover:bg-blood border border-blood/40 text-paper px-3 py-1.5 rounded-xs transition-colors cursor-pointer"
                  >
                    Open Saved Reading List &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {savedArticles.slice(0, 4).map((item, index) => {
                  const fullArticle = articles.find(a => a.id === item.articleId);

                  return (
                    <div 
                      key={item.id} 
                      className="group py-2.5 border-b border-paper/10 last:border-b-0 flex gap-3 items-start justify-between"
                    >
                      <div 
                        onClick={() => {
                          if (fullArticle && onSelectArticle) onSelectArticle(fullArticle);
                        }}
                        className="cursor-pointer flex-1 pr-2"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {item.isRead ? (
                            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Circle size={11} className="text-blood-light shrink-0" />
                          )}
                          <span className="font-sans text-[8px] font-bold tracking-widest uppercase text-paper/40">
                            {item.category}
                          </span>
                        </div>

                        <h5 className={`font-display text-xs font-bold leading-snug group-hover:text-blood-light transition-colors ${
                          item.isRead ? 'text-paper/50 line-through' : 'text-paper/90'
                        }`}>
                          {item.title}
                        </h5>

                        <div className="flex items-center gap-2 mt-1 font-sans text-[9px] text-paper/40">
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {item.readTime}
                          </span>
                          {item.personalNote && (
                            <span className="text-blood-light font-semibold">
                              • Note added
                            </span>
                          )}
                        </div>
                      </div>

                      {onRemoveSaved && (
                        <button
                          onClick={() => onRemoveSaved(item.articleId)}
                          className="text-paper/30 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                          title="Remove from saved stack"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Dashboard Link Footer */}
                {onOpenReadingList && (
                  <div className="pt-2 border-t border-paper/10 flex items-center justify-between">
                    <span className="font-sans text-[9px] font-semibold text-paper/40">
                      {unreadCount} unread / {savedArticles.length} total
                    </span>

                    <button
                      onClick={onOpenReadingList}
                      className="font-sans text-[9px] font-bold tracking-widest uppercase text-blood hover:text-blood-light flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      Dashboard &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* CURATED BOOKS / EDITOR'S DESK */
          <div className="divide-y divide-paper/10">
            {items.length === 0 ? (
              <p className="font-serif italic text-xs text-paper/30 py-2">
                No items in reading list currently. Add books from Admin panel.
              </p>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex gap-3 items-start select-text">
                  <span className="font-sans text-[10px] font-bold text-blood leading-none pt-0.5">
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <div>
                    <h5 className="font-display text-xs font-semibold text-paper/90 leading-tight">
                      {item.title}
                    </h5>
                    <p className="font-sans text-[9px] tracking-wider uppercase text-paper/35 mt-0.5">
                      {item.author}
                    </p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-serif text-[10px] text-blood hover:text-blood-light hover:underline mt-0.5 inline-block transition-colors"
                      >
                        Reference Link &rarr;
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
