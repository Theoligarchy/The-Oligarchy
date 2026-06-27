import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Send, ShieldAlert, Mail } from 'lucide-react';

export default function ContactSection() {
  const [subject, setSubject] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please provide the details of your submission.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const tipsCol = collection(db, 'tips');
      await addDoc(tipsCol, {
        subject: subject.trim() || 'General Inquiry / Tip',
        contact: contact.trim() || 'Anonymous',
        message: message.trim(),
        submittedAt: Date.now(),
        isRead: false
      });

      setSubject('');
      setContact('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 8000);
    } catch (err: any) {
      console.error('Error submitting tip:', err);
      setError('A database connection error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-midnight py-16 px-6 md:px-12 max-w-4xl mx-auto fade-in">
      {/* Upper Eyebrow label */}
      <div className="font-sans text-[10px] font-semibold tracking-[0.35em] uppercase text-blood mb-8 flex items-center gap-3">
        <span className="w-6 h-px bg-blood" />
        Secure Communications
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 select-text">
        {/* Left Column Information */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <h2 className="font-display text-3xl font-semibold italic text-paper leading-tight">
            Inquiries &amp; Tips
          </h2>
          <p className="font-serif text-sm text-paper/60 leading-relaxed">
            Have a specific topic, organizational case study, or systemic institutional incentive structure that warrants critical analysis? 
          </p>
          <p className="font-serif text-sm text-paper/60 leading-relaxed">
            We value primary documentation, academic leads, and public record pointers. Your communications through this panel can be completely anonymous.
          </p>

          <div className="bg-navy border border-paper/5 p-4 rounded-sm flex gap-3.5 items-start mt-4">
            <ShieldAlert size={18} className="text-blood flex-shrink-0 mt-0.5" />
            <div className="font-serif text-xs text-paper/40 leading-relaxed">
              <strong>Anonymity Guard:</strong> We do not capture IP addresses, session fingerprints, or browser locations on form submission. To maintain complete security, do not supply identifying details in optional fields.
            </div>
          </div>
        </div>

        {/* Right Column Form */}
        <div className="md:col-span-7">
          <form onSubmit={handleSubmit} className="bg-navy border border-paper/10 p-6 md:p-8 rounded-sm shadow-xl flex flex-col gap-5">
            <h3 className="font-display text-lg font-semibold text-paper/90 mb-2">
              Submit a Research Tip
            </h3>

            {success && (
              <div className="bg-green-950/20 border border-green-500/30 text-[#8bc4a8] font-serif text-sm p-4 rounded-sm">
                ✓ Thank you. Your research tip has been received and logged securely in our editorial system.
              </div>
            )}

            {error && (
              <div className="bg-red-950/20 border border-red-500/30 text-red-400 font-serif text-sm p-4 rounded-sm">
                ⚠ {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/45">
                  Subject or Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g., Financial corruption, Case study"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/45">
                  Contact Info (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Email, Signal handle (or blank)"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/45">
                Your Submission Details *
              </label>
              <textarea
                placeholder="Please describe the topic, angle, institutional structures, or information you possess..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-midnight border border-paper/10 rounded-sm py-2.5 px-3.5 text-paper font-serif focus:outline-none focus:border-blood text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blood hover:bg-blood-light disabled:bg-blood/40 text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-6 mt-2 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md rounded-sm"
            >
              <Send size={12} />
              {submitting ? 'Submitting secure tip...' : 'Submit Tip →'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
