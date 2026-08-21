import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon | React.ComponentType<{ size?: number | string; className?: string }>;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ size?: number | string; className?: string }> | React.ReactNode;
  badge?: string;
  title: string;
  description?: string | React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  hints?: string[];
  variant?: 'card' | 'inline' | 'table-cell' | 'minimal';
  colSpan?: number;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: IconComponent,
  badge,
  title,
  description,
  action,
  secondaryAction,
  hints,
  variant = 'card',
  colSpan = 5,
  className = ''
}) => {
  const isTableCell = variant === 'table-cell';

  const renderIcon = () => {
    if (!IconComponent) return null;

    // If it's a React element already
    if (React.isValidElement(IconComponent)) {
      return (
        <div className="w-14 h-14 rounded-full bg-paper/[0.03] border border-paper/10 flex items-center justify-center text-paper/40 mb-4 mx-auto shadow-inner">
          {IconComponent}
        </div>
      );
    }

    // If it's a component
    const Icon = IconComponent as React.ComponentType<{ size?: number | string; className?: string }>;
    return (
      <div className="w-14 h-14 rounded-full bg-paper/[0.03] border border-paper/10 flex items-center justify-center text-paper/35 mb-4 mx-auto shadow-inner group-hover:border-blood/40 group-hover:text-blood transition-colors">
        <Icon size={26} className="text-paper/40" />
      </div>
    );
  };

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-text ${
      variant === 'minimal' ? 'py-6 px-4' : 'py-12 px-6'
    } ${className}`}>
      {renderIcon()}

      {badge && (
        <span className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase bg-blood/10 border border-blood/30 px-2.5 py-0.5 rounded-xs mb-2.5 inline-block">
          {badge}
        </span>
      )}

      <h3 className="font-display text-lg md:text-xl font-bold text-paper/90 tracking-wide mb-1.5">
        {title}
      </h3>

      {description && (
        <div className="font-serif text-xs md:text-sm text-paper/55 max-w-md mx-auto leading-relaxed">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
      )}

      {hints && hints.length > 0 && (
        <div className="mt-4 p-3 bg-midnight/80 border border-paper/10 rounded-xs max-w-md w-full text-left font-serif text-xs text-paper/60 space-y-1.5 shadow-sm">
          <div className="font-sans text-[8px] font-bold tracking-widest uppercase text-paper/30 mb-1">
            Guidance &amp; System Protocol
          </div>
          {hints.map((hint, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] leading-snug">
              <span className="text-blood font-mono text-[10px] mt-0.5">•</span>
              <span>{hint}</span>
            </div>
          ))}
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 px-5 rounded-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
                action.variant === 'secondary'
                  ? 'bg-navy hover:bg-navy/80 text-paper border border-paper/20 hover:border-paper/40'
                  : action.variant === 'outline'
                  ? 'bg-transparent hover:bg-paper/5 text-paper/80 border border-paper/20 hover:border-paper/40'
                  : 'bg-blood hover:bg-blood-light text-paper border border-blood/60 shadow-blood/20'
              }`}
            >
              {action.icon && React.createElement(action.icon, { size: 12 })}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="bg-transparent hover:bg-paper/5 border border-paper/15 hover:border-paper/30 text-paper/70 hover:text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-xs transition-all cursor-pointer flex items-center gap-2"
            >
              {secondaryAction.icon && React.createElement(secondaryAction.icon, { size: 12 })}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (isTableCell) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0 border-none">
          <div className="bg-navy/20 border-b border-paper/10">
            {content}
          </div>
        </td>
      </tr>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-gradient-to-b from-navy/30 via-ink/40 to-navy/20 border border-paper/10 rounded-sm shadow-sm">
        {content}
      </div>
    );
  }

  return content;
};
