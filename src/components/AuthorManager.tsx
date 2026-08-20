import React, { useState, useMemo } from 'react';
import { AuthorProfile, Article } from '../types';
import { 
  saveContributor, 
  deleteContributor, 
  toggleContributorVisibility, 
  resolveSocialUrl 
} from '../utils/contributors';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  GraduationCap, 
  Building, 
  Mail, 
  Globe, 
  Linkedin, 
  Twitter, 
  Instagram, 
  BookOpen, 
  FileText, 
  Tag, 
  Plus, 
  X, 
  Check, 
  Copy, 
  ArrowUpDown,
  ShieldCheck,
  Award,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthorManagerProps {
  contributors: AuthorProfile[];
  allArticles: Article[];
  onRefresh: () => Promise<void>;
  onSelectAuthorForArticle?: (author: AuthorProfile) => void;
}

export default function AuthorManager({
  contributors,
  allArticles,
  onRefresh,
  onSelectAuthorForArticle
}: AuthorManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Custom modal for delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [institution, setInstitution] = useState('');
  const [credentials, setCredentials] = useState('');
  const [orcid, setOrcid] = useState('');
  const [email, setEmail] = useState('');
  const [isFounder, setIsFounder] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [joinedDate, setJoinedDate] = useState(new Date().getFullYear().toString());

  // Tags & Specializations input
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState('');

  // Social Links
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [googleScholar, setGoogleScholar] = useState('');
  const [researchGate, setResearchGate] = useState('');
  const [ssrn, setSsrn] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Map author IDs to their published articles count
  const articleCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allArticles.forEach((art) => {
      const authId = art.authorId || art.authorName?.toLowerCase().replace(/\s+/g, '-');
      if (authId) {
        map.set(authId, (map.get(authId) || 0) + 1);
      }
    });
    return map;
  }, [allArticles]);

  // Filtered contributors list
  const filteredContributors = useMemo(() => {
    return contributors.filter((c) => {
      // Visibility filter
      if (filterVisibility === 'visible' && c.isVisible === false) return false;
      if (filterVisibility === 'hidden' && c.isVisible !== false) return false;

      // Text query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchRole = (c.role || '').toLowerCase().includes(q);
      const matchInst = (c.institution || '').toLowerCase().includes(q);
      const matchBio = (c.bio || '').toLowerCase().includes(q);
      const matchSpecs = (c.specializations || c.researchAreas || []).some(s => s.toLowerCase().includes(q));
      return matchName || matchRole || matchInst || matchBio || matchSpecs;
    });
  }, [contributors, searchQuery, filterVisibility]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAuthor(null);
    setName('');
    setSlug('');
    setRole('Guest Researcher');
    setBio('');
    setProfileImage('');
    setInstitution('');
    setCredentials('');
    setOrcid('');
    setEmail('');
    setIsFounder(false);
    setIsVisible(true);
    setDisplayOrder(contributors.length + 1);
    setJoinedDate(new Date().getFullYear().toString());
    setSpecializations(['Criminology', 'Behavioral Psychology']);
    setSpecInput('');
    setInstagram('');
    setTwitter('');
    setLinkedin('');
    setWebsite('');
    setGoogleScholar('');
    setResearchGate('');
    setSsrn('');
    setContactEmail('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (author: AuthorProfile) => {
    setEditingAuthor(author);
    setName(author.name || '');
    setSlug(author.slug || author.id);
    setRole(author.role || '');
    setBio(author.bio || '');
    setProfileImage(author.profileImage || author.avatarUrl || '');
    setInstitution(author.institution || '');
    setCredentials(author.credentials || '');
    setOrcid(author.orcid || '');
    setEmail(author.email || '');
    setIsFounder(Boolean(author.isFounder));
    setIsVisible(author.isVisible !== false);
    setDisplayOrder(author.displayOrder ?? 99);
    setJoinedDate(author.joinedDate || new Date().getFullYear().toString());
    setSpecializations(author.specializations || author.researchAreas || []);
    setSpecInput('');
    setInstagram(author.socials?.instagram || '');
    setTwitter(author.socials?.twitter || '');
    setLinkedin(author.socials?.linkedin || '');
    setWebsite(author.socials?.website || '');
    setGoogleScholar(author.socials?.googleScholar || '');
    setResearchGate(author.socials?.researchGate || '');
    setSsrn(author.socials?.ssrn || '');
    setContactEmail(author.socials?.email || author.email || '');
    setIsModalOpen(true);
  };

  // Auto-generate slug from name if not custom edited
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingAuthor || !slug || slug === editingAuthor.id) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  // Add Specialization Tag
  const handleAddSpec = () => {
    if (!specInput.trim()) return;
    if (!specializations.includes(specInput.trim())) {
      setSpecializations([...specializations, specInput.trim()]);
    }
    setSpecInput('');
  };

  const handleRemoveSpec = (tagToRemove: string) => {
    setSpecializations(specializations.filter(t => t !== tagToRemove));
  };

  // Save Author
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) {
      setAlert({ text: 'Author Name and Academic Role / Title are mandatory.', type: 'error' });
      return;
    }

    const cleanId = editingAuthor?.id || slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const profileData: AuthorProfile = {
      id: cleanId,
      slug: slug.trim() || cleanId,
      name: name.trim(),
      role: role.trim(),
      bio: bio.trim(),
      profileImage: profileImage.trim() || undefined,
      avatarUrl: profileImage.trim() || undefined,
      institution: institution.trim() || undefined,
      credentials: credentials.trim() || undefined,
      orcid: orcid.trim() || undefined,
      email: contactEmail.trim() || email.trim() || undefined,
      specializations,
      researchAreas: specializations,
      affiliations: institution.trim() ? [institution.trim()] : [],
      tags: specializations,
      socials: {
        instagram: instagram.trim() || undefined,
        twitter: twitter.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        website: website.trim() || undefined,
        googleScholar: googleScholar.trim() || undefined,
        researchGate: researchGate.trim() || undefined,
        ssrn: ssrn.trim() || undefined,
        email: contactEmail.trim() || undefined
      },
      isVisible,
      displayOrder: Number(displayOrder) || 99,
      isFounder,
      joinedDate: joinedDate.trim() || new Date().getFullYear().toString(),
      createdAt: editingAuthor?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    setIsSaving(true);
    try {
      await saveContributor(profileData);
      setAlert({ 
        text: `Author profile "${profileData.name}" saved successfully to the registry.`, 
        type: 'success' 
      });
      setIsModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      setAlert({ text: `Failed to save author: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (author: AuthorProfile) => {
    const newStatus = author.isVisible === false ? true : false;
    try {
      await toggleContributorVisibility(author.id, newStatus);
      setAlert({ 
        text: `Author "${author.name}" is now ${newStatus ? 'PUBLICLY VISIBLE' : 'ARCHIVED / HIDDEN'}.`, 
        type: 'success' 
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      setAlert({ text: `Failed to update visibility: ${err.message}`, type: 'error' });
    }
  };

  // Delete Author
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteContributor(deleteConfirmId);
      setAlert({ text: 'Author profile removed from registry.', type: 'success' });
      setDeleteConfirmId(null);
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      setAlert({ text: `Failed to delete author: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-6 fade-in text-paper">
      
      {/* Notifications */}
      {alert && (
        <div className={`p-4 border text-xs leading-relaxed flex justify-between items-center ${
          alert.type === 'success' 
            ? 'bg-green-950/30 text-[#8bc4a8] border-green-500/30' 
            : 'bg-red-950/30 text-red-400 border-red-500/30'
        }`}>
          <span className="font-serif">{alert.text}</span>
          <button 
            onClick={() => setAlert(null)} 
            className="text-sm font-bold opacity-60 hover:opacity-100 cursor-pointer ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-ink via-navy to-ink border border-paper/10 p-6 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-sans text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs bg-blood/20 text-paper border border-blood/40">
              Scholarly Registry
            </span>
            <span className="font-sans text-[9px] text-paper/40 uppercase tracking-widest">
              The Oligarchy Contributor Database
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold italic text-paper/90">
            Authors, Researchers &amp; Scholar Profiles
          </h2>
          <p className="font-serif text-xs text-paper/60 max-w-2xl mt-1 leading-relaxed">
            Manage public bylines, biographical dossiers, academic credentials, research specializations, and social media links for all editorial fellows, guest writers, and researchers.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2.5 bg-paper/5 hover:bg-paper/10 border border-paper/10 rounded-sm text-paper/70 hover:text-paper cursor-pointer transition-colors"
            title="Reload registry"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-blood hover:bg-blood/90 text-paper font-sans text-[10px] font-bold tracking-widest uppercase py-2.5 px-5 rounded-sm flex items-center gap-2 cursor-pointer shadow-md transition-all border border-blood/50"
          >
            <UserPlus size={14} />
            Add New Contributor
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-ink border border-paper/10 p-3 rounded-sm">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper/40" />
          <input
            type="text"
            placeholder="Search by name, role, institution, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-midnight border border-paper/10 rounded-xs pl-9 pr-3 py-1.5 text-xs text-paper font-serif focus:outline-none focus:border-blood"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="font-sans text-[9px] uppercase tracking-wider text-paper/40">Status:</span>
          <div className="inline-flex rounded-xs border border-paper/10 bg-midnight p-0.5">
            <button
              onClick={() => setFilterVisibility('all')}
              className={`font-sans text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                filterVisibility === 'all' ? 'bg-blood text-paper' : 'text-paper/50 hover:text-paper'
              }`}
            >
              All ({contributors.length})
            </button>
            <button
              onClick={() => setFilterVisibility('visible')}
              className={`font-sans text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                filterVisibility === 'visible' ? 'bg-blood text-paper' : 'text-paper/50 hover:text-paper'
              }`}
            >
              Visible ({contributors.filter(c => c.isVisible !== false).length})
            </button>
            <button
              onClick={() => setFilterVisibility('hidden')}
              className={`font-sans text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                filterVisibility === 'hidden' ? 'bg-blood text-paper' : 'text-paper/50 hover:text-paper'
              }`}
            >
              Hidden ({contributors.filter(c => c.isVisible === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Authors Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredContributors.map((author) => {
          const articlesCount = articleCountMap.get(author.id) || 
            articleCountMap.get(author.slug || '') || 
            articleCountMap.get(author.name.toLowerCase().replace(/\s+/g, '-')) || 0;
          
          const isPublic = author.isVisible !== false;

          return (
            <div 
              key={author.id}
              className={`bg-ink border rounded-sm p-5 flex flex-col justify-between gap-4 transition-all relative ${
                isPublic ? 'border-paper/15 hover:border-paper/30' : 'border-paper/5 opacity-70 bg-ink/50'
              }`}
            >
              {/* Top Row: Avatar, Identity & Actions */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    {/* Profile Picture / Initials Avatar */}
                    <div className="w-12 h-12 rounded-sm border border-paper/20 bg-midnight shrink-0 overflow-hidden flex items-center justify-center relative">
                      {author.profileImage || author.avatarUrl ? (
                        <img 
                          src={author.profileImage || author.avatarUrl} 
                          alt={author.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="font-serif text-base font-bold text-blood">
                          {author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {author.isFounder && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 rounded-tl-xs flex items-center justify-center" title="Founder">
                          <Award size={8} className="text-black" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-base font-bold text-paper">
                          {author.name}
                        </h3>
                        {author.isFounder && (
                          <span className="font-sans text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded-xs bg-amber-400/20 text-amber-300 border border-amber-400/40">
                            Founder
                          </span>
                        )}
                        <span className={`font-sans text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded-xs border ${
                          isPublic 
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
                            : 'bg-paper/5 text-paper/40 border-paper/10'
                        }`}>
                          {isPublic ? 'Public' : 'Hidden'}
                        </span>
                      </div>

                      <p className="font-sans text-[11px] text-paper/70 font-semibold mt-0.5">
                        {author.role}
                      </p>

                      {author.credentials && (
                        <p className="font-mono text-[9px] text-paper/40 mt-0.5">
                          {author.credentials}
                        </p>
                      )}

                      {author.institution && (
                        <p className="font-serif text-[11px] italic text-paper/50 flex items-center gap-1 mt-0.5">
                          <Building size={10} className="shrink-0 text-paper/30" />
                          {author.institution}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(author)}
                      className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
                        isPublic 
                          ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                          : 'border-paper/10 text-paper/40 hover:bg-paper/5 hover:text-paper'
                      }`}
                      title={isPublic ? "Visible to public (Click to hide)" : "Hidden from public (Click to make visible)"}
                    >
                      {isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(author)}
                      className="p-1.5 rounded-xs border border-paper/10 text-paper/70 hover:text-paper hover:bg-paper/5 hover:border-paper/20 transition-colors cursor-pointer"
                      title="Edit author profile"
                    >
                      <Edit3 size={13} />
                    </button>
                    {!author.isFounder && (
                      <button
                        onClick={() => setDeleteConfirmId(author.id)}
                        className="p-1.5 rounded-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete profile"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bio Excerpt */}
                <p className="font-serif text-xs text-paper/70 mt-3 line-clamp-2 leading-relaxed italic border-l border-paper/10 pl-2.5">
                  &ldquo;{author.bio || 'No biography written.'}&rdquo;
                </p>

                {/* Specializations Tags */}
                {(author.specializations || author.researchAreas || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(author.specializations || author.researchAreas || []).slice(0, 4).map((spec, i) => (
                      <span 
                        key={i} 
                        className="font-sans text-[8px] font-semibold text-paper/60 bg-paper/5 border border-paper/10 px-2 py-0.5 rounded-xs"
                      >
                        {spec}
                      </span>
                    ))}
                    {(author.specializations || author.researchAreas || []).length > 4 && (
                      <span className="font-sans text-[8px] text-paper/30 px-1 py-0.5">
                        +{(author.specializations || author.researchAreas || []).length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Footer: Stats, ORCID & Socials */}
              <div className="pt-3 border-t border-paper/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-sans text-[9px] uppercase tracking-wider text-paper/50 flex items-center gap-1">
                    <FileText size={10} className="text-blood" />
                    <strong>{articlesCount}</strong> {articlesCount === 1 ? 'Article' : 'Articles'}
                  </span>

                  {author.orcid && (
                    <a
                      href={`https://orcid.org/${author.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[9px] text-[#a6ce39] hover:underline flex items-center gap-1"
                      title={`ORCID: ${author.orcid}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a6ce39]" />
                      ORCID
                    </a>
                  )}
                </div>

                {/* Social icons preview */}
                <div className="flex items-center gap-2 text-paper/40">
                  {author.socials?.linkedin && (
                    <a 
                      href={resolveSocialUrl('linkedin', author.socials.linkedin)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-paper transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin size={11} />
                    </a>
                  )}
                  {author.socials?.twitter && (
                    <a 
                      href={resolveSocialUrl('twitter', author.socials.twitter)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-paper transition-colors"
                      title="Twitter / X"
                    >
                      <Twitter size={11} />
                    </a>
                  )}
                  {author.socials?.instagram && (
                    <a 
                      href={resolveSocialUrl('instagram', author.socials.instagram)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-paper transition-colors"
                      title="Instagram"
                    >
                      <Instagram size={11} />
                    </a>
                  )}
                  {author.socials?.website && (
                    <a 
                      href={resolveSocialUrl('website', author.socials.website)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-paper transition-colors"
                      title="Personal Website"
                    >
                      <Globe size={11} />
                    </a>
                  )}
                  {(author.email || author.socials?.email) && (
                    <a 
                      href={`mailto:${author.email || author.socials?.email}`} 
                      className="hover:text-paper transition-colors"
                      title="Contact Email"
                    >
                      <Mail size={11} />
                    </a>
                  )}
                  <span className="font-mono text-[8px] text-paper/30 ml-1">
                    #{author.displayOrder ?? 99}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredContributors.length === 0 && (
          <div className="col-span-full bg-ink/40 border border-paper/10 p-12 text-center rounded-sm">
            <Users size={32} className="mx-auto text-paper/20 mb-3" />
            <h4 className="font-serif text-base text-paper/80 font-bold">No contributors match your filter.</h4>
            <p className="font-serif text-xs text-paper/50 mt-1">Try adjusting the search query or visibility filter.</p>
          </div>
        )}
      </div>

      {/* ══ ADD / EDIT AUTHOR MODAL ══ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-midnight border border-paper/20 rounded-sm w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-paper/10 bg-ink flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blood/20 text-blood border border-blood/30 rounded-xs">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-paper">
                      {editingAuthor ? `Edit Author: ${editingAuthor.name}` : 'Create New Contributor / Scholar'}
                    </h3>
                    <p className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                      Editorial Attribution &amp; Public Dossier
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-paper/40 hover:text-paper p-1.5 rounded-xs hover:bg-paper/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                
                {/* Basic Identity: Name, Slug, Role */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                      Author Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Julian Vance"
                      value={name}
                      onChange={handleNameChange}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-serif focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60 flex items-center justify-between">
                      <span>Unique ID / Slug *</span>
                      <span className="font-mono text-[8px] text-paper/30">URL safe</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. julian-vance"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-mono text-[11px] focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                      Role / Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Fellow, Forensic Criminology"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-serif focus:outline-none focus:border-blood"
                    />
                  </div>
                </div>

                {/* Profile Image & Avatar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-ink/40 p-4 border border-paper/10 rounded-xs">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-sm border border-paper/20 bg-midnight overflow-hidden flex items-center justify-center">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Users size={24} className="text-paper/20" />
                      )}
                    </div>
                    <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40 mt-1">
                      Avatar Preview
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-3">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                      Profile Image / Avatar URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or direct image URL"
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-mono text-[11px] focus:outline-none focus:border-blood"
                    />
                    <span className="text-[10px] text-paper/40 font-serif">
                      Leave empty to automatically display a classic scholarly initials badge.
                    </span>
                  </div>
                </div>

                {/* Academic Credentials & Institution */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                      Academic Institution / Affiliation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Oxford Centre for Criminology"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-serif focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                      Degrees &amp; Credentials
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ph.D. (Cantab), LL.M, Forensic Fellow"
                      value={credentials}
                      onChange={(e) => setCredentials(e.target.value)}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-serif focus:outline-none focus:border-blood"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60 flex items-center justify-between">
                      <span>ORCID iD Identifier</span>
                      <span className="font-mono text-[8px] text-[#a6ce39]">Verified</span>
                    </label>
                    <input
                      type="text"
                      placeholder="0000-0002-1825-0097"
                      value={orcid}
                      onChange={(e) => setOrcid(e.target.value)}
                      className="bg-ink border border-paper/15 rounded-xs p-2 text-paper font-mono text-[11px] focus:outline-none focus:border-blood"
                    />
                  </div>
                </div>

                {/* Biography */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                    Scholarly Biography &amp; Research Dossier *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write a concise overview of the researcher's background, methodology, and focus..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-ink border border-paper/15 rounded-xs p-3 text-paper font-serif leading-relaxed focus:outline-none focus:border-blood"
                  />
                </div>

                {/* Specializations / Research Tags Input */}
                <div className="flex flex-col gap-2">
                  <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/60">
                    Research Areas &amp; Specializations
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add area (e.g. Offender Profiling, State Surveillance)..."
                      value={specInput}
                      onChange={(e) => setSpecInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSpec();
                        }
                      }}
                      className="flex-1 bg-ink border border-paper/15 rounded-xs px-3 py-1.5 text-paper font-serif focus:outline-none focus:border-blood text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="px-3 py-1.5 bg-paper/10 hover:bg-paper/20 text-paper font-sans text-[9px] uppercase tracking-wider rounded-xs cursor-pointer"
                    >
                      Add Tag
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {specializations.map((spec, i) => (
                      <span
                        key={i}
                        className="font-sans text-[9px] font-semibold text-paper/80 bg-ink border border-paper/15 px-2 py-1 rounded-xs flex items-center gap-1.5"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() => handleRemoveSpec(spec)}
                          className="text-paper/40 hover:text-red-400 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social & Academic Links */}
                <div className="border-t border-paper/10 pt-4 space-y-3">
                  <span className="font-sans text-[9px] font-bold tracking-widest text-paper/60 uppercase block">
                    Social &amp; Scholarly Network Links
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs">
                      <Linkedin size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="LinkedIn Profile URL or Handle"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs">
                      <Twitter size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="Twitter / X handle or URL"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs">
                      <Instagram size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="Instagram handle or URL"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs">
                      <Globe size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="Personal Website / Portfolio URL"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs">
                      <GraduationCap size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="Google Scholar Profile URL"
                        value={googleScholar}
                        onChange={(e) => setGoogleScholar(e.target.value)}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs">
                      <BookOpen size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        placeholder="ResearchGate or SSRN URL"
                        value={researchGate || ssrn}
                        onChange={(e) => {
                          setResearchGate(e.target.value);
                          setSsrn(e.target.value);
                        }}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-ink p-1.5 border border-paper/10 rounded-xs md:col-span-2">
                      <Mail size={14} className="text-paper/40 shrink-0 ml-1.5" />
                      <input
                        type="email"
                        placeholder="Direct Contact Email (optional)"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-transparent text-paper font-serif text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Priority, Founder Flag & Visibility Settings */}
                <div className="border-t border-paper/10 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-ink/40 p-4 rounded-xs">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[9px] uppercase tracking-wider text-paper/60">
                      Display Priority Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                      className="bg-midnight border border-paper/15 rounded-xs p-1.5 text-paper font-mono text-xs focus:outline-none"
                    />
                    <span className="text-[9px] text-paper/40 font-serif">1 appears first</span>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/80">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => setIsVisible(e.target.checked)}
                        className="accent-blood"
                      />
                      Publicly Visible
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-sans text-[10px] uppercase tracking-wider text-paper/80">
                      <input
                        type="checkbox"
                        checked={isFounder}
                        onChange={(e) => setIsFounder(e.target.checked)}
                        className="accent-amber-400"
                      />
                      ★ Founder Status
                    </label>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="pt-4 border-t border-paper/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-paper/15 rounded-xs text-paper/60 hover:text-paper font-sans text-[9px] uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-blood hover:bg-blood/90 text-paper font-sans text-[9px] font-bold uppercase tracking-widest rounded-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Saving Profile...' : (editingAuthor ? 'Update Author Profile' : 'Publish Contributor')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ DELETE CONFIRMATION MODAL ══ */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-midnight border border-red-500/30 p-6 rounded-sm max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xs">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-paper">
                    Remove Contributor from Registry?
                  </h3>
                  <p className="font-sans text-[9px] uppercase tracking-wider text-paper/40">
                    Irreversible Action
                  </p>
                </div>
              </div>

              <p className="font-serif text-xs text-paper/70 leading-relaxed">
                This will delete the contributor profile from the public registry. Existing articles referencing this author will remain published with their static name preserved.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-1.5 border border-paper/15 rounded-xs text-paper/60 hover:text-paper font-sans text-[9px] uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 bg-red-900 hover:bg-red-800 text-paper font-sans text-[9px] font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md"
                >
                  Confirm Removal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
