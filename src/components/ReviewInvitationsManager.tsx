import React, { useState, useEffect } from 'react';
import { ReviewInvitation, Article, EditorialUser } from '../types';
import { fetchInvitations, createInvitation, revokeInvitation } from '../lib/invitations';
import { 
  Mail, 
  Key, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  UserPlus, 
  RefreshCw,
  FileText,
  Calendar
} from 'lucide-react';

interface ReviewInvitationsManagerProps {
  allArticles: Article[];
  currentUser: EditorialUser | null;
}

export default function ReviewInvitationsManager({
  allArticles,
  currentUser
}: ReviewInvitationsManagerProps) {
  const [invitations, setInvitations] = useState<ReviewInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [role, setRole] = useState<'reviewer' | 'guest_reviewer'>('guest_reviewer');
  const [durationDays, setDurationDays] = useState(14);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInvitations();
      setInvitations(data);
    } catch (e: any) {
      console.error(e);
      setAlert({ text: 'Failed to load invitations', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId) {
      setAlert({ text: 'Please select a target manuscript for review.', type: 'error' });
      return;
    }
    if (!recipientEmail || !recipientName) {
      setAlert({ text: 'Please provide recipient name and institutional email.', type: 'error' });
      return;
    }

    const article = allArticles.find(a => a.id === selectedArticleId);
    if (!article) return;

    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      await createInvitation({
        articleId: article.id,
        articleTitle: article.title,
        recipientEmail,
        recipientName,
        role,
        durationDays,
        actor: currentUser
      });

      setAlert({ text: `Issued cryptographic review invite to ${recipientEmail}.`, type: 'success' });
      setIsModalOpen(false);
      setRecipientEmail('');
      setRecipientName('');
      setSelectedArticleId('');
      await loadData();
    } catch (err: any) {
      setAlert({ text: `Failed to issue invitation: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!currentUser) return;
    try {
      await revokeInvitation(inviteId, currentUser);
      setAlert({ text: 'Review invitation revoked.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setAlert({ text: `Failed to revoke: ${err.message}`, type: 'error' });
    }
  };

  const copyInviteLink = (token: string, articleId: string) => {
    const origin = window.location.origin;
    const url = `${origin}/article/${articleId}?reviewToken=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="flex flex-col gap-6 select-text fade-in">
      {/* Overview & Action Banner */}
      <div className="bg-navy border border-paper/10 p-6 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-blood" />
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood">
              Cryptographic Review Tokens &amp; External Peer Access
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-paper/90">
            Guest Reviewer Invitations
          </h3>
          <p className="font-serif text-xs text-paper/50 leading-relaxed">
            Commission external subject-matter experts, professors, or independent legal analysts to conduct confidential peer reviews on specific unpublished manuscripts. Tokens expire automatically and do not confer administrative or publishing authority.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-5 rounded-sm flex items-center gap-2 shadow-md cursor-pointer transition-all shrink-0"
        >
          <UserPlus size={14} />
          Issue Review Invite
        </button>
      </div>

      {alert && (
        <div className={`p-4 border text-xs leading-relaxed flex justify-between items-center rounded-sm ${
          alert.type === 'success' 
            ? 'bg-green-950/20 text-[#8bc4a8] border-green-500/20' 
            : 'bg-red-950/20 text-red-400 border-red-500/20'
        }`}>
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="text-sm font-bold opacity-60 hover:opacity-100 cursor-pointer">×</button>
        </div>
      )}

      {/* Invitations Table */}
      <div className="bg-navy border border-paper/10 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-paper/10 flex justify-between items-center bg-ink">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-paper/40" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper/60">
              Active &amp; Historical Review Invitations ({invitations.length})
            </span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-paper/40 hover:text-blood text-xs flex items-center gap-1 font-sans uppercase tracking-wider cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-paper/10 bg-midnight text-[9px] font-sans font-bold tracking-widest uppercase text-paper/40">
                <th className="py-3 px-4">Invited Scholar</th>
                <th className="py-3 px-4">Target Manuscript</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Status &amp; Expiry</th>
                <th className="py-3 px-4 text-right">Access Link / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/5 font-serif text-xs text-paper/70">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-paper/30 italic">
                    No active or historical review invitations issued yet. Click "Issue Review Invite" above to invite an external peer reviewer.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const isExpired = Date.now() > inv.expiresAt;
                  const isRevoked = inv.status === 'revoked';

                  return (
                    <tr key={inv.id} className="hover:bg-paper/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-paper/95 text-sm">{inv.recipientName}</span>
                          <span className="font-mono text-[10px] text-paper/40 flex items-center gap-1">
                            <Mail size={10} className="inline" />
                            {inv.recipientEmail}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5 max-w-[240px]">
                          <span className="font-medium text-paper/90 truncate">{inv.articleTitle}</span>
                          <span className="font-mono text-[9px] text-paper/40 truncate">ID: {inv.articleId}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-sans text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border bg-amber-500/10 text-amber-300 border-amber-500/30">
                          {inv.role === 'guest_reviewer' ? 'Guest Scholar' : 'Peer Reviewer'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          {isRevoked ? (
                            <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded-xs border border-red-900/40 w-fit">
                              Revoked
                            </span>
                          ) : isExpired ? (
                            <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-paper/40 bg-paper/5 px-1.5 py-0.5 rounded-xs border border-paper/10 w-fit">
                              Expired
                            </span>
                          ) : (
                            <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-green-400 bg-green-950/20 px-1.5 py-0.5 rounded-xs border border-green-800/40 w-fit">
                              Active / Valid
                            </span>
                          )}
                          <span className="font-mono text-[9px] text-paper/40">
                            Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isRevoked && !isExpired && (
                            <button
                              onClick={() => copyInviteLink(inv.token, inv.articleId)}
                              className="font-sans text-[9px] uppercase font-bold tracking-wider py-1 px-2.5 bg-paper/5 hover:bg-paper/10 border border-paper/15 text-paper/80 rounded-xs flex items-center gap-1 cursor-pointer transition-colors"
                              title="Copy secure review URL"
                            >
                              <Copy size={11} />
                              {copiedToken === inv.token ? 'Copied!' : 'Copy Link'}
                            </button>
                          )}

                          {!isRevoked && (
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              className="font-sans text-[9px] uppercase font-bold tracking-wider py-1 px-2 border border-red-900/30 text-red-400 hover:bg-red-950/30 rounded-xs cursor-pointer transition-colors"
                              title="Revoke access token"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ink border border-paper/20 rounded-sm w-full max-w-xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex justify-between items-start border-b border-paper/10 pb-3">
              <div>
                <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-blood">
                  Peer Review Access Control
                </span>
                <h3 className="font-display text-xl font-bold text-paper mt-1">
                  Issue Guest Review Invitation
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-paper/40 hover:text-paper font-sans text-xs uppercase cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4 text-xs font-serif">
              <div className="flex flex-col gap-1">
                <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                  Target Manuscript *
                </label>
                <select
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                  required
                  className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif"
                >
                  <option value="">-- Choose Article Manuscript --</option>
                  {allArticles.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.status.toUpperCase()}] {a.title} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. / Dr. / Researcher Name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-serif"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Recipient Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="scholar@university.edu"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Invited Role Tier
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-sans text-xs"
                  >
                    <option value="guest_reviewer">Guest Reviewer (Single Manuscript Only)</option>
                    <option value="reviewer">Peer Reviewer (Manuscript &amp; General Corpus)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40">
                    Token Validity Duration
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="bg-midnight border border-paper/15 text-paper p-2.5 rounded-sm focus:outline-none focus:border-blood font-sans text-xs"
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days (Standard)</option>
                    <option value={30}>30 Days (Extended In-Depth Review)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-paper/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-paper/15 hover:border-paper/30 font-sans text-[9px] font-bold uppercase tracking-wider text-paper/60 rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blood hover:bg-blood-light font-sans text-[9px] font-bold uppercase tracking-widest text-paper rounded-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Issue Invitation Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
