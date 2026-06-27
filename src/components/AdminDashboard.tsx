import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { Article, ReadingItem, ResearchTip, ArticleVersion } from '../types';
import QuillEditor from './QuillEditor';
import { 
  Plus, 
  FileEdit, 
  Trash2, 
  Copy, 
  Sparkles, 
  CheckCircle, 
  Database, 
  LogOut, 
  Lock, 
  Clock, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  Mail, 
  BookOpen, 
  Eye, 
  History, 
  Check, 
  FileText 
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  allArticles: Article[];
  refreshArticles: () => Promise<void>;
}

export default function AdminDashboard({ onLogout, allArticles, refreshArticles }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'articles' | 'tips' | 'reading' | 'analytics' | 'settings'>('write');
  
  // Write Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<'criminology' | 'psyche' | 'politics'>('criminology');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [canvaEmbed, setCanvaEmbed] = useState('');
  const [pdfLink, setPdfLink] = useState('');
  const [readTime, setReadTime] = useState('5 min read');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [seriesName, setSeriesName] = useState('');
  const [seriesPart, setSeriesPart] = useState<number | ''>('');
  const [sources, setSources] = useState<Array<{ category: any; title: string; url?: string; citation?: string }>>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);

  // New Source Item Temp States
  const [newSrcCat, setNewSrcCat] = useState<'academic' | 'government' | 'book' | 'court' | 'database' | 'investigative'>('academic');
  const [newSrcTitle, setNewSrcTitle] = useState('');
  const [newSrcUrl, setNewSrcUrl] = useState('');
  const [newSrcCitation, setNewSrcCitation] = useState('');

  // Reader Tips & Newsletter Lists
  const [tips, setTips] = useState<ResearchTip[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  
  // Reading Stack list
  const [readingStack, setReadingStack] = useState<ReadingItem[]>([]);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookLink, setNewBookLink] = useState('');

  // Security Credentials Overrides (Instagram-style settings)
  const [newSecurityKey, setNewSecurityKey] = useState('');
  const [confirmSecurityKey, setConfirmSecurityKey] = useState('');

  // Status/Alert Indicators
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [autoSaveActive, setAutoSaveActive] = useState(false);

  // Track editor changes for auto-save
  const lastSavedContent = useRef<string>('');

  useEffect(() => {
    // Load Tips, Subscribers, and Reading Stack
    loadTips();
    loadSubscribers();
    loadReadingStack();

    // Auto-save loop: triggers every 15 seconds if content changes
    const autoSaveInterval = setInterval(() => {
      triggerAutoSave();
    }, 15000);

    // Look for recovered crash draft in localStorage on mount
    const recovered = localStorage.getItem('tol_autosave_recovery');
    if (recovered) {
      try {
        const parsed = JSON.parse(recovered);
        setAlert({
          text: `A crash recovery draft for "${parsed.title || 'Untitled'}" is available. Fill in form and restore it?`,
          type: 'success'
        });
      } catch (e) {
        console.error(e);
      }
    }

    return () => clearInterval(autoSaveInterval);
  }, [content, title]);

  const loadTips = async () => {
    try {
      const col = collection(db, 'tips');
      const q = query(col, orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ResearchTip));
      setTips(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubscribers = async () => {
    try {
      const col = collection(db, 'subscribers');
      const snap = await getDocs(col);
      const list = snap.docs.map(d => d.data());
      setSubscribers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReadingStack = async () => {
    try {
      const col = collection(db, 'reading');
      const q = query(col, orderBy('addedAt', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReadingItem));
      setReadingStack(list);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to generate dynamic slugs
  const generateAutoSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!slug) {
      setSlug(generateAutoSlug(val));
    }
  };

  // Tag list helpers
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Source attachment handlers
  const addSourceItem = () => {
    if (!newSrcTitle.trim()) return;
    setSources([...sources, {
      category: newSrcCat,
      title: newSrcTitle.trim(),
      url: newSrcUrl.trim() || undefined,
      citation: newSrcCitation.trim() || undefined
    }]);
    setNewSrcTitle('');
    setNewSrcUrl('');
    setNewSrcCitation('');
  };

  const removeSourceItem = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  // Auto save draft locally for crash recovery
  const triggerAutoSave = () => {
    if (!content || content === lastSavedContent.current || content === '<p><br></p>') return;
    
    const draftData = {
      title,
      subtitle,
      excerpt,
      content,
      category,
      tags,
      slug,
      savedAt: Date.now()
    };
    localStorage.setItem('tol_autosave_recovery', JSON.stringify(draftData));
    lastSavedContent.current = content;
    setAutoSaveActive(true);
    setTimeout(() => setAutoSaveActive(false), 3000);
  };

  const restoreRecoveryDraft = () => {
    const recovered = localStorage.getItem('tol_autosave_recovery');
    if (recovered) {
      try {
        const parsed = JSON.parse(recovered);
        setTitle(parsed.title || '');
        setSubtitle(parsed.subtitle || '');
        setExcerpt(parsed.excerpt || '');
        setContent(parsed.content || '');
        setCategory(parsed.category || 'criminology');
        setTags(parsed.tags || []);
        setSlug(parsed.slug || '');
        
        localStorage.removeItem('tol_autosave_recovery');
        setAlert({ text: 'Crash draft restored successfully.', type: 'success' });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Publish / Save Draft Action
  const handleSavePost = async (forcedStatus?: 'draft' | 'published') => {
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setAlert({ text: 'Please populate all mandatory fields: Title, Content, Slug.', type: 'error' });
      return;
    }

    const currentStatus = forcedStatus || status;

    // Smart calculated read-time estimation
    const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    const computedReadTime = `${Math.max(3, Math.ceil(words / 200))} min read`;

    // Construct article JSON payload
    const finalId = editingId || `art-${Date.now().toString(36)}`;
    
    // Find editing article to preserve versions
    const existingArt = allArticles.find(a => a.id === finalId);
    let updatedVersions: ArticleVersion[] = existingArt?.versions || [];

    if (existingArt) {
      // Append last state to edit history
      const newVersion: ArticleVersion = {
        id: `ver-${Date.now()}`,
        timestamp: Date.now(),
        title: existingArt.title,
        excerpt: existingArt.excerpt,
        content: existingArt.content,
        updatedBy: auth.currentUser?.email || 'admin'
      };
      updatedVersions = [newVersion, ...updatedVersions].slice(0, 10); // Keep last 10 versions
    }

    const articleData: Article = {
      id: finalId,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      slug: slug.trim(),
      category,
      tags,
      featuredImage: featuredImage.trim() || undefined,
      canvaEmbed: canvaEmbed.trim() || undefined,
      pdfLink: pdfLink.trim() || undefined,
      authorId: 'priyasha-priyal-jena',
      authorName: 'Priyasha Priyal Jena',
      readTime: computedReadTime,
      excerpt: excerpt.trim() || title.trim(),
      content: content,
      status: currentStatus,
      publishDate: currentStatus === 'published' ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
      createdAt: existingArt?.createdAt || Date.now(),
      updatedAt: Date.now(),
      views: existingArt?.views || 0,
      isFeatured,
      isPinned,
      sources,
      seriesName: seriesName.trim() || undefined,
      seriesPart: typeof seriesPart === 'number' ? seriesPart : undefined,
      versions: updatedVersions,
      seoTitle: title.trim(),
      seoDescription: excerpt.trim() || undefined
    };

    try {
      await setDoc(doc(db, 'articles', finalId), articleData);
      
      // If marked as featured, toggle all other featured pins off
      if (isFeatured) {
        for (const art of allArticles) {
          if (art.id !== finalId && art.isFeatured) {
            await updateDoc(doc(db, 'articles', art.id), { isFeatured: false });
          }
        }
      }

      setAlert({ text: `Article saved successfully as ${currentStatus.toUpperCase()}.`, type: 'success' });
      clearWriteForm();
      await refreshArticles();
      localStorage.removeItem('tol_autosave_recovery');
      setActiveTab('articles');
    } catch (e: any) {
      setAlert({ text: `Save failed: ${e.message}`, type: 'error' });
    }
  };

  const clearWriteForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setSlug('');
    setCategory('criminology');
    setTags([]);
    setTagInput('');
    setFeaturedImage('');
    setCanvaEmbed('');
    setPdfLink('');
    setReadTime('5 min read');
    setExcerpt('');
    setContent('');
    setStatus('draft');
    setIsFeatured(false);
    setIsPinned(false);
    setSeriesName('');
    setSeriesPart('');
    setSources([]);
    setSelectedVersionIndex(null);
  };

  const handleEditArticle = (art: Article) => {
    setEditingId(art.id);
    setTitle(art.title);
    setSubtitle(art.subtitle || '');
    setSlug(art.slug);
    setCategory(art.category);
    setTags(art.tags || []);
    setFeaturedImage(art.featuredImage || '');
    setCanvaEmbed(art.canvaEmbed || '');
    setPdfLink(art.pdfLink || '');
    setReadTime(art.readTime || '5 min read');
    setExcerpt(art.excerpt || '');
    setContent(art.content || '');
    setStatus(art.status);
    setIsFeatured(art.isFeatured || false);
    setIsPinned(art.isPinned || false);
    setSeriesName(art.seriesName || '');
    setSeriesPart(art.seriesPart || '');
    setSources(art.sources || []);
    setSelectedVersionIndex(null);
    setActiveTab('write');
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm('Are you absolutely certain you want to permanently delete this research article? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'articles', id));
      setAlert({ text: 'Article deleted successfully.', type: 'success' });
      await refreshArticles();
    } catch (e: any) {
      setAlert({ text: `Deletion failed: ${e.message}`, type: 'error' });
    }
  };

  const handleDuplicateArticle = async (art: Article) => {
    try {
      const dupId = `art-dup-${Date.now().toString(36)}`;
      const duplicated: Article = {
        ...art,
        id: dupId,
        title: `${art.title} (Duplicated)`,
        slug: `${art.slug}-copy`,
        status: 'draft',
        isFeatured: false,
        isPinned: false,
        views: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'articles', dupId), duplicated);
      setAlert({ text: 'Article duplicated as Draft.', type: 'success' });
      await refreshArticles();
    } catch (e: any) {
      setAlert({ text: `Duplication failed: ${e.message}`, type: 'error' });
    }
  };

  // Restore past version from edit history
  const handleRestoreVersion = (ver: ArticleVersion) => {
    setTitle(ver.title);
    setExcerpt(ver.excerpt);
    setContent(ver.content);
    setAlert({ text: 'Form populated with historical version state. Review and click Save to finalize.', type: 'success' });
    setSelectedVersionIndex(null);
  };

  // Toggle Live/Draft directly from table
  const handleTogglePublish = async (art: Article) => {
    const nextStatus = art.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'articles', art.id), { 
        status: nextStatus,
        publishDate: nextStatus === 'published' ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
      });
      setAlert({ text: `Article set to ${nextStatus.toUpperCase()}.`, type: 'success' });
      await refreshArticles();
    } catch (e: any) {
      setAlert({ text: `Toggle failed: ${e.message}`, type: 'error' });
    }
  };

  // Reading Stack Managers
  const handleAddBook = async () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;
    if (readingStack.length >= 5) {
      setAlert({ text: 'Reading stack limited to 5 concurrent entries to maintain clean layout rhythm.', type: 'error' });
      return;
    }
    const id = `book-${Date.now()}`;
    const newBook: ReadingItem = {
      id,
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      link: newBookLink.trim() || undefined,
      addedAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'reading', id), newBook);
      setAlert({ text: 'Book successfully added to reading shelf.', type: 'success' });
      setNewBookTitle('');
      setNewBookAuthor('');
      setNewBookLink('');
      await loadReadingStack();
    } catch (e: any) {
      setAlert({ text: `Failed to add book: ${e.message}`, type: 'error' });
    }
  };

  const handleRemoveBook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reading', id));
      setAlert({ text: 'Book removed from shelf.', type: 'success' });
      await loadReadingStack();
    } catch (e: any) {
      setAlert({ text: `Failed to remove book: ${e.message}`, type: 'error' });
    }
  };

  // Mark Reader Tips as read
  const handleMarkTipRead = async (tipId: string, isRead: boolean) => {
    try {
      await updateDoc(doc(db, 'tips', tipId), { isRead: !isRead });
      await loadTips();
    } catch (e) {
      console.error(e);
    }
  };

  // Securely update Administrator Password (Instagram-Style settings)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecurityKey.trim()) {
      setAlert({ text: 'Security override key cannot be empty.', type: 'error' });
      return;
    }
    if (newSecurityKey !== confirmSecurityKey) {
      setAlert({ text: 'Keys do not match.', type: 'error' });
      return;
    }
    
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newSecurityKey);
        setAlert({ text: 'Administrator security override key updated successfully.', type: 'success' });
        setNewSecurityKey('');
        setConfirmSecurityKey('');
      }
    } catch (e: any) {
      setAlert({ text: `Security update rejected: ${e.message}`, type: 'error' });
    }
  };

  const handleSignOutAction = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-midnight flex flex-col md:flex-row border-t border-paper/10 select-none">
      
      {/* Side Navigation panel */}
      <aside className="w-full md:w-60 bg-ink border-b md:border-b-0 md:border-r border-paper/10 flex flex-col pt-6 md:h-screen md:sticky md:top-0">
        <div className="px-6 pb-6 border-b border-paper/10">
          <span className="font-gothic text-2xl text-paper tracking-wider">The Oligarchy</span>
          <p className="font-sans text-[8px] font-bold tracking-[0.25em] text-blood uppercase mt-1">
            Editorial Panel
          </p>
        </div>

        <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible divide-x md:divide-x-0 md:divide-y divide-paper/5 py-2 md:py-4 shrink-0">
          {[
            { id: 'write', label: '✏ Write Post' },
            { id: 'articles', label: '📋 All Articles' },
            { id: 'tips', label: `📬 Tips (${tips.filter(t => !t.isRead).length})` },
            { id: 'reading', label: '📚 Reading shelf' },
            { id: 'analytics', label: '📊 Analytics' },
            { id: 'settings', label: '⚙ Security' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setAlert(null);
              }}
              className={`font-sans text-[10px] font-semibold tracking-widest uppercase text-left py-3.5 px-5 md:px-6 w-full whitespace-nowrap md:border-l-2 transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-blood/10 text-paper border-blood' 
                  : 'text-paper/45 hover:bg-paper/[0.02] border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Admin profile & logout */}
        <div className="mt-auto p-4 border-t border-paper/5 hidden md:flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-serif text-xs text-paper/70 font-bold truncate max-w-36">
              {auth.currentUser?.email}
            </span>
            <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest">
              Author Account
            </span>
          </div>
          <button 
            onClick={handleSignOutAction}
            className="text-paper/40 hover:text-red-400 p-2 cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 md:p-10 select-text max-w-5xl">
        <div className="flex flex-col gap-6">
          
          {/* Workspace Banner */}
          <div className="flex justify-between items-center border-b border-paper/10 pb-5">
            <div>
              <h2 className="font-display text-2xl font-semibold italic text-paper/90 capitalize">
                {activeTab === 'write' ? (editingId ? 'Edit Article' : 'Write Post') : `${activeTab} Panel`}
              </h2>
              <span className="font-sans text-[8px] text-paper/30 uppercase tracking-widest">
                theoligarchy.in • System Administrator
              </span>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-3">
              {autoSaveActive && (
                <span className="font-serif text-[10px] italic text-[#8bc4a8] bg-[#8bc4a8]/5 border border-[#8bc4a8]/10 px-2 py-1 rounded-sm flex items-center gap-1">
                  <Check size={10} /> Auto-save recovery complete
                </span>
              )}
              {localStorage.getItem('tol_autosave_recovery') && activeTab === 'write' && (
                <button 
                  onClick={restoreRecoveryDraft}
                  className="font-sans text-[9px] uppercase tracking-wider bg-blood/10 border border-blood/30 hover:bg-blood/20 text-paper px-3 py-1.5 rounded-sm cursor-pointer transition-colors"
                >
                  Restore Crash Draft
                </button>
              )}
            </div>
          </div>

          {/* Error / Success Notifications */}
          {alert && (
            <div className={`p-4 border text-xs leading-relaxed flex justify-between items-center ${
              alert.type === 'success' 
                ? 'bg-green-950/20 text-[#8bc4a8] border-green-500/20' 
                : 'bg-red-950/20 text-red-400 border-red-500/20'
            }`}>
              <span className="font-serif">{alert.text}</span>
              <button onClick={() => setAlert(null)} className="text-[14px] leading-none shrink-0 ml-4 font-bold opacity-50 hover:opacity-100 cursor-pointer">×</button>
            </div>
          )}

          {/* ══ TAB 1: WRITE/EDIT POST ══ */}
          {activeTab === 'write' && (
            <div className="flex flex-col gap-6 fade-in">
              
              {/* Row 1: Title and Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter scholarly title..."
                    value={title}
                    onChange={handleTitleChange}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  >
                    <option value="criminology">Criminology</option>
                    <option value="psyche">Psyche</option>
                    <option value="politics">Politics</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Subtitle & Excerpt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Subtitle or Chapter header
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Part 1: Pathology of Control"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Manual Slug Override *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. psychology-of-serial-killers-1"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>
              </div>

              {/* Row 3: Series / Collections Support */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Series Name (Group name if applicable)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. The Psychology of Serial Killers"
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Series Part Index
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={seriesPart}
                    onChange={(e) => setSeriesPart(e.target.value ? parseInt(e.target.value) : '')}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif focus:outline-none focus:border-blood text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5 justify-center md:pt-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/50">
                      <input 
                        type="checkbox" 
                        checked={isFeatured} 
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="accent-blood"
                      />
                      ★ Set Pinned Featured
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/50">
                      <input 
                        type="checkbox" 
                        checked={isPinned} 
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="accent-blood"
                      />
                      📌 Pin to top of list
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 4: Custom tags inline constructor */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Search Metadata Tags
                </label>
                <div className="bg-navy border border-paper/10 p-2 rounded-sm flex flex-wrap gap-2 items-center">
                  {tags.map((tag, i) => (
                    <span key={tag} className="font-sans text-[9px] font-semibold bg-blood/15 border border-blood/40 text-red-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(i)} className="hover:text-white ml-1 font-bold text-[10px]">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="bg-transparent text-paper font-serif focus:outline-none text-sm flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              {/* Row 5: Media URLs, PDF Links & Canva embeds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Featured Image URL (High-Res Banner)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    PDF / Research Report Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={pdfLink}
                    onChange={(e) => setPdfLink(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                    Canva Embed Link / HTML Source
                  </label>
                  <input
                    type="text"
                    placeholder="Paste Canva iframe or View URL..."
                    value={canvaEmbed}
                    onChange={(e) => setCanvaEmbed(e.target.value)}
                    className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-mono focus:outline-none focus:border-blood text-xs"
                  />
                </div>
              </div>

              {/* Row 6: Article Excerpt (1-2 sentence preview summary) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Article Excerpt * (Short synopsis seen in card lists)
                </label>
                <textarea
                  placeholder="Summarise this investigative essay in 1-2 powerful sentences..."
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="bg-navy border border-paper/10 rounded-sm py-2.5 px-3.5 text-paper font-serif focus:outline-none focus:border-blood text-sm resize-none"
                />
              </div>

              {/* Row 7: Modern Scholarly Quill Rich-Text Editor */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Full Scholarly Content * (Quill Rich-Text Engine)
                </label>
                <QuillEditor value={content} onChange={setContent} />
              </div>

              {/* Row 8: Version history if editing */}
              {editingId && allArticles.find(a => a.id === editingId)?.versions?.length && (
                <div className="border border-paper/10 bg-navy/30 p-5 rounded-sm">
                  <span className="font-sans text-[10px] font-bold tracking-widest text-paper/40 uppercase block mb-3">
                    <History size={12} className="inline mr-1" /> Document Edits Version History (Restoration Stack)
                  </span>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-2 divide-y divide-paper/5">
                    {allArticles.find(a => a.id === editingId)?.versions?.map((ver, vIdx) => (
                      <div key={ver.id} className="pt-2 first:pt-0 flex justify-between items-center text-xs text-paper/50 font-serif">
                        <span>
                          Version saved at {new Date(ver.timestamp).toLocaleString()} by <span className="font-mono text-[10px] text-blood">{ver.updatedBy}</span>
                        </span>
                        <button 
                          onClick={() => handleRestoreVersion(ver)}
                          className="font-sans text-[8px] uppercase bg-paper/5 border border-paper/10 px-2 py-1 text-paper hover:border-blood hover:text-paper rounded-sm cursor-pointer transition-colors"
                        >
                          Restore Text
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 9: Academic Sources Manager */}
              <div className="border border-paper/10 p-5 rounded-sm bg-navy/20">
                <span className="font-sans text-[10px] font-bold tracking-widest text-blood uppercase block mb-4">
                  📚 Academic Citation Index &amp; Sources Bibliography
                </span>
                
                {/* Source Form inputs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Category</label>
                    <select
                      value={newSrcCat}
                      onChange={(e: any) => setNewSrcCat(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-2 text-paper text-xs"
                    >
                      <option value="academic">Academic Paper</option>
                      <option value="government">Government Report</option>
                      <option value="book">Book/Literature</option>
                      <option value="court">Court Record</option>
                      <option value="database">Public Database</option>
                      <option value="investigative">Investigative Journalism</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Source Title / Reference Cite</label>
                    <input
                      type="text"
                      placeholder="e.g. Michels, R. (1911). Political Parties..."
                      value={newSrcTitle}
                      onChange={(e) => setNewSrcTitle(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3.5 text-paper text-xs"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={addSourceItem}
                    className="bg-blood/10 hover:bg-blood/20 border border-blood/40 text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2 px-4 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus size={10} /> Add Source
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Optional URL Link</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newSrcUrl}
                      onChange={(e) => setNewSrcUrl(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Optional Citation/Descriptor Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Journal of Sociology, Vol. 4"
                      value={newSrcCitation}
                      onChange={(e) => setNewSrcCitation(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper text-xs"
                    />
                  </div>
                </div>

                {/* Display added sources */}
                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto mt-4 pr-1">
                  {sources.map((src, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-paper/60 border-b border-paper/5 pb-2">
                      <span className="font-serif">
                        <strong className="text-blood font-sans text-[9px] uppercase tracking-widest mr-2">[{src.category}]</strong> {src.title}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => removeSourceItem(idx)}
                        className="text-red-400 hover:text-red-300 font-sans text-[9px] uppercase tracking-wider bg-none border-none p-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish State Options */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-paper/10 items-center justify-between">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSavePost('published')}
                    className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm shadow-md cursor-pointer"
                  >
                    {editingId ? 'Apply Updates & Publish' : 'Publish Article'}
                  </button>
                  <button
                    onClick={() => handleSavePost('draft')}
                    className="bg-transparent border border-paper/20 hover:border-blood hover:text-paper hover:bg-blood/5 text-paper/60 font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm cursor-pointer transition-colors"
                  >
                    Save as Draft
                  </button>
                </div>

                {editingId && (
                  <button
                    onClick={clearWriteForm}
                    className="bg-transparent border border-paper/10 hover:border-paper/40 text-paper/50 font-sans text-[10px] font-bold tracking-widest uppercase py-3.5 px-6 rounded-sm cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══ TAB 2: ALL ARTICLES ══ */}
          {activeTab === 'articles' && (
            <div className="flex flex-col gap-5 fade-in">
              <div className="overflow-x-auto border border-paper/10 rounded-sm">
                <table className="w-full text-left border-collapse select-text">
                  <thead>
                    <tr className="border-b border-paper/10 bg-ink">
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Article</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Category</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Status</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Views</th>
                      <th className="font-sans text-[10px] font-bold tracking-widest uppercase text-paper/40 py-3.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper/5 font-serif text-sm text-paper/70">
                    {allArticles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-paper/30 italic">No articles logged currently. Go to Write tab to begin.</td>
                      </tr>
                    ) : (
                      allArticles.map((art) => (
                        <tr key={art.id} className="hover:bg-paper/[0.01] transition-colors">
                          <td className="py-4 px-4 font-bold text-paper/90 select-text">
                            {art.isFeatured && <span className="text-blood mr-1" title="Pinned Pinned Featured">★</span>}
                            {art.title}
                            {art.subtitle && <span className="block text-xs font-normal text-paper/40 mt-0.5">{art.subtitle}</span>}
                          </td>
                          <td className="py-4 px-4 capitalize font-sans text-xs">{art.category}</td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleTogglePublish(art)}
                              className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border cursor-pointer ${
                                art.status === 'published' 
                                  ? 'bg-green-950/10 text-[#8bc4a8] border-green-800/30' 
                                  : 'bg-yellow-950/10 text-yellow-500 border-yellow-800/30'
                              }`}
                              title="Click to toggle draft/published"
                            >
                              {art.status === 'published' ? 'Live' : 'Draft'}
                            </button>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-paper/40">{art.views || 0}</td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditArticle(art)}
                                className="p-1.5 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood transition-colors rounded-sm cursor-pointer"
                                title="Edit Article"
                              >
                                <FileEdit size={13} />
                              </button>
                              <button 
                                onClick={() => handleDuplicateArticle(art)}
                                className="p-1.5 border border-paper/10 text-paper/50 hover:text-blood hover:border-blood transition-colors rounded-sm cursor-pointer"
                                title="Duplicate Article"
                              >
                                <Copy size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteArticle(art.id)}
                                className="p-1.5 border border-paper/10 text-paper/30 hover:text-red-400 hover:border-red-400/40 transition-colors rounded-sm cursor-pointer"
                                title="Delete Post"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ TAB 3: READER TIPS ══ */}
          {activeTab === 'tips' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="font-serif text-sm text-paper/50 bg-navy/30 border border-paper/10 p-5 rounded-sm leading-relaxed">
                CLASSIFIED DATA ENVELOPE: Submissions from readers and whistleblower investigators. All IP logging is disabled globally to maintain absolute security. Review items below.
              </div>

              <div className="flex flex-col gap-4">
                {tips.length === 0 ? (
                  <div className="border border-dashed border-paper/10 p-10 text-center text-paper/30 italic rounded-sm">
                    Inbox empty. No classified research reports received yet.
                  </div>
                ) : (
                  tips.map((tip) => (
                    <div 
                      key={tip.id} 
                      className={`border p-5 rounded-sm flex flex-col gap-3 transition-all relative ${
                        tip.isRead 
                          ? 'bg-navy/20 border-paper/10 text-paper/50' 
                          : 'bg-[#8b1a1a]/5 border-[#8b1a1a]/30 text-paper/90 shadow-lg'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-sans text-[9px] font-bold tracking-widest uppercase bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-sm text-blood mr-3">
                            {tip.contact === 'Anonymous' ? '🔒 ANONYMOUS' : '👤 DIRECT CITE'}
                          </span>
                          <span className="font-sans text-[10px] text-paper/35">
                            Received: {new Date(tip.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMarkTipRead(tip.id, tip.isRead)}
                          className="font-sans text-[8px] tracking-wider uppercase border border-paper/10 hover:border-blood px-2.5 py-1 text-paper/60 hover:text-paper rounded-sm cursor-pointer transition-colors"
                        >
                          {tip.isRead ? 'Mark Unread' : 'Mark Reviewed'}
                        </button>
                      </div>

                      <h4 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-1.5">
                        Subject: {tip.subject}
                      </h4>

                      <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap select-text">
                        {tip.message}
                      </p>

                      {tip.contact !== 'Anonymous' && (
                        <div className="bg-ink/50 p-3 rounded-sm border border-paper/5 font-mono text-[11px] text-paper/60 select-text flex items-center gap-2">
                          <Mail size={12} /> Return Channel: {tip.contact}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══ TAB 4: READING STACK ══ */}
          {activeTab === 'reading' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Book stack list */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  <h3 className="font-display text-lg font-bold text-paper/90 border-b border-paper/5 pb-2">
                    Current Reading Shelf Logs
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    {readingStack.length === 0 ? (
                      <p className="font-serif italic text-sm text-paper/30 py-4">No volumes currently added to the stack.</p>
                    ) : (
                      readingStack.map((book) => (
                        <div key={book.id} className="bg-navy border border-paper/10 p-4 rounded-sm flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-display text-sm font-bold text-paper/90">{book.title}</h4>
                            <p className="font-sans text-[10px] tracking-wider uppercase text-paper/40 mt-1">{book.author}</p>
                            {book.link && <span className="font-mono text-[9px] text-blood hover:text-blood-light hover:underline truncate block mt-1 max-w-sm transition-colors">{book.link}</span>}
                          </div>
                          <button
                            onClick={() => handleRemoveBook(book.id)}
                            className="p-2 border border-red-900/30 hover:bg-red-950/10 text-red-400 rounded-sm cursor-pointer"
                            title="Remove from stack"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add book form */}
                <div className="md:col-span-5 bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-4">
                  <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
                    Log New Literature Vol.
                  </h3>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Book Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. The Psychology of Power"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Author Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Erich Fromm"
                      value={newBookAuthor}
                      onChange={(e) => setNewBookAuthor(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Goodreads / Reference Link</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newBookLink}
                      onChange={(e) => setNewBookLink(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs focus:outline-none focus:border-blood"
                    />
                  </div>

                  <button
                    onClick={handleAddBook}
                    className="bg-blood hover:bg-blood-light text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 rounded-sm mt-2 transition-all cursor-pointer shadow-md"
                  >
                    Add Literature
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB 5: PLATFORM ANALYTICS ══ */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              
              {/* Analytics bento counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-navy border border-paper/10 p-5 rounded-sm text-center">
                  <span className="font-display text-3xl font-extrabold text-paper/95 block">{allArticles.filter(a => a.status === 'published').length}</span>
                  <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-paper/30 mt-1 block">Articles Live</span>
                </div>
                <div className="bg-navy border border-paper/10 p-5 rounded-sm text-center">
                  <span className="font-display text-3xl font-extrabold text-paper/95 block">{allArticles.filter(a => a.status === 'draft').length}</span>
                  <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-paper/30 mt-1 block">Draft Vault</span>
                </div>
                <div className="bg-navy border border-paper/10 p-5 rounded-sm text-center">
                  <span className="font-display text-3xl font-extrabold text-paper/95 block">{allArticles.reduce((acc, a) => acc + (a.views || 0), 0)}</span>
                  <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-paper/30 mt-1 block">Scholarly Hits</span>
                </div>
                <div className="bg-navy border border-paper/10 p-5 rounded-sm text-center">
                  <span className="font-display text-3xl font-extrabold text-paper/95 block">{subscribers.length}</span>
                  <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-paper/30 mt-1 block">Subscribers</span>
                </div>
              </div>

              {/* Grid: Popular Articles & Newsletter Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start select-text">
                
                {/* Popular posts */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2 flex items-center gap-2">
                    <TrendingUp size={14} className="text-blood" /> Popular Analyses Indexed
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {[...allArticles].sort((a,b) => (b.views||0) - (a.views||0)).slice(0, 5).map((art, index) => (
                      <div key={art.id} className="bg-navy/50 p-3 rounded-sm border border-paper/5 flex justify-between items-center text-xs text-paper/70 font-serif">
                        <span className="truncate max-w-sm">
                          <strong>{index + 1}.</strong> {art.title}
                        </span>
                        <span className="font-mono text-[10px] text-paper/40 shrink-0">
                          <Eye size={10} className="inline mr-1" /> {art.views || 0} hits
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Newsletter Subscriber base logs */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2 flex items-center gap-2">
                    <Mail size={14} className="text-blood" /> Active Newsletter Registry
                  </h3>
                  <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-2 divide-y divide-paper/5">
                    {subscribers.length === 0 ? (
                      <p className="font-serif italic text-xs text-paper/30 py-4 text-center">No active subscribers currently.</p>
                    ) : (
                      subscribers.map((sub, idx) => (
                        <div key={idx} className="pt-2 flex justify-between items-center text-xs font-serif text-paper/60">
                          <span className="select-text">{sub.email}</span>
                          <span className="font-mono text-[9px] text-paper/30">
                            {new Date(sub.subscribedAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB 6: SECURITY & SETTINGS ══ */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 fade-in select-text">
              <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5">
                <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2 flex items-center gap-2">
                  <Lock size={14} className="text-blood" /> Password &amp; Administrative Credentials (Instagram-Style)
                </h3>
                
                <p className="font-serif text-sm text-paper/50 leading-relaxed -mt-2">
                  Update your active admin session credential key here. Updates sync directly to secure Firebase Auth structures instantly, overriding the default deployment code configurations securely.
                </p>

                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 select-text">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">New Security Override Key *</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={newSecurityKey}
                        onChange={(e) => setNewSecurityKey(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-[9px] uppercase tracking-wider text-paper/30">Confirm Override Key *</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmSecurityKey}
                        onChange={(e) => setConfirmSecurityKey(e.target.value)}
                        className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-blood hover:bg-blood-light text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 rounded-sm w-fit px-6 shadow-md transition-all cursor-pointer"
                  >
                    Commit Key Update
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
