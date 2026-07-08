import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MessageSquare, CheckCircle, ThumbsUp, Reply, ShieldAlert, Award, 
  Send, User, BookOpen, Filter, AlertCircle, HelpCircle, ArrowRight
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, doc, arrayUnion, increment 
} from 'firebase/firestore';
import { PeerAnnotation, PeerReply } from '../types';

interface MarginaliaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
  paragraphIndex: number; // -1 means general paper review, >=0 means specific paragraph
  paragraphText?: string;
  isAdminMode?: boolean;
}

export default function MarginaliaPanel({ 
  isOpen, 
  onClose, 
  articleId, 
  articleTitle, 
  paragraphIndex, 
  paragraphText,
  isAdminMode = false
}: MarginaliaPanelProps) {
  const [annotations, setAnnotations] = useState<PeerAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'verified'>('all');
  
  // Submission Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [content, setContent] = useState('');
  const [requestVerification, setRequestVerification] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Reply Form State
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyName, setReplyName] = useState('');
  const [replyTitle, setReplyTitle] = useState('');
  const [replyContent, setReplyContent] = useState('');

  // Fetch Annotations
  useEffect(() => {
    if (!articleId || !isOpen) return;

    setLoading(true);
    const annotationsRef = collection(db, 'peer_reviews');
    // Query reviews for this article and paragraph
    const q = query(
      annotationsRef,
      where('articleId', '==', articleId),
      where('paragraphIndex', '==', paragraphIndex),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PeerAnnotation[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as PeerAnnotation);
      });
      setAnnotations(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching peer reviews:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [articleId, paragraphIndex, isOpen]);

  // Submit Annotation
  const handleSubmitAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!name.trim() || !title.trim() || !content.trim()) {
      setFormError('Please complete all required fields (Name, Academic Credentials, and Content).');
      return;
    }

    try {
      const reviewsRef = collection(db, 'peer_reviews');
      const newAnnotation: Omit<PeerAnnotation, 'id'> = {
        articleId,
        paragraphIndex,
        selectedText: paragraphText || '',
        authorName: name.trim(),
        authorTitle: title.trim(),
        authorInstitution: institution.trim() || undefined,
        // If they ask for verification, we flag as false until admin reviews and toggles it.
        // We simulate academic self-designation or default validation.
        isVerifiedPeer: requestVerification ? false : false, 
        content: content.trim(),
        timestamp: Date.now(),
        likes: 0,
        replies: []
      };

      await addDoc(reviewsRef, newAnnotation);
      
      // Reset form
      setContent('');
      setFormSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error adding annotation:', err);
      setFormError(`Failed to save peer review: ${err.message}`);
    }
  };

  // Upvote/Endorse Annotation
  const handleLike = async (annotationId: string) => {
    try {
      const reviewDocRef = doc(db, 'peer_reviews', annotationId);
      await updateDoc(reviewDocRef, {
        likes: increment(1)
      });
    } catch (err) {
      console.error('Error upvoting peer review:', err);
    }
  };

  // Submit Reply
  const handleReplySubmit = async (e: React.FormEvent, annotationId: string) => {
    e.preventDefault();
    if (!replyName.trim() || !replyTitle.trim() || !replyContent.trim()) {
      return;
    }

    try {
      const reviewDocRef = doc(db, 'peer_reviews', annotationId);
      const newReply: PeerReply = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: replyName.trim(),
        authorTitle: replyTitle.trim(),
        isVerifiedPeer: false, // Default replies to unverified peer until reviewed
        content: replyContent.trim(),
        timestamp: Date.now()
      };

      await updateDoc(reviewDocRef, {
        replies: arrayUnion(newReply)
      });

      // Clear states
      setReplyingToId(null);
      setReplyName('');
      setReplyTitle('');
      setReplyContent('');
    } catch (err) {
      console.error('Error adding reply:', err);
    }
  };

  const filteredAnnotations = filterType === 'verified'
    ? annotations.filter(a => a.isVerifiedPeer)
    : annotations;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[990]"
          />

          {/* Slide-out Sidebar */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md md:max-w-lg bg-[#0c0c0c] border-l border-paper/10 shadow-2xl z-[991] flex flex-col h-screen overflow-hidden"
          >
            {/* Upper Header */}
            <div className="p-5 border-b border-paper/10 bg-midnight flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-blood" />
                <div>
                  <h3 className="font-display text-sm font-bold tracking-wider text-paper uppercase">
                    {paragraphIndex === -1 ? 'Debate Portal & Peer Reviews' : 'Marginalia Board'}
                  </h3>
                  <p className="font-sans text-[9px] uppercase tracking-widest text-paper/40">
                    {paragraphIndex === -1 ? 'General Paper Evaluations' : `Paragraph ${paragraphIndex + 1} Discourse`}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 text-paper/40 hover:text-paper hover:bg-paper/5 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Middle Scrollable Section */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Context / Excerpt Quote */}
              {paragraphText && paragraphIndex >= 0 && (
                <div className="border-l-2 border-blood bg-navy/30 p-3.5 rounded-sm select-text">
                  <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest block mb-1">REFERENCE EXCERPT</span>
                  <p className="font-serif text-xs text-paper/50 leading-relaxed italic line-clamp-4">
                    "{paragraphText.replace(/<[^>]*>/g, '')}"
                  </p>
                </div>
              )}

              {/* Filtering Controls */}
              <div className="flex items-center justify-between border-b border-paper/5 pb-3">
                <div className="flex items-center gap-1.5 text-paper/40 font-sans text-[10px] uppercase tracking-wider">
                  <Filter size={10} />
                  <span>Filter:</span>
                </div>
                <div className="flex bg-midnight p-0.5 rounded border border-paper/10">
                  <button 
                    onClick={() => setFilterType('all')}
                    className={`font-sans text-[9px] uppercase tracking-wider py-1 px-3 rounded-sm transition-colors cursor-pointer ${
                      filterType === 'all' 
                        ? 'bg-blood text-paper font-semibold' 
                        : 'text-paper/40 hover:text-paper/80'
                    }`}
                  >
                    All Discussion ({annotations.length})
                  </button>
                  <button 
                    onClick={() => setFilterType('verified')}
                    className={`font-sans text-[9px] uppercase tracking-wider py-1 px-3 rounded-sm transition-colors cursor-pointer flex items-center gap-1 ${
                      filterType === 'verified' 
                        ? 'bg-blood text-paper font-semibold' 
                        : 'text-paper/40 hover:text-paper/80'
                    }`}
                  >
                    <Award size={9} />
                    Verified Peers ({annotations.filter(a => a.isVerifiedPeer).length})
                  </button>
                </div>
              </div>

              {/* Form Toggler / Quick Information Banner */}
              {!showForm ? (
                <div className="bg-gradient-to-r from-blood/5 to-transparent border border-blood/10 p-4 rounded-sm flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-display text-xs font-semibold text-paper/95 mb-1">Contribute Academic Evaluation</h4>
                    <p className="font-serif text-[11px] text-paper/40 leading-relaxed">
                      We invite criminology researchers, criminal psychologists, and public policy analysts to submit peer reviews.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowForm(true)}
                    className="font-sans text-[9px] uppercase tracking-widest bg-blood hover:bg-blood-light text-paper py-2 px-3 rounded-sm font-bold shrink-0 transition-all cursor-pointer"
                  >
                    Add Note
                  </button>
                </div>
              ) : (
                /* Contributor Review Submission Form */
                <motion.form 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-midnight border border-paper/10 p-4 rounded-sm space-y-3"
                  onSubmit={handleSubmitAnnotation}
                >
                  <div className="flex items-center justify-between border-b border-paper/5 pb-2">
                    <span className="font-sans text-[9px] uppercase tracking-widest text-blood font-bold">New Peer Evaluation</span>
                    <button 
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-paper/40 hover:text-paper text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {formError && (
                    <div className="bg-red-950/20 border border-red-500/20 text-red-400 font-sans text-[10px] p-2.5 rounded flex items-center gap-1.5">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="bg-green-950/20 border border-green-500/20 text-green-400 font-sans text-[10px] p-2.5 rounded flex items-center gap-1.5">
                      <CheckCircle size={12} className="shrink-0" />
                      <span>Review submitted successfully! Pending verification check.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-sans text-[9px] uppercase tracking-widest text-paper/40 block mb-1">Scholar Name *</label>
                      <div className="relative">
                        <User size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-paper/30" />
                        <input 
                          type="text" 
                          placeholder="Dr. Priyasha Jena" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="bg-midnight/60 border border-paper/10 w-full rounded-sm py-1.5 pl-7 pr-2.5 font-sans text-xs text-paper focus:outline-none focus:border-blood"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-sans text-[9px] uppercase tracking-widest text-paper/40 block mb-1">Credentials / Role *</label>
                      <input 
                        type="text" 
                        placeholder="PhD, Forensic Psychology" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-midnight/60 border border-paper/10 w-full rounded-sm py-1.5 px-2.5 font-sans text-xs text-paper focus:outline-none focus:border-blood"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-sans text-[9px] uppercase tracking-widest text-paper/40 block mb-1">Affiliation / Institution</label>
                    <input 
                      type="text" 
                      placeholder="Tata Institute of Social Sciences (TISS)" 
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="bg-midnight/60 border border-paper/10 w-full rounded-sm py-1.5 px-2.5 font-sans text-xs text-paper focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div>
                    <label className="font-sans text-[9px] uppercase tracking-widest text-paper/40 block mb-1">Review Content *</label>
                    <textarea 
                      placeholder="Discuss scientific validity, provide data points, or request clarification on this section..." 
                      rows={3}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="bg-midnight/60 border border-paper/10 w-full rounded-sm py-1.5 px-2.5 font-serif text-xs text-paper focus:outline-none focus:border-blood resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={requestVerification}
                        onChange={(e) => setRequestVerification(e.target.checked)}
                        className="rounded border-paper/10 bg-midnight accent-blood h-3 w-3 text-blood cursor-pointer"
                      />
                      <span className="font-sans text-[9px] text-paper/45 uppercase tracking-wider flex items-center gap-1">
                        Request Peer-Review Verification 
                        <HelpCircle size={10} title="Mark review for Editorial board authentication to get verified badge" />
                      </span>
                    </label>
                    
                    <button 
                      type="submit"
                      className="bg-blood hover:bg-blood-light text-paper py-2 px-4 rounded-sm font-sans text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                    >
                      <span>Submit</span>
                      <Send size={8} />
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Main List of Annotations / Discussions */}
              {loading ? (
                <div className="py-12 text-center select-none flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-blood/20 border-t-blood rounded-full animate-spin" />
                  <span className="font-sans text-[10px] text-paper/30 uppercase tracking-widest">Loading reviews...</span>
                </div>
              ) : filteredAnnotations.length === 0 ? (
                <div className="py-12 text-center select-none border border-dashed border-paper/5 rounded p-6">
                  <MessageSquare size={24} className="mx-auto text-paper/15 mb-3" />
                  <h5 className="font-display text-xs font-semibold text-paper/50 mb-1">No Academic Discourse Yet</h5>
                  <p className="font-serif text-[11px] text-paper/35 leading-relaxed max-w-xs mx-auto">
                    Be the first to submit a peer evaluation or note on this section to stimulate healthy academic critique.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAnnotations.map((review) => (
                    <div 
                      key={review.id}
                      className="bg-navy/20 border border-paper/5 p-4 rounded-sm space-y-3 flex flex-col"
                    >
                      {/* Reviewer Meta Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-midnight border border-paper/10 flex items-center justify-center text-paper/60 font-sans text-xs font-bold shrink-0">
                            {review.authorName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-display text-xs font-bold text-paper">{review.authorName}</span>
                              {review.isVerifiedPeer ? (
                                <span className="bg-green-950/20 text-green-400 border border-green-900/30 font-sans text-[8px] font-bold uppercase py-0.5 px-1.5 rounded flex items-center gap-0.5 select-none" title="Editorial Verified Scholar">
                                  <Award size={8} /> Verified Peer
                                </span>
                              ) : (
                                <span className="bg-midnight border border-paper/10 text-paper/40 font-sans text-[7px] font-semibold uppercase py-0.5 px-1.5 rounded select-none">
                                  Reader Note
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-[9px] text-paper/40 leading-none mt-0.5">
                              {review.authorTitle} {review.authorInstitution && `· ${review.authorInstitution}`}
                            </p>
                          </div>
                        </div>
                        <span className="font-sans text-[8px] text-paper/20">
                          {new Date(review.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      {/* Content text */}
                      <p className="font-serif text-xs text-paper/65 leading-relaxed whitespace-pre-wrap pl-10 select-text">
                        {review.content}
                      </p>

                      {/* Controls (Like, Reply trigger) */}
                      <div className="flex items-center gap-4 pl-10 pt-1 text-paper/40 font-sans text-[9px] uppercase tracking-wider">
                        <button 
                          onClick={() => handleLike(review.id!)}
                          className="hover:text-blood flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ThumbsUp size={10} />
                          <span>Endorse ({review.likes})</span>
                        </button>
                        <button 
                          onClick={() => setReplyingToId(replyingToId === review.id ? null : review.id!)}
                          className="hover:text-blood flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Reply size={10} />
                          <span>{replyingToId === review.id ? 'Close' : 'Reply'}</span>
                        </button>
                      </div>

                      {/* Inline Reply Form */}
                      <AnimatePresence>
                        {replyingToId === review.id && (
                          <motion.form 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pl-10 space-y-2 pt-2 border-t border-paper/5"
                            onSubmit={(e) => handleReplySubmit(e, review.id!)}
                          >
                            <span className="font-sans text-[8px] text-blood font-bold tracking-widest uppercase block mb-1">ADD DISCUSSION REPLY</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="text"
                                placeholder="Your Name"
                                value={replyName}
                                onChange={(e) => setReplyName(e.target.value)}
                                className="bg-midnight/60 border border-paper/10 rounded-sm py-1 px-2 font-sans text-[10px] text-paper focus:outline-none"
                                required
                              />
                              <input 
                                type="text"
                                placeholder="Academic Title"
                                value={replyTitle}
                                onChange={(e) => setReplyTitle(e.target.value)}
                                className="bg-midnight/60 border border-paper/10 rounded-sm py-1 px-2 font-sans text-[10px] text-paper focus:outline-none"
                                required
                              />
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Write peer feedback..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className="bg-midnight/60 border border-paper/10 rounded-sm py-1.5 px-2 w-full font-serif text-[11px] text-paper focus:outline-none"
                                required
                              />
                              <button 
                                type="submit"
                                className="bg-blood hover:bg-blood-light text-paper px-3 py-1 rounded-sm font-sans text-[9px] uppercase font-bold tracking-wider shrink-0 cursor-pointer"
                              >
                                Send
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      {/* Reply Threads nested listing */}
                      {(review.replies || []).length > 0 && (
                        <div className="pl-10 space-y-2 border-t border-paper/5 pt-3 mt-1.5">
                          {review.replies.map((reply) => (
                            <div key={reply.id} className="bg-midnight/40 p-2.5 rounded border border-paper/5 space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-display font-semibold text-paper/85">{reply.authorName}</span>
                                  <span className="text-[8px] text-paper/30 italic">({reply.authorTitle})</span>
                                </div>
                                <span className="text-[8px] text-paper/20">
                                  {new Date(reply.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              <p className="font-serif text-[11px] text-paper/50 leading-relaxed pl-1">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Panel Footer */}
            <div className="p-4 border-t border-paper/10 bg-midnight select-none flex items-center justify-between text-[10px]">
              <span className="text-paper/30 font-serif italic">The Oligarchy Scholarly Archive</span>
              <span className="text-paper/40 font-mono text-[9px]">UTC CLOCK ACTIVE</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
