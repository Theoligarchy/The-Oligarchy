import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { db, auth, seedInitialDataIfEmpty } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  addDoc 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Article, ReadingItem } from './types';

// Import modular subcomponents
import Header from './components/Header';
import Footer, { SOCIAL_LINKS } from './components/Footer';
import ArticleCard from './components/ArticleCard';
import FeaturedResearch from './components/FeaturedResearch';
import SourcesSection from './components/SourcesSection';
import ReadingStack from './components/ReadingStack';
import AboutSection from './components/AboutSection';
import EditorialPrinciples from './components/EditorialPrinciples';
import ContactSection from './components/ContactSection';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import CanvaEmbed from './components/CanvaEmbed';

import { 
  BookOpen, 
  Newspaper, 
  Eye, 
  Clock, 
  Mail, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Download, 
  FileText, 
  ArrowLeft,
  Search,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Firebase Datastore States
  const [articles, setArticles] = useState<Article[]>([]);
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Pagination count
  const [articlesPerPage, setArticlesPerPage] = useState<number>(6);

  useEffect(() => {
    // Apply theme selection to HTML element
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.remove('dark');
      html.style.backgroundColor = '#fff8ee';
      html.style.color = '#1a1208';
    } else {
      html.classList.add('dark');
      html.style.backgroundColor = '#080808';
      html.style.color = '#e0e0e0';
    }
  }, [theme]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Seed initial data if Firestore database is empty
      await seedInitialDataIfEmpty();

      // 2. Load articles
      const articlesCol = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCol);
      const articlesList = articlesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Article));

      // Sort: pinned first, then newest
      const sortedArticles = articlesList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });

      setArticles(sortedArticles);

      // 3. Load currently reading books stack
      const readingCol = collection(db, 'reading');
      const readingSnapshot = await getDocs(readingCol);
      const readingList = readingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReadingItem));
      
      setReadingItems(readingList.sort((a,b) => b.addedAt - a.addedAt));

    } catch (e) {
      console.error("Error loading application data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Track active authentication session state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Handle article clicks (and increment read views in Firestore)
  const handleArticleClick = async (art: Article) => {
    setSelectedArticle(art);
    setActiveTab('article-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const artRef = doc(db, 'articles', art.id);
      await updateDoc(artRef, {
        views: (art.views || 0) + 1
      });
      // Update local state views counter immediately
      setArticles(prev => prev.map(a => a.id === art.id ? { ...a, views: (a.views || 0) + 1 } : a));
    } catch (e) {
      console.error("Failed to increment views:", e);
    }
  };

  // Handle Newsletter Registration
  const handleSubscribeNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      alert('Please provide a valid email address.');
      return;
    }

    try {
      const subsCol = collection(db, 'subscribers');
      await addDoc(subsCol, {
        email: newsletterEmail.trim(),
        subscribedAt: Date.now()
      });
      setNewsletterEmail('');
      setNewsletterSuccess(true);
      setTimeout(() => setNewsletterSuccess(false), 8000);
    } catch (err) {
      console.error('Newsletter error:', err);
      alert('A database error occurred. Please try again.');
    }
  };

  // Filter calculations using Fuse.js for high-performance fuzzy searching
  const filteredArticles = useMemo(() => {
    // 1. Get base articles (skip drafts for public view)
    let list = articles.filter(art => art.status !== 'draft');

    // 2. Apply Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'criminology' || categoryFilter === 'psyche' || categoryFilter === 'politics') {
        list = list.filter(art => art.category === categoryFilter);
      } else if (categoryFilter === 'case-studies') {
        list = list.filter(art => (art.tags || []).some(t => t.toLowerCase().includes('case study')));
      } else if (categoryFilter === 'research-notes') {
        list = list.filter(art => (art.tags || []).some(t => t.toLowerCase().includes('research note')) || art.readTime.includes('3 min') || art.readTime.includes('4 min'));
      }
    }

    // 3. Apply Fuzzy Search if searchQuery exists
    if (searchQuery.trim()) {
      const fuse = new Fuse(list, {
        keys: [
          { name: 'title', weight: 0.5 },
          { name: 'subtitle', weight: 0.3 },
          { name: 'excerpt', weight: 0.2 },
          { name: 'tags', weight: 0.3 }
        ],
        threshold: 0.45,
        ignoreLocation: true
      });
      return fuse.search(searchQuery).map(result => result.item);
    }

    return list;
  }, [articles, categoryFilter, searchQuery]);

  const featuredPost = articles.find(art => art.isFeatured && art.status === 'published');

  const handleSearch = (queryText: string) => {
    setSearchQuery(queryText);
    setSelectedArticle(null);
    setActiveTab('home');
  };

  // Render Loader screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-midnight text-paper">
        <div className="w-10 h-10 border-t-2 border-blood rounded-full animate-spin" />
        <span className="font-gothic text-2xl tracking-widest text-paper/85">The Oligarchy</span>
        <span className="font-serif text-xs italic text-paper/30">Analyzing systems of power...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between ${
      theme === 'light' 
        ? 'bg-[#fff8ee] text-[#1a1208]' 
        : 'bg-[#080808] text-[#e0e0e0]'
    }`}>
      
      {/* Scroll Progress Indicator Bar */}
      <div className="fixed top-0 left-0 w-full h-[3px] bg-blood z-[999]" id="scroll-bar" />

      {/* Decorative Dark Gothic Academic Watermark Rail */}
      {theme === 'dark' && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-12 pr-6 pointer-events-none z-10 select-none">
          <div className="[writing-mode:vertical-rl] text-[9px] uppercase tracking-[0.55em] text-paper/10 font-extrabold">
            ANALYTIC • RIGOROUS • HUMAN
          </div>
        </div>
      )}

      {/* Main Gothic Masthead Header */}
      {activeTab !== 'admin' && (
        <Header 
          activeTab={activeTab === 'article-view' ? 'research' : activeTab} 
          setActiveTab={(tab) => {
            setSelectedArticle(null);
            setActiveTab(tab);
          }}
          onSearch={handleSearch}
          theme={theme}
          setTheme={setTheme}
        />
      )}

      {/* Core Dynamic Screen Routing */}
      <main className="flex-1">
        
        {/* ══ VIEW: HOME / DISCOVER ══ */}
        {activeTab === 'home' && (
          <div className="fade-in">
            {/* HERO INTRODUCTION */}
            <section className="relative overflow-hidden py-16 md:py-24 px-6 border-b border-paper/10 text-center flex flex-col items-center justify-center bg-gradient-to-b from-navy/30 to-transparent">
              <div className="font-sans text-[10px] font-bold tracking-[0.4em] uppercase text-blood mb-4 flex items-center gap-2">
                <span className="w-6 h-px bg-blood" />
                Journal of critical inquiry
                <span className="w-6 h-px bg-blood" />
              </div>
              
              <h2 className="font-display text-4xl md:text-6xl font-extrabold text-paper max-w-4xl leading-tight mb-6 select-text selection:bg-blood selection:text-paper">
                The stories behind systems of power.
              </h2>
              
              <p className="font-serif text-base md:text-lg text-paper/60 max-w-2xl leading-relaxed mb-10 select-text selection:bg-blood selection:text-paper">
                Independent research into crime, psychology, politics, and systems of power, prioritising understanding over outrage and analysis over headlines.
              </p>

              <div className="flex gap-4 flex-wrap justify-center">
                <button 
                  onClick={() => {
                    const anchor = document.getElementById('analyses-anchor');
                    if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm shadow-md transition-all cursor-pointer"
                >
                  Read Research
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-transparent border border-paper/20 hover:border-blood hover:text-paper text-paper/60 font-sans text-xs font-bold tracking-widest uppercase py-3.5 px-8 rounded-sm transition-all cursor-pointer"
                >
                  About The Publication
                </button>
              </div>
            </section>

            {/* WHAT IS THE OLIGARCHY BRIEF BANNER */}
            <section className="py-12 px-6 border-b border-paper/5 max-w-4xl mx-auto text-center select-text selection:bg-blood selection:text-paper">
              <h3 className="font-display text-2xl font-bold italic mb-5 text-paper">What is The Oligarchy?</h3>
              <p className="font-serif text-sm leading-relaxed text-paper/50 max-w-2xl mx-auto">
                The Oligarchy is an independent research publication exploring crime, human behavior, and institutions. 
                Power is rarely distributed equally; decisions are shaped by hidden incentives, structures, and organizational rules. 
                We seek strictly to study these operations with calm scholarly detachment.
              </p>
            </section>

            {/* FEATURED PINNED ESSAY */}
            {featuredPost && (
              <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto border-b border-paper/10">
                <div className="font-sans text-[10px] font-bold tracking-[0.35em] text-blood uppercase mb-6 text-center">
                  Focus Research Paper
                </div>
                <FeaturedResearch article={featuredPost} onClick={() => handleArticleClick(featuredPost)} />
              </section>
            )}

            {/* RESEARCH PORTFOLIO CATEGORY GRID */}
            <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto border-b border-paper/5">
              <div className="font-sans text-[10px] font-bold tracking-[0.35em] text-blood uppercase mb-8 text-center">
                Primary Focus Columns
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 'criminology',
                    title: 'Criminology',
                    desc: 'Research into criminal behaviour, organised crime, corruption, fraud, financial crime, and justice systems.',
                    emoji: '⚖️'
                  },
                  {
                    id: 'psyche',
                    title: 'Psychology',
                    desc: 'Research into behaviour, persuasion, ideology, cognition, identity, and decision making.',
                    emoji: '🧠'
                  },
                  {
                    id: 'politics',
                    title: 'Politics',
                    desc: 'Research into institutions, governance, elites, incentives, and political systems.',
                    emoji: '🌐'
                  }
                ].map((col) => (
                  <div 
                    key={col.id} 
                    onClick={() => {
                      setCategoryFilter(col.id);
                      const anchor = document.getElementById('analyses-anchor');
                      if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-navy border border-paper/10 p-8 rounded-sm hover:border-blood hover:bg-paper/[0.01] transition-all duration-300 cursor-pointer flex flex-col gap-3 select-none"
                  >
                    <span className="text-3xl leading-none">{col.emoji}</span>
                    <h4 className="font-display text-lg font-bold text-paper/95">{col.title}</h4>
                    <p className="font-serif text-sm text-paper/50 leading-relaxed">{col.desc}</p>
                    <span className="font-sans text-[9px] uppercase tracking-widest text-blood mt-auto pt-4 group-hover:underline">
                      Access records &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* TWO-COLUMN GRID: RESEARCH ARCHIVES & SIDEBAR WIDGETS */}
            <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10" id="analyses-anchor">
              
              {/* Left Column: List of Latest Articles */}
              <div className="md:col-span-8 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-paper/10 pb-4">
                  <h3 className="font-display text-2xl font-semibold italic text-paper">
                    {categoryFilter === 'all' ? 'Latest Research & Analyses' : `${categoryFilter} Archives`}
                  </h3>
                  
                  {/* Category filters bar */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'criminology', label: 'Criminology' },
                      { id: 'psyche', label: 'Psyche' },
                      { id: 'politics', label: 'Politics' },
                      { id: 'case-studies', label: 'Studies' },
                      { id: 'research-notes', label: 'Notes' }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setCategoryFilter(btn.id)}
                        className={`font-sans text-[9px] font-semibold tracking-wider uppercase py-1 px-3 border transition-colors cursor-pointer rounded-sm ${
                          categoryFilter === btn.id 
                            ? 'bg-blood border-blood text-paper' 
                            : 'border-paper/10 text-paper/40 hover:border-blood hover:text-paper'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List Grid */}
                <div className="flex flex-col gap-5 select-text">
                  {filteredArticles.length === 0 ? (
                    <div className="border border-dashed border-paper/10 p-12 text-center text-paper/30 italic rounded-sm">
                      No analyses logged matching this selection currently. Check back soon.
                    </div>
                  ) : (
                    filteredArticles.slice(0, articlesPerPage).map((art) => (
                      <ArticleCard key={art.id} article={art} onClick={() => handleArticleClick(art)} />
                    ))
                  )}
                </div>

                {/* Pagination "Load More" */}
                {filteredArticles.length > articlesPerPage && (
                  <div className="text-center pt-4">
                    <button 
                      onClick={() => setArticlesPerPage(prev => prev + 4)}
                      className="font-sans text-[10px] font-bold tracking-widest uppercase border border-paper/15 text-paper/50 hover:border-blood hover:text-paper py-3 px-8 transition-colors rounded-sm"
                    >
                      Load More Research
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Reading Stack sidebar & Social triggers */}
              <aside className="md:col-span-4 flex flex-col gap-6">
                
                {/* Reading Stack widget */}
                <ReadingStack items={readingItems} />

                {/* Follow Socials widget */}
                <div className="bg-navy border border-paper/10 rounded-sm overflow-hidden select-none">
                  <div className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-paper bg-blood py-2 px-4 border-b border-paper/10">
                    🔗 Follow Publications
                  </div>
                  <div className="p-4 flex flex-col gap-2.5">
                    <a 
                      href={SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-paper/10 p-3 flex items-center gap-3 hover:border-blood hover:bg-paper/[0.01] transition-colors"
                    >
                      <Instagram size={14} className="text-pink-400" />
                      <div className="flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80">Instagram</span>
                        <span className="font-serif text-xs text-paper/35">@theoligarchy.in</span>
                      </div>
                    </a>
                    <a 
                      href={SOCIAL_LINKS.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-paper/10 p-3 flex items-center gap-3 hover:border-blood hover:bg-paper/[0.01] transition-colors"
                    >
                      <Twitter size={14} className="text-blue-400" />
                      <div className="flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80">Twitter / X</span>
                        <span className="font-serif text-xs text-paper/35">@TheOligarchy_</span>
                      </div>
                    </a>
                    <a 
                      href={SOCIAL_LINKS.linkedinCompany}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-paper/10 p-3 flex items-center gap-3 hover:border-blood hover:bg-paper/[0.01] transition-colors"
                    >
                      <Linkedin size={14} className="text-blue-300" />
                      <div className="flex flex-col">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/80">LinkedIn Company Page</span>
                        <span className="font-serif text-xs text-paper/35">linkedin.com/company/the-oligarchy</span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Static Editorial Principle Callout Card */}
                <div className="border border-paper/10 p-6 rounded-sm bg-gradient-to-br from-navy to-transparent flex flex-col gap-3 select-text">
                  <span className="font-mono text-[10px] text-blood font-bold uppercase">Philosophy</span>
                  <h4 className="font-display text-base font-semibold italic text-paper/90">Complexity Over Certainty</h4>
                  <p className="font-serif text-xs text-paper/40 leading-relaxed">
                    Systems of power are rarely simple. We reject binary narratives, embracing the nuanced, multi-faceted nature of organizational behavior and human psyche.
                  </p>
                </div>
              </aside>
            </section>

            {/* THE RESEARCH BRIEF NEWSLETTER CARD */}
            <section className="bg-navy border-y border-paper/10 py-16 px-6 text-center select-none">
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <span className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-blood">Stay Informed</span>
                <h3 className="font-display text-2xl md:text-3xl font-semibold italic text-paper">The Research Brief</h3>
                <p className="font-serif text-sm text-paper/50 max-w-lg mx-auto leading-relaxed">
                  Scholarly essays, case studies, and research briefings, dispatched directly to your inbox. No corporate advertising. Unsubscribe anytime.
                </p>

                {newsletterSuccess ? (
                  <div className="bg-green-950/20 border border-green-500/30 text-[#8bc4a8] font-serif text-sm p-4 rounded-sm mt-4">
                    ✓ You have successfully subscribed to The Research Brief list. Welcome to The Oligarchy.
                  </div>
                ) : (
                  <form onSubmit={handleSubscribeNewsletter} className="flex max-w-md mx-auto w-full mt-4 select-text">
                    <input
                      type="email"
                      placeholder="Your academic email address..."
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      className="bg-midnight border border-paper/10 rounded-l-sm border-r-0 py-3 px-4 text-paper font-serif text-sm focus:outline-none w-full"
                    />
                    <button 
                      type="submit"
                      className="bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-6 rounded-r-sm shadow-md transition-all shrink-0 cursor-pointer"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* FROM THE EDITOR PHILOSOPHY HERO CALLOUT */}
            <section className="py-16 px-6 max-w-4xl mx-auto text-center border-b border-paper/5 select-text selection:bg-blood selection:text-paper">
              <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-paper/30 block mb-3">Founding manifesto</span>
              <h3 className="font-display text-xl md:text-2xl italic font-semibold text-paper/90 mb-4">"From the Editor"</h3>
              <p className="font-serif text-sm text-paper/50 leading-relaxed max-w-2xl mx-auto italic">
                "The Oligarchy was founded to examine crime, psychology, politics, and systems of power through research rather than outrage. 
                This publication values complexity over certainty and understanding over sensationalism."
              </p>
              <span className="font-gothic text-lg text-blood block mt-6">The Oligarchy</span>
            </section>
          </div>
        )}

        {/* ══ VIEW: ABOUT PAGE ══ */}
        {activeTab === 'about' && <AboutSection />}

        {/* ══ VIEW: EDITORIAL PRINCIPLES PAGE ══ */}
        {activeTab === 'principles' && <EditorialPrinciples />}

        {/* ══ VIEW: CONTACT & RESEARCH TIPS PAGE ══ */}
        {activeTab === 'contact' && <ContactSection />}

        {/* ══ VIEW: SECURE EDITORIAL PANEL (ADMIN) ══ */}
        {activeTab === 'admin' && (
          <div className="fade-in">
            {adminUser ? (
              <AdminDashboard 
                onLogout={() => setAdminUser(null)} 
                allArticles={articles}
                refreshArticles={loadData}
              />
            ) : (
              <div className="py-12">
                <div className="text-center mb-8">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="font-sans text-[9px] uppercase tracking-widest bg-paper/5 border border-paper/10 hover:border-blood hover:text-paper text-paper/40 px-4 py-2 cursor-pointer transition-colors"
                  >
                    &larr; Back to Public Platform
                  </button>
                </div>
                <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />
              </div>
            )}
          </div>
        )}

        {/* ══ VIEW: FULL SCHOLARLY ARTICLE PAGE ══ */}
        {activeTab === 'article-view' && selectedArticle && (
          <div className="py-12 md:py-16 px-6 max-w-5xl mx-auto fade-in select-text">
            {/* Back to Home Navigation */}
            <button 
              onClick={() => {
                setSelectedArticle(null);
                setActiveTab('home');
              }}
              className="font-sans text-[9px] font-bold tracking-widest uppercase border border-paper/10 text-paper/45 hover:border-blood hover:text-paper py-2 px-5 mb-10 inline-flex items-center gap-1.5 cursor-pointer rounded-sm"
            >
              <ArrowLeft size={10} /> Back to Analyses
            </button>

            {/* Article Container Block */}
            <article className="flex flex-col gap-6 select-text selection:bg-blood selection:text-paper">
              
              {/* Image banner display */}
              {selectedArticle.featuredImage && !selectedArticle.canvaEmbed && (
                <div className="w-full h-[220px] md:h-[400px] overflow-hidden rounded-sm border border-paper/10 mb-2 relative">
                  <img 
                    src={selectedArticle.featuredImage} 
                    alt={selectedArticle.title} 
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/40 to-transparent" />
                </div>
              )}

              {/* Article Upper Metadata */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border ${
                  selectedArticle.category === 'criminology' 
                    ? 'bg-red-950/10 text-red-400 border-red-900/30' 
                    : selectedArticle.category === 'psyche'
                    ? 'bg-purple-950/10 text-purple-300 border-purple-900/30'
                    : 'bg-blue-950/10 text-blue-300 border-blue-900/30'
                }`}>
                  {selectedArticle.category}
                </span>

                {selectedArticle.seriesName && (
                  <span className="font-sans text-[9px] tracking-widest uppercase text-paper/40">
                    Series: {selectedArticle.seriesName} {selectedArticle.seriesPart && `(Part ${selectedArticle.seriesPart})`}
                  </span>
                )}
                
                <span className="font-sans text-[10px] text-paper/20">•</span>
                <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1">
                  <Calendar size={11} />
                  {selectedArticle.publishDate || new Date(selectedArticle.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                
                <span className="font-sans text-[10px] text-paper/20">•</span>
                <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1"><Eye size={12} /> {selectedArticle.views || 0} hits</span>
                <span className="font-sans text-[10px] text-paper/30 flex items-center gap-1"><Clock size={12} /> {selectedArticle.readTime || '5 min read'}</span>
              </div>

              {/* Action Report download button if present */}
              {selectedArticle.pdfLink && (
                <div className="flex justify-end -mb-4">
                  <a 
                    href={selectedArticle.pdfLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blood/15 border border-blood/40 hover:bg-blood/25 text-paper/80 hover:text-paper font-sans text-[9px] font-bold tracking-widest uppercase py-2.5 px-4 rounded-sm flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    title="Download fully cited PDF report file"
                  >
                    <FileText size={10} /> Reference Report PDF <Download size={10} />
                  </a>
                </div>
              )}

              {/* Big Display Headings */}
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-paper leading-tight tracking-tight mt-2">
                {selectedArticle.title}
              </h1>

              {selectedArticle.subtitle && (
                <h2 className="font-display text-lg md:text-xl italic text-paper/50 leading-relaxed -mt-2">
                  {selectedArticle.subtitle}
                </h2>
              )}

              {/* Scholarly journal style double-rule author line */}
              <div className="border-y border-double border-paper/20 py-2.5 my-2 text-center md:text-left font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-paper/45">
                BY PRIYASHA PRIYAL JENA · EDITOR-IN-CHIEF · THE OLIGARCHY
              </div>

              {/* ARTICLE BODY OR RESPONSIVE CANVA ENGINE EMBED */}
              {selectedArticle.canvaEmbed ? (
                // If Canva Embed field is populated, mount responsive iframe container & hide text blocks
                <div className="my-4">
                  <CanvaEmbed embedSource={selectedArticle.canvaEmbed} />
                </div>
              ) : (
                // Standard Article Text Body (safely parsed html from Quill)
                <div 
                  className="font-serif text-base md:text-lg leading-relaxed text-paper/70 flex flex-col gap-5 select-text selection:bg-blood selection:text-paper"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              )}

              {/* Custom Tags chips footer */}
              {(selectedArticle.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-paper/5">
                  {selectedArticle.tags.map((tag) => (
                    <span 
                      key={tag} 
                      onClick={() => {
                        setCategoryFilter('all');
                        setSearchQuery(tag);
                        setActiveTab('home');
                        setTimeout(() => {
                          const anchor = document.getElementById('analyses-anchor');
                          if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="font-sans text-[9px] tracking-wider uppercase bg-paper/5 border border-paper/10 hover:border-blood hover:text-paper text-paper/40 px-3 py-1 rounded-sm cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Related scholarly references citation index bibliography */}
              <SourcesSection sources={selectedArticle.sources || []} />

              {/* Related Articles suggestions shelf bar */}
              {articles.filter(a => a.id !== selectedArticle.id && a.category === selectedArticle.category).length > 0 && (
                <div className="border border-paper/10 bg-navy/30 p-6 rounded-sm mt-8 select-none">
                  <h4 className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood mb-4 border-b border-paper/5 pb-1.5">
                    Related Research Analyses
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {articles
                      .filter(a => a.id !== selectedArticle.id && a.category === selectedArticle.category && a.status === 'published')
                      .slice(0, 2)
                      .map((relArt) => (
                        <div 
                          key={relArt.id}
                          onClick={() => handleArticleClick(relArt)}
                          className="border border-paper/5 p-4 rounded-sm bg-midnight/50 hover:border-blood cursor-pointer transition-colors"
                        >
                          <span className="font-sans text-[8px] uppercase tracking-wider text-paper/30 block mb-1">
                            {relArt.category} {relArt.readTime && `· ${relArt.readTime}`}
                          </span>
                          <h5 className="font-display text-sm font-bold text-paper/90 line-clamp-1">
                            {relArt.title}
                          </h5>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Mini Author bio card inside post design */}
              <div className="bg-navy border border-paper/10 p-6 rounded-sm mt-8 flex flex-col sm:flex-row gap-5 items-center sm:items-start select-text shadow-lg">
                <div className="w-12 h-12 bg-blood text-paper flex items-center justify-center font-display text-xl font-bold rounded-full border border-paper/10 shrink-0 select-none">
                  P
                </div>
                <div className="text-center sm:text-left flex flex-col gap-1.5">
                  <h4 className="font-display text-base font-bold text-paper/90 leading-none">Priyasha Priyal Jena</h4>
                  <p className="font-sans text-[9px] font-semibold uppercase tracking-wider text-blood">Founder &amp; Editor-in-Chief</p>
                  <p className="font-serif text-xs text-paper/40 leading-relaxed">
                    Student researcher focusing on criminology, institutional politics, behavior patterns, and forensic studies. Currently studying business while maintaining The Oligarchy as a long-term research registry.
                  </p>
                </div>
              </div>

            </article>
          </div>
        )}

      </main>

      {/* Global Academic footer */}
      {activeTab !== 'admin' && (
        <Footer 
          setActiveTab={setActiveTab} 
          setCategoryFilter={setCategoryFilter} 
        />
      )}

    </div>
  );
}
