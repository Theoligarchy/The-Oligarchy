import React, { useState } from 'react';
import { Article } from '../types';
import { Calendar, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ArticleScheduleModalProps {
  article: Article | null;
  onClose: () => void;
  onSaveSchedule: (articleId: string, scheduledTimestamp: number | null) => Promise<void>;
}

export default function ArticleScheduleModal({
  article,
  onClose,
  onSaveSchedule
}: ArticleScheduleModalProps) {
  if (!article) return null;

  // Initialize with existing scheduledAt or tomorrow 9 AM
  const getInitialDateTimeString = () => {
    if (article.scheduledAt) {
      const d = new Date(article.scheduledAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
  };

  const [dateTimeStr, setDateTimeStr] = useState(getInitialDateTimeString);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickPreset = (daysFromNow: number, hour: number = 9) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    target.setHours(hour, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setDateTimeStr(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTimeStr) {
      setError('Please select a publication date and time.');
      return;
    }

    const timestamp = new Date(dateTimeStr).getTime();
    if (isNaN(timestamp)) {
      setError('Invalid date format.');
      return;
    }

    if (timestamp <= Date.now()) {
      setError('Scheduled publication time must be in the future.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSaveSchedule(article.id, timestamp);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnschedule = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSaveSchedule(article.id, null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to revert schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-ink border border-paper/20 rounded-sm w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
        <div className="flex justify-between items-start border-b border-paper/10 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-400" />
            <h3 className="font-display text-lg font-bold text-paper">
              Schedule Publication
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-paper/40 hover:text-paper text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-navy p-3 rounded-xs border border-paper/10">
          <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40 block mb-0.5">
            Manuscript to Schedule
          </span>
          <h4 className="font-display text-xs font-bold text-paper truncate">
            {article.title}
          </h4>
          <span className="font-serif text-[10px] text-paper/50 block mt-0.5">
            Current Status: <strong className="capitalize text-paper/80">{article.status}</strong>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-2.5 bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-serif rounded-xs flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
              Release Date &amp; Time (Local)
            </label>
            <input
              type="datetime-local"
              value={dateTimeStr}
              onChange={(e) => {
                setDateTimeStr(e.target.value);
                setError(null);
              }}
              className="bg-midnight border border-paper/15 rounded-xs p-2.5 text-xs text-paper font-mono focus:outline-none focus:border-blood"
              required
            />
            <span className="font-sans text-[9px] text-paper/40">
              Publication will go live on this date and time automatically.
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[8px] uppercase tracking-wider text-paper/30 font-bold">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => handleQuickPreset(1, 9)}
              className="font-sans text-[9px] uppercase tracking-wider px-2 py-1 bg-paper/5 hover:bg-paper/10 border border-paper/10 text-paper/70 rounded-xs cursor-pointer"
            >
              Tomorrow 9am
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(3, 9)}
              className="font-sans text-[9px] uppercase tracking-wider px-2 py-1 bg-paper/5 hover:bg-paper/10 border border-paper/10 text-paper/70 rounded-xs cursor-pointer"
            >
              In 3 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(7, 9)}
              className="font-sans text-[9px] uppercase tracking-wider px-2 py-1 bg-paper/5 hover:bg-paper/10 border border-paper/10 text-paper/70 rounded-xs cursor-pointer"
            >
              In 1 Week
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-paper/10 mt-2">
            {article.status === 'scheduled' ? (
              <button
                type="button"
                onClick={handleUnschedule}
                disabled={isSubmitting}
                className="font-sans text-[9px] uppercase tracking-wider text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-50"
              >
                Revert to Draft
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="font-sans text-[9px] uppercase tracking-wider px-3 py-2 text-paper/50 hover:text-paper cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blood hover:bg-blood/90 text-paper font-sans text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
