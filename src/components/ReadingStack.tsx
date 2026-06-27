import React from 'react';
import { ReadingItem } from '../types';

interface ReadingStackProps {
  items: ReadingItem[];
}

export default function ReadingStack({ items }: ReadingStackProps) {
  return (
    <div className="bg-navy border border-paper/10 overflow-hidden rounded-sm transition-all duration-300">
      <div className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-paper bg-blood py-2 px-4 border-b border-paper/10">
        📚 Currently Reading
      </div>
      <div className="p-4 flex flex-col divide-y divide-paper/10">
        {items.length === 0 ? (
          <p className="font-serif italic text-xs text-paper/30 py-2">
            No items in reading list currently. Add books from Admin panel.
          </p>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex gap-3.5 items-start select-text">
              <span className="font-sans text-[11px] font-bold text-blood leading-none">
                {String(index + 1).padStart(2, '0')}.
              </span>
              <div>
                <h5 className="font-display text-sm font-semibold text-paper/90 leading-tight">
                  {item.title}
                </h5>
                <p className="font-sans text-[9px] tracking-wider uppercase text-paper/35 mt-1">
                  {item.author}
                </p>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-[10px] text-blood hover:text-blood-light hover:underline mt-1 inline-block transition-colors"
                  >
                    Review/Reference &rarr;
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
