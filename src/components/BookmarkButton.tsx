import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Article } from '../types';

interface BookmarkButtonProps {
  article: Article;
  isSaved: boolean;
  onToggleSave: (article: Article) => void;
  variant?: 'icon' | 'badge' | 'button' | 'compact';
  className?: string;
  showLabel?: boolean;
}

export default function BookmarkButton({
  article,
  isSaved,
  onToggleSave,
  variant = 'icon',
  className = '',
  showLabel = false
}: BookmarkButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleSave(article);
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        className={`font-sans text-[10px] font-bold tracking-widest uppercase py-3 px-5 rounded-sm flex items-center gap-2 transition-all cursor-pointer select-none ${
          isSaved
            ? 'bg-blood/20 text-blood-light border border-blood/50 hover:bg-blood/30'
            : 'bg-navy border border-paper/20 hover:border-blood text-paper/80 hover:text-paper hover:bg-paper/5'
        } ${className}`}
        title={isSaved ? 'Remove from Saved Reading List' : 'Save Paper to Reading List'}
      >
        {isSaved ? (
          <>
            <BookmarkCheck size={14} className="text-blood-light" />
            Saved to Reading List
          </>
        ) : (
          <>
            <Bookmark size={14} />
            Save to Reading List
          </>
        )}
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        onClick={handleClick}
        className={`font-sans text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-sm border flex items-center gap-1.5 transition-all cursor-pointer ${
          isSaved
            ? 'bg-blood/20 text-blood-light border-blood/40 hover:bg-blood/30'
            : 'bg-paper/5 text-paper/60 border-paper/10 hover:border-blood/50 hover:text-paper'
        } ${className}`}
        title={isSaved ? 'Remove from Saved Reading List' : 'Save to Reading List'}
      >
        {isSaved ? (
          <>
            <BookmarkCheck size={12} className="text-blood-light" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Bookmark size={12} />
            {showLabel && <span>Save</span>}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-sm transition-all cursor-pointer flex items-center justify-center ${
        isSaved
          ? 'text-blood hover:text-blood-light bg-blood/10 border border-blood/30'
          : 'text-paper/40 hover:text-paper hover:bg-paper/10 border border-transparent hover:border-paper/10'
      } ${className}`}
      title={isSaved ? 'Remove from Saved Reading List' : 'Save Paper to Reading List'}
      aria-label={isSaved ? 'Remove from Saved Reading List' : 'Save Paper to Reading List'}
    >
      {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
      {showLabel && (
        <span className="font-sans text-[10px] font-bold tracking-widest uppercase ml-1.5">
          {isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
}
