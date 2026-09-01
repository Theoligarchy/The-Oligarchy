import React, { useState, useEffect } from 'react';
import { SiteSettings, Article } from '../types';
import { fetchSiteSettings, saveSiteSettings, DEFAULT_SITE_SETTINGS } from '../utils/siteSettings';
import { 
  Globe, 
  Layout, 
  Megaphone, 
  BookOpen, 
  Share2, 
  Shield, 
  Sparkles, 
  Check, 
  Save, 
  RefreshCw, 
  ExternalLink,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';

interface SiteContentManagerProps {
  allArticles: Article[];
  onSettingsUpdated?: (settings: SiteSettings) => void;
}

export default function SiteContentManager({ allArticles, onSettingsUpdated }: SiteContentManagerProps) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'announcement' | 'homepage' | 'about' | 'socials' | 'footer' | 'seo'>('general');
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSiteSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to load site settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof SiteSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialChange = (key: keyof SiteSettings['socials'], value: string) => {
    setSettings(prev => ({
      ...prev,
      socials: {
        ...prev.socials,
        [key]: value
      }
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setAlert(null);
    try {
      const saved = await saveSiteSettings(settings);
      setSettings(saved);
      if (onSettingsUpdated) {
        onSettingsUpdated(saved);
      }
      setAlert({ text: 'Site content & configuration committed successfully. Changes are now live.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setAlert({ text: `Failed to save site settings: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all site content fields to default configuration?')) {
      setSettings(DEFAULT_SITE_SETTINGS);
      setAlert({ text: 'Defaults restored. Click "Save Changes" to publish.', type: 'success' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-t-2 border-blood rounded-full animate-spin" />
        <span className="font-serif text-xs italic text-paper/40">Loading CMS Site Content...</span>
      </div>
    );
  }

  const subTabs = [
    { id: 'general', label: 'Site Identity', icon: Globe },
    { id: 'announcement', label: 'Announcement Bar', icon: Megaphone },
    { id: 'homepage', label: 'Homepage & Categories', icon: Layout },
    { id: 'about', label: 'About & Principles', icon: BookOpen },
    { id: 'socials', label: 'Social & Contact', icon: Share2 },
    { id: 'footer', label: 'Footer & Legal', icon: Shield },
    { id: 'seo', label: 'SEO & Metadata', icon: Sparkles }
  ];

  return (
    <div className="flex flex-col gap-6 fade-in select-text">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-paper/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blood" />
            <h2 className="font-display text-lg font-bold text-paper">
              Site Content &amp; CMS Customizer
            </h2>
          </div>
          <p className="font-serif text-xs text-paper/50 italic mt-0.5">
            Manage site headers, editorial manifestos, category descriptions, announcement bars, and social links in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="font-sans text-[9px] uppercase tracking-wider text-paper/50 hover:text-paper border border-paper/10 hover:border-paper/30 py-2 px-3 rounded-sm transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="bg-blood hover:bg-blood-light disabled:opacity-50 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-5 rounded-sm flex items-center gap-2 shadow transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw size={12} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={12} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert toast */}
      {alert && (
        <div className={`p-3 rounded-sm text-xs font-serif flex items-center justify-between border ${
          alert.type === 'success' 
            ? 'bg-green-950/20 border-green-500/30 text-green-300' 
            : 'bg-red-950/20 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{alert.text}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-paper/40 hover:text-paper text-xs ml-4">✕</button>
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-1 border-b border-paper/10 pb-2">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`font-sans text-[9px] font-bold tracking-wider uppercase py-2 px-3.5 rounded-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-blood/20 text-paper border border-blood/50 shadow-sm' 
                  : 'text-paper/40 hover:text-paper/80 hover:bg-paper/5 border border-transparent'
              }`}
            >
              <Icon size={12} className={isActive ? 'text-blood' : 'text-paper/40'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══ SECTION 1: SITE IDENTITY ══ */}
      {activeSubTab === 'general' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
            Brand Identity &amp; Masthead Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Publication Name (Masthead Title) *
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleFieldChange('siteName', e.target.value)}
                placeholder="The Oligarchy"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-sm focus:outline-none focus:border-blood"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Tagline (Masthead Subtext)
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => handleFieldChange('tagline', e.target.value)}
                placeholder="Journal of Critical Inquiry & Power Systems"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-sm focus:outline-none focus:border-blood"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Publication Category Header
              </label>
              <input
                type="text"
                value={settings.subheading}
                onChange={(e) => handleFieldChange('subheading', e.target.value)}
                placeholder="Criminology, Psyche & Politics"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-sm focus:outline-none focus:border-blood"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Academic ISSN / Archival Serial Code
              </label>
              <input
                type="text"
                value={settings.issnNumber || ''}
                onChange={(e) => handleFieldChange('issnNumber', e.target.value)}
                placeholder="ISSN 2984-1029"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs focus:outline-none focus:border-blood"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Mission Statement &amp; Founding Objective
            </label>
            <textarea
              rows={3}
              value={settings.missionStatement}
              onChange={(e) => handleFieldChange('missionStatement', e.target.value)}
              placeholder="Enter scholarly mission statement..."
              className="bg-midnight border border-paper/10 rounded-sm p-3 text-paper font-serif text-xs focus:outline-none focus:border-blood leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ══ SECTION 2: ANNOUNCEMENT BAR ══ */}
      {activeSubTab === 'announcement' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2 flex items-center justify-between">
            <span>Header Live Announcement Marquee</span>
            <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/70 font-semibold">
              <input
                type="checkbox"
                checked={settings.announcementActive}
                onChange={(e) => handleFieldChange('announcementActive', e.target.checked)}
                className="accent-blood"
              />
              Enable Marquee Banner
            </label>
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Announcement Copy / Headline *
            </label>
            <input
              type="text"
              value={settings.announcementText}
              onChange={(e) => handleFieldChange('announcementText', e.target.value)}
              placeholder="e.g. New Special Investigation: The Pathology of Corporate Control — Read Now"
              className="bg-midnight border border-paper/10 rounded-sm py-2.5 px-3 text-paper font-serif text-xs focus:outline-none focus:border-blood"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Call-to-Action Link URL (Optional deep link or external URL)
            </label>
            <input
              type="text"
              value={settings.announcementLink || ''}
              onChange={(e) => handleFieldChange('announcementLink', e.target.value)}
              placeholder="e.g. ?art=why-do-we-all-want-to-look-the-same or https://..."
              className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs focus:outline-none focus:border-blood"
            />
          </div>

          {/* Live Preview Box */}
          {settings.announcementActive && (
            <div className="p-3 bg-blood/10 border border-blood/30 rounded-sm">
              <span className="font-sans text-[8px] font-bold tracking-widest text-blood uppercase block mb-1">Live Banner Preview:</span>
              <div className="font-serif text-xs text-paper/90 flex items-center justify-between">
                <span>{settings.announcementText || 'Your announcement message will appear here.'}</span>
                {settings.announcementLink && <span className="text-[10px] text-amber-300 underline font-sans ml-2">Access &rarr;</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SECTION 3: HOMEPAGE & CATEGORIES ══ */}
      {activeSubTab === 'homepage' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-6 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
            Homepage Lead Dossier &amp; Category Sections
          </h3>

          {/* Manual Lead Featured Article Selector */}
          <div className="flex flex-col gap-2 bg-midnight/50 p-4 border border-paper/10 rounded-sm">
            <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-paper/70">
              📌 Pin Specific Featured Hero Article
            </label>
            <p className="font-serif text-xs text-paper/40 -mt-1">
              By default, the platform highlights the latest published article marked as featured. You can also explicitly override it here.
            </p>
            <select
              value={settings.heroFeaturedArticleId || ''}
              onChange={(e) => handleFieldChange('heroFeaturedArticleId', e.target.value)}
              className="bg-midnight border border-paper/15 rounded-sm p-2 text-paper text-xs cursor-pointer focus:outline-none focus:border-blood font-serif"
            >
              <option value="">-- Dynamic (Default to latest featured article) --</option>
              {allArticles.filter(a => a.status === 'published').map(a => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.category.toUpperCase()} · {a.authorName})
                </option>
              ))}
            </select>
          </div>

          {/* Category Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Criminology */}
            <div className="border border-paper/10 p-4 rounded-sm bg-midnight/30 flex flex-col gap-3">
              <span className="font-sans text-[9px] font-bold tracking-widest text-blood uppercase">
                Category 1: Criminology
              </span>
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Section Heading</label>
                <input
                  type="text"
                  value={settings.criminologyHeading}
                  onChange={(e) => handleFieldChange('criminologyHeading', e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm p-2 text-paper text-xs font-serif"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Editorial Description</label>
                <textarea
                  rows={3}
                  value={settings.criminologyDescription}
                  onChange={(e) => handleFieldChange('criminologyDescription', e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm p-2 text-paper text-xs font-serif leading-relaxed"
                />
              </div>
            </div>

            {/* Psyche */}
            <div className="border border-paper/10 p-4 rounded-sm bg-midnight/30 flex flex-col gap-3">
              <span className="font-sans text-[9px] font-bold tracking-widest text-blood uppercase">
                Category 2: Psyche
              </span>
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Section Heading</label>
                <input
                  type="text"
                  value={settings.psycheHeading}
                  onChange={(e) => handleFieldChange('psycheHeading', e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm p-2 text-paper text-xs font-serif"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Editorial Description</label>
                <textarea
                  rows={3}
                  value={settings.psycheDescription}
                  onChange={(e) => handleFieldChange('psycheDescription', e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm p-2 text-paper text-xs font-serif leading-relaxed"
                />
              </div>
            </div>

            {/* Politics */}
            <div className="border border-paper/10 p-4 rounded-sm bg-midnight/30 flex flex-col gap-3">
              <span className="font-sans text-[9px] font-bold tracking-widest text-blood uppercase">
                Category 3: Politics
              </span>
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Section Heading</label>
                <input
                  type="text"
                  value={settings.politicsHeading}
                  onChange={(e) => handleFieldChange('politicsHeading', e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm p-2 text-paper text-xs font-serif"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[8px] uppercase tracking-wider text-paper/40">Editorial Description</label>
                <textarea
                  rows={3}
                  value={settings.politicsDescription}
                  onChange={(e) => handleFieldChange('politicsDescription', e.target.value)}
                  className="bg-midnight border border-paper/10 rounded-sm p-2 text-paper text-xs font-serif leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTION 4: ABOUT & EDITORIAL PRINCIPLES ══ */}
      {activeSubTab === 'about' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
            Editorial Philosophy &amp; Institutional Governance
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              About Page Heading
            </label>
            <input
              type="text"
              value={settings.aboutTitle}
              onChange={(e) => handleFieldChange('aboutTitle', e.target.value)}
              className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              About Publication Narrative &amp; Founding Story
            </label>
            <textarea
              rows={5}
              value={settings.aboutContent}
              onChange={(e) => handleFieldChange('aboutContent', e.target.value)}
              className="bg-midnight border border-paper/10 rounded-sm p-3 text-paper font-serif text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Editorial Principles &amp; Standards
              </label>
              <textarea
                rows={5}
                value={settings.editorialPrinciples}
                onChange={(e) => handleFieldChange('editorialPrinciples', e.target.value)}
                className="bg-midnight border border-paper/10 rounded-sm p-3 text-paper font-serif text-xs leading-relaxed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Peer Review &amp; Methodological Policy
              </label>
              <textarea
                rows={5}
                value={settings.peerReviewPolicy}
                onChange={(e) => handleFieldChange('peerReviewPolicy', e.target.value)}
                className="bg-midnight border border-paper/10 rounded-sm p-3 text-paper font-serif text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTION 5: SOCIAL & CONTACT ══ */}
      {activeSubTab === 'socials' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
            Social Media Handles &amp; Editorial Inquiries
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Official Instagram URL / Handle
              </label>
              <input
                type="text"
                value={settings.socials.instagram}
                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                placeholder="https://www.instagram.com/theoligarchy.in"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Official Twitter / X URL
              </label>
              <input
                type="text"
                value={settings.socials.twitter}
                onChange={(e) => handleSocialChange('twitter', e.target.value)}
                placeholder="https://x.com/the_oligarchy"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Founder LinkedIn Profile
              </label>
              <input
                type="text"
                value={settings.socials.linkedinPersonal}
                onChange={(e) => handleSocialChange('linkedinPersonal', e.target.value)}
                placeholder="https://www.linkedin.com/in/priyasha-priyal-jena/"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Organization LinkedIn Page
              </label>
              <input
                type="text"
                value={settings.socials.linkedinCompany}
                onChange={(e) => handleSocialChange('linkedinCompany', e.target.value)}
                placeholder="https://www.linkedin.com/company/the-oligarchy-ppj/"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Substack Newsletter URL
              </label>
              <input
                type="text"
                value={settings.socials.substack || ''}
                onChange={(e) => handleSocialChange('substack', e.target.value)}
                placeholder="https://theoligarchy.substack.com"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Official Editorial Email
              </label>
              <input
                type="email"
                value={settings.socials.email}
                onChange={(e) => handleSocialChange('email', e.target.value)}
                placeholder="theoligarchy.ppj@gmail.com"
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTION 6: FOOTER & LEGAL ══ */}
      {activeSubTab === 'footer' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
            Footer Summary &amp; Legal Notices
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Footer Description Paragraph
            </label>
            <textarea
              rows={2}
              value={settings.footerDescription}
              onChange={(e) => handleFieldChange('footerDescription', e.target.value)}
              className="bg-midnight border border-paper/10 rounded-sm p-3 text-paper font-serif text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Copyright Notice
              </label>
              <input
                type="text"
                value={settings.copyrightText}
                onChange={(e) => handleFieldChange('copyrightText', e.target.value)}
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
                Fair Inquiry / Educational Disclaimer
              </label>
              <input
                type="text"
                value={settings.disclaimerText}
                onChange={(e) => handleFieldChange('disclaimerText', e.target.value)}
                className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTION 7: SEO & METADATA ══ */}
      {activeSubTab === 'seo' && (
        <div className="bg-navy border border-paper/10 p-6 rounded-sm shadow-xl flex flex-col gap-5 fade-in">
          <h3 className="font-display text-base font-bold text-paper border-b border-paper/5 pb-2">
            Search Engine Optimization &amp; Social Share Cards
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Default Browser Title (SEO Meta Title)
            </label>
            <input
              type="text"
              value={settings.defaultSeoTitle}
              onChange={(e) => handleFieldChange('defaultSeoTitle', e.target.value)}
              className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-serif text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Default Meta Description (Google Search Snippet)
            </label>
            <textarea
              rows={2}
              value={settings.defaultSeoDescription}
              onChange={(e) => handleFieldChange('defaultSeoDescription', e.target.value)}
              className="bg-midnight border border-paper/10 rounded-sm p-3 text-paper font-serif text-xs leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[9px] uppercase tracking-wider text-paper/40 font-semibold">
              Default OpenGraph / Twitter Social Card Image URL
            </label>
            <input
              type="text"
              value={settings.defaultOgImage || ''}
              onChange={(e) => handleFieldChange('defaultOgImage', e.target.value)}
              className="bg-midnight border border-paper/10 rounded-sm py-2 px-3 text-paper font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
