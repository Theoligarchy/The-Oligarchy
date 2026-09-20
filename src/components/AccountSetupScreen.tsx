import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  User 
} from 'firebase/auth';
import { 
  ShieldCheck, 
  KeyRound, 
  User as UserIcon, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { validateUserInvitationToken, completeUserAccountSetup } from '../lib/invitations';
import { UserAccountInvitation, EditorialUser } from '../types';
import { ROLE_LABELS } from '../lib/rbac';

interface AccountSetupScreenProps {
  token: string;
  onComplete: (user: User, role: string, member: EditorialUser) => void;
  onCancel: () => void;
}

export default function AccountSetupScreen({ token, onComplete, onCancel }: AccountSetupScreenProps) {
  const [invitation, setInvitation] = useState<UserAccountInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Existing account fallback mode if already registered in Auth
  const [existingAccountMode, setExistingAccountMode] = useState(false);

  useEffect(() => {
    async function loadInvitation() {
      setLoading(true);
      setError('');
      try {
        const invite = await validateUserInvitationToken(token);
        if (!invite) {
          setError('This invitation link is invalid or has been revoked by the Owner.');
        } else if (invite.status === 'expired') {
          setError('This invitation link has expired. Please request a new invitation from the Owner.');
        } else if (invite.status === 'accepted') {
          setError('This invitation has already been accepted. You can sign in using your existing email and password.');
        } else {
          setInvitation(invite);
          setDisplayName(invite.displayName || '');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to validate invitation token.');
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const passwordsMatch = password && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasLetters && hasNumbers && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (!displayName.trim()) {
      setError('Please enter your legal or scholarly display name.');
      return;
    }

    if (!isPasswordValid && !existingAccountMode) {
      setError('Please ensure your password meets the complexity requirements.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let activeUser: User;

      if (existingAccountMode) {
        // Sign in with their existing individual password
        const cred = await signInWithEmailAndPassword(auth, invitation.email, password);
        activeUser = cred.user;
      } else {
        // Create their unique new individual Firebase Auth account
        try {
          const cred = await createUserWithEmailAndPassword(auth, invitation.email, password);
          activeUser = cred.user;
          await updateProfile(activeUser, { displayName: displayName.trim() });
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            setExistingAccountMode(true);
            setError('An account with this email address already exists in the system. Please enter your existing personal password to link this editorial role.');
            setSubmitting(false);
            return;
          }
          throw authErr;
        }
      }

      // Activate membership in Firestore and record audit log
      const activatedMember = await completeUserAccountSetup({
        token: invitation.token,
        uid: activeUser.uid,
        displayName: displayName.trim(),
        email: invitation.email
      });

      // Save local editorial session
      localStorage.setItem('tol_editorial_session', JSON.stringify(activatedMember));

      onComplete(activeUser, activatedMember.role, activatedMember);
    } catch (err: any) {
      console.error('Account setup failure:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password for this existing account.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(err.message || 'An unexpected error occurred during account initialization.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const roleMeta = invitation ? ROLE_LABELS[invitation.role] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0c10] border border-paper/20 w-full max-w-md p-6 sm:p-8 rounded-sm shadow-2xl relative text-paper my-8">
        {/* Top Branding Header */}
        <div className="flex items-center justify-between pb-4 border-b border-paper/10 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blood rounded-full animate-pulse" />
            <span className="font-serif text-xs tracking-widest uppercase text-paper/70 font-semibold">
              The Oligarchy • Scholar Onboarding
            </span>
          </div>
          <button 
            onClick={onCancel}
            className="text-paper/40 hover:text-paper text-xs flex items-center gap-1 font-sans transition-colors"
          >
            <ArrowLeft size={12} /> Return
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-blood border-t-transparent rounded-full animate-spin" />
            <p className="font-serif text-sm text-paper/60">Verifying secure invitation token...</p>
          </div>
        ) : error && !invitation ? (
          <div className="py-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blood/20 text-blood flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-paper">Invitation Unavailable</h3>
            <p className="font-serif text-xs text-paper/60 leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
            <button
              onClick={onCancel}
              className="mt-4 bg-paper/10 hover:bg-paper/20 text-paper font-sans text-xs uppercase tracking-wider py-2.5 px-6 rounded-sm transition-colors mx-auto"
            >
              Back to Sign In
            </button>
          </div>
        ) : invitation && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-blood" size={20} />
                <h2 className="font-serif text-xl font-bold text-paper">Create Your Account</h2>
              </div>
              <p className="font-serif text-xs text-paper/60 leading-relaxed">
                You have been invited by the Owner to join the editorial system. Create your private login credentials below.
              </p>
            </div>

            {/* Invited Role & Identity Card */}
            <div className="bg-midnight/60 border border-paper/10 p-4 rounded-sm mb-6 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] uppercase tracking-wider text-paper/40">Invited Role</span>
                <span className={`text-[10px] font-sans font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm border ${roleMeta?.color || 'text-paper'}`}>
                  {roleMeta?.badge || invitation.role.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-serif">
                <span className="text-paper/40 font-sans text-[10px] uppercase tracking-wider">Account Email</span>
                <span className="text-paper font-mono text-[11px] font-medium">{invitation.email}</span>
              </div>
              {roleMeta && (
                <p className="text-[11px] font-serif text-paper/50 italic border-t border-paper/5 pt-2 mt-1">
                  {roleMeta.desc}
                </p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="bg-blood/20 border border-blood/50 text-blood-light text-xs font-serif p-3 rounded-sm flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-blood" />
                  <span>{error}</span>
                </div>
              )}

              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                  Scholarly Display Name
                </label>
                <div className="flex items-center bg-midnight border border-paper/15 rounded-sm px-3 py-2 text-xs focus-within:border-blood transition-colors">
                  <UserIcon size={14} className="text-paper/30 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Dr. Eleanor Vance"
                    disabled={submitting}
                    className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                    {existingAccountMode ? 'Enter Existing Password' : 'Create Private Password'}
                  </label>
                </div>
                <div className="flex items-center bg-midnight border border-paper/15 rounded-sm px-3 py-2 text-xs focus-within:border-blood transition-colors">
                  <KeyRound size={14} className="text-paper/30 mr-2.5 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={submitting}
                    className="bg-transparent text-paper font-mono focus:outline-none w-full placeholder-paper/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="text-paper/40 hover:text-paper p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (only in new registration mode) */}
              {!existingAccountMode && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                    Confirm Password
                  </label>
                  <div className="flex items-center bg-midnight border border-paper/15 rounded-sm px-3 py-2 text-xs focus-within:border-blood transition-colors">
                    <Lock size={14} className="text-paper/30 mr-2.5 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      disabled={submitting}
                      className="bg-transparent text-paper font-mono focus:outline-none w-full placeholder-paper/20"
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements Checklist */}
              {!existingAccountMode && (
                <div className="bg-midnight/40 border border-paper/10 p-3 rounded-sm flex flex-col gap-1.5 font-sans text-[10px] text-paper/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={hasMinLength ? 'text-emerald-400' : 'text-paper/20'} />
                    <span>At least 8 characters long</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={(hasLetters && hasNumbers) ? 'text-emerald-400' : 'text-paper/20'} />
                    <span>Contains letters and numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={passwordsMatch ? 'text-emerald-400' : 'text-paper/20'} />
                    <span>Passwords match</span>
                  </div>
                </div>
              )}

              {/* Security guarantee note */}
              <p className="text-[10px] font-serif text-paper/40 italic leading-relaxed">
                Your password is protected by Firebase Authentication encryption. The Owner and staff never have access to view your password.
              </p>

              <button
                type="submit"
                disabled={submitting || (!existingAccountMode && !isPasswordValid)}
                className="bg-blood hover:bg-blood-light disabled:bg-blood/30 disabled:cursor-not-allowed text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 px-4 rounded-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                    <span>Initializing Account...</span>
                  </>
                ) : (
                  <>
                    <span>{existingAccountMode ? 'Link Account & Enter' : 'Complete Setup & Enter'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
