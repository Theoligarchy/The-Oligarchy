import React, { useState, useEffect } from 'react';
import { EditorialUser, EditorialRole } from '../types';
import { 
  fetchEditorialTeam, 
  saveEditorialMember, 
  deleteEditorialMember, 
  ROLE_LABELS 
} from '../lib/rbac';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Award, 
  Mail, 
  Building, 
  GraduationCap, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  FileText, 
  HelpCircle,
  ExternalLink,
  Shield,
  Eye,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditorialTeamManagerProps {
  currentUserRole: EditorialRole;
  onSimulateRoleChange?: (role: EditorialRole) => void;
  activeSimulatedRole?: EditorialRole;
}

export default function EditorialTeamManager({ 
  currentUserRole,
  onSimulateRoleChange,
  activeSimulatedRole
}: EditorialTeamManagerProps) {
  const [team, setTeam] = useState<EditorialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal / Form state for Adding or Editing member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<EditorialRole>('author');
  const [formInstitution, setFormInstitution] = useState('');
  const [formCredentials, setFormCredentials] = useState('');
  const [formOrcid, setFormOrcid] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formCategories, setFormCategories] = useState<('criminology' | 'psyche' | 'politics')[]>(['criminology']);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmUid, setDeleteConfirmUid] = useState<string | null>(null);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const list = await fetchEditorialTeam();
      setTeam(list);
    } catch (e: any) {
      console.error(e);
      setAlert({ text: 'Failed to load team registry.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const openAddModal = () => {
    setEditingUid(null);
    setFormName('');
    setFormEmail('');
    setFormRole('author');
    setFormInstitution('');
    setFormCredentials('');
    setFormOrcid('');
    setFormBio('');
    setFormCategories(['criminology']);
    setIsModalOpen(true);
  };

  const openEditModal = (member: EditorialUser) => {
    setEditingUid(member.uid);
    setFormName(member.displayName || '');
    setFormEmail(member.email || '');
    setFormRole(member.role);
    setFormInstitution(member.institution || '');
    setFormCredentials(member.credentials || '');
    setFormOrcid(member.orcid || '');
    setFormBio(member.bio || '');
    setFormCategories(member.assignedCategories || ['criminology']);
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setAlert({ text: 'Name and Email are required fields.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const uid = editingUid || `member-${Date.now().toString(36)}`;
      const authorId = formName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const memberData: EditorialUser = {
        uid,
        email: formEmail.trim().toLowerCase(),
        displayName: formName.trim(),
        role: formRole,
        authorId,
        institution: formInstitution.trim() || undefined,
        credentials: formCredentials.trim() || undefined,
        orcid: formOrcid.trim() || undefined,
        bio: formBio.trim() || undefined,
        assignedCategories: formCategories,
        status: 'active',
        createdAt: editingUid ? (team.find(m => m.uid === editingUid)?.createdAt || Date.now()) : Date.now(),
        lastLoginAt: Date.now()
      };

      await saveEditorialMember(memberData);
      setAlert({ 
        text: editingUid ? `Updated editorial privileges for ${memberData.displayName}.` : `Registered new ${ROLE_LABELS[formRole].title}: ${memberData.displayName}.`, 
        type: 'success' 
      });
      setIsModalOpen(false);
      await loadTeam();
    } catch (e: any) {
      setAlert({ text: `Failed to save member: ${e.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickRoleChange = async (member: EditorialUser, newRole: EditorialRole) => {
    try {
      const updated: EditorialUser = { ...member, role: newRole };
      await saveEditorialMember(updated);
      setAlert({ text: `Updated ${member.displayName}'s role to ${ROLE_LABELS[newRole].badge}.`, type: 'success' });
      await loadTeam();
    } catch (e: any) {
      setAlert({ text: `Failed to update role: ${e.message}`, type: 'error' });
    }
  };

  const handleDeleteMember = async (uid: string) => {
    try {
      await deleteEditorialMember(uid);
      setAlert({ text: 'Editorial team member removed.', type: 'success' });
      setDeleteConfirmUid(null);
      await loadTeam();
    } catch (e: any) {
      setAlert({ text: `Deletion failed: ${e.message}`, type: 'error' });
    }
  };

  const toggleCategory = (cat: 'criminology' | 'psyche' | 'politics') => {
    if (formCategories.includes(cat)) {
      if (formCategories.length > 1) {
        setFormCategories(formCategories.filter(c => c !== cat));
      }
    } else {
      setFormCategories([...formCategories, cat]);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-text fade-in">
      
      {/* Overview Banner & Explainer */}
      <div className="bg-navy border border-paper/10 p-6 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blood" />
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood">
              Role-Based Access Control (RBAC) Architecture
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-paper/90">
            Editorial Staff &amp; Research Fellow Registry
          </h3>
          <p className="font-serif text-xs text-paper/50 leading-relaxed">
            Manage granular permissions across the editorial hierarchy. Author/Guest Researchers can compose and view their own manuscripts; Peer Reviewers access review queues, scorecards, and line-by-line marginalia; Managing Editors hold complete publishing and dispatch authority.
          </p>
        </div>

        {currentUserRole === 'admin' && (
          <button
            onClick={openAddModal}
            className="bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-5 rounded-sm flex items-center gap-2 shadow-md cursor-pointer transition-all shrink-0"
          >
            <UserPlus size={14} />
            Add Staff / Fellow
          </button>
        )}
      </div>

      {/* Role Hierarchy Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['admin', 'reviewer', 'author'] as EditorialRole[]).map((roleKey) => {
          const info = ROLE_LABELS[roleKey];
          const count = team.filter(m => m.role === roleKey).length;
          return (
            <div key={roleKey} className="bg-navy/60 border border-paper/10 p-5 rounded-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className={`font-sans text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border ${info.color}`}>
                  {info.badge}
                </span>
                <span className="font-mono text-xs text-paper/40 font-semibold">
                  {count} {count === 1 ? 'member' : 'members'}
                </span>
              </div>
              <h4 className="font-display text-base font-bold text-paper/90">{info.title}</h4>
              <p className="font-serif text-xs text-paper/50 leading-relaxed flex-1">
                {info.desc}
              </p>
              <div className="border-t border-paper/5 pt-2 mt-auto">
                <span className="font-sans text-[8px] uppercase tracking-wider text-paper/30 block">
                  Key Scope:
                </span>
                <span className="font-sans text-[9px] text-paper/60 font-semibold">
                  {roleKey === 'admin' ? 'Publishing · Curation · Newsletter · RBAC' : 
                   roleKey === 'reviewer' ? 'Peer Review Queue · Marginalia · Revisions' : 
                   'Drafts · Submissions · Personal Scholar Bio'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`p-4 border text-xs leading-relaxed flex justify-between items-center rounded-sm ${
          alert.type === 'success' 
            ? 'bg-green-950/20 text-[#8bc4a8] border-green-500/20' 
            : 'bg-red-950/20 text-red-400 border-red-500/20'
        }`}>
          <span className="font-serif flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {alert.text}
          </span>
          <button onClick={() => setAlert(null)} className="text-base leading-none font-bold opacity-50 hover:opacity-100 cursor-pointer">×</button>
        </div>
      )}

      {/* Team Roster Table */}
      <div className="bg-navy border border-paper/10 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-paper/10 flex justify-between items-center bg-ink">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-paper/40" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper/60">
              Registered Editorial Staff ({team.length})
            </span>
          </div>
          <button 
            onClick={loadTeam} 
            disabled={loading}
            className="text-paper/40 hover:text-blood text-xs flex items-center gap-1 font-sans uppercase tracking-wider cursor-pointer"
            title="Refresh Roster"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-paper/10 bg-midnight text-[9px] font-sans font-bold tracking-widest uppercase text-paper/40">
                <th className="py-3 px-4">Scholar / Contributor</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Affiliation &amp; ORCID</th>
                <th className="py-3 px-4">Research Scope</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/5 font-serif text-xs text-paper/70">
              {team.map((member) => {
                const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.author;
                const isPrimaryFounder = member.email.toLowerCase() === 'theoligarchy.ppj@gmail.com';

                return (
                  <tr key={member.uid} className="hover:bg-paper/[0.02] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-paper/95 text-sm flex items-center gap-1.5">
                          {member.displayName}
                          {isPrimaryFounder && (
                            <span className="font-sans text-[8px] bg-blood text-paper px-1.5 py-0.2 rounded-xs font-semibold uppercase tracking-wider">
                              Primary Editor
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[10px] text-paper/40 flex items-center gap-1">
                          <Mail size={10} className="inline" />
                          {member.email}
                        </span>
                        {member.credentials && (
                          <span className="font-sans text-[9px] text-paper/50 italic">
                            {member.credentials}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {currentUserRole === 'admin' && !isPrimaryFounder ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleQuickRoleChange(member, e.target.value as EditorialRole)}
                          className="bg-midnight border border-paper/15 text-paper font-sans text-[10px] font-semibold tracking-wider uppercase py-1 px-2.5 rounded-sm focus:outline-none focus:border-blood cursor-pointer"
                        >
                          <option value="author">Guest Researcher</option>
                          <option value="reviewer">Peer Reviewer</option>
                          <option value="admin">Managing Editor</option>
                        </select>
                      ) : (
                        <span className={`inline-block font-sans text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border ${roleInfo.color}`}>
                          {roleInfo.badge}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5 font-sans text-[10px] text-paper/60">
                        {member.institution ? (
                          <span className="flex items-center gap-1">
                            <Building size={10} className="text-paper/30 shrink-0" />
                            <span className="truncate max-w-[180px]">{member.institution}</span>
                          </span>
                        ) : (
                          <span className="text-paper/20 italic">Independent Scholar</span>
                        )}
                        {member.orcid && (
                          <span className="font-mono text-[9px] text-green-400/80 flex items-center gap-1">
                            <GraduationCap size={10} className="shrink-0" />
                            {member.orcid}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(member.assignedCategories || ['criminology']).map(cat => (
                          <span key={cat} className="font-sans text-[8px] uppercase tracking-wider bg-paper/5 text-paper/50 border border-paper/10 px-1.5 py-0.2 rounded-xs">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 border border-paper/10 hover:border-blood hover:text-blood text-paper/40 rounded-sm cursor-pointer transition-colors"
                          title="Edit Profile & Permissions"
                        >
                          <Edit3 size={13} />
                        </button>

                        {currentUserRole === 'admin' && !isPrimaryFounder && (
                          deleteConfirmUid === member.uid ? (
                            <div className="flex items-center gap-1 bg-red-950/40 border border-red-900/50 p-1 rounded-sm text-[8px] font-sans">
                              <span className="text-red-400 font-bold uppercase mr-1">Revoke?</span>
                              <button
                                onClick={() => handleDeleteMember(member.uid)}
                                className="bg-red-800 text-white font-bold px-1.5 py-0.5 rounded-xs cursor-pointer uppercase"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmUid(null)}
                                className="bg-paper/10 text-paper/70 font-bold px-1.5 py-0.5 rounded-xs cursor-pointer uppercase"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmUid(member.uid)}
                              className="p-1.5 border border-paper/10 hover:border-red-500/40 hover:text-red-400 text-paper/30 rounded-sm cursor-pointer transition-colors"
                              title="Revoke Staff Access"
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Editorial Staff */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-navy border border-paper/20 rounded-sm max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-paper/10 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blood" />
                  <h3 className="font-display text-lg font-bold text-paper">
                    {editingUid ? 'Edit Editorial Profile & Role' : 'Register Editorial Fellow / Reviewer'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-paper/40 hover:text-paper text-lg font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="flex flex-col gap-4 text-xs font-serif">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Alistair Vance"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="scholar@university.edu"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Assign Editorial Role *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['author', 'reviewer', 'admin'] as EditorialRole[]).map((r) => {
                      const selected = formRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormRole(r)}
                          className={`p-2.5 rounded-sm border text-center font-sans text-[9px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                            selected 
                              ? 'bg-blood/20 border-blood text-paper ring-1 ring-blood' 
                              : 'bg-midnight border-paper/10 text-paper/40 hover:border-paper/30'
                          }`}
                        >
                          {r === 'admin' ? 'Managing Editor' : r === 'reviewer' ? 'Peer Reviewer' : 'Guest Researcher'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                      Academic Institution / Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Oxford Criminology Dept"
                      value={formInstitution}
                      onChange={(e) => setFormInstitution(e.target.value)}
                      className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                      ORCID iD
                    </label>
                    <input
                      type="text"
                      placeholder="0000-0002-1825-0097"
                      value={formOrcid}
                      onChange={(e) => setFormOrcid(e.target.value)}
                      className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Scholarly Credentials / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. D.Phil, Reader in Quantitative Forensic Profiling"
                    value={formCredentials}
                    onChange={(e) => setFormCredentials(e.target.value)}
                    className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Assigned Primary Research Divisions
                  </label>
                  <div className="flex gap-2">
                    {(['criminology', 'psyche', 'politics'] as const).map(cat => {
                      const active = formCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`font-sans text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-sm border cursor-pointer ${
                            active 
                              ? 'bg-blood border-blood text-paper font-bold' 
                              : 'bg-midnight border-paper/10 text-paper/40'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Scholar Biography / Profile Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief background on researcher focus areas and investigations..."
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-paper/10 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="font-sans text-[9px] font-bold uppercase tracking-widest px-4 py-2.5 border border-paper/15 text-paper/60 hover:text-paper rounded-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-blood hover:bg-blood-light disabled:opacity-50 font-sans text-[9px] font-bold uppercase tracking-widest px-6 py-2.5 text-paper rounded-sm cursor-pointer shadow-md"
                  >
                    {isSaving ? 'Saving Privileges...' : editingUid ? 'Update Member' : 'Register Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
