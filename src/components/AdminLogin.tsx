import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { 
  KeyRound, 
  Mail, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Lock,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { fetchEditorialTeam, DESIGNATED_OWNER_EMAIL, isOwner } from '../lib/rbac';
import { EditorialUser } from '../types';
import AccountSetupScreen from './AccountSetupScreen';

interface AdminLoginProps {
  onLoginSuccess: (user: User, role?: string, editorialMember?: EditorialUser | null) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password mode state
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState(DESIGNATED_OWNER_EMAIL);

  // Setup / Invitation token mode state
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [tokenInputMode, setTokenInputMode] = useState(false);
  const [manualToken, setManualToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    // Check if URL has setup_token or invite_token
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('setup_token') || urlParams.get('invite_token');
      if (tokenParam) {
        setSetupToken(tokenParam);
      }
    } catch {}

    // Auto-login only if active session belongs to the designated owner or an active registered staff member
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. If it's the designated root owner
        if (user.email && user.email.toLowerCase() === DESIGNATED_OWNER_EMAIL.toLowerCase()) {
          const ownerMember: EditorialUser = {
            uid: user.uid,
            email: DESIGNATED_OWNER_EMAIL,
            displayName: user.displayName || 'Priyasha Priyal Jena',
            role: 'owner',
            authorId: 'priyasha-priyal-jena',
            status: 'active'
          };
          onLoginSuccess(user, 'owner', ownerMember);
          return;
        }

        // 2. Check team registry in Firestore
        try {
          const team = await fetchEditorialTeam();
          const member = team.find(m => m.email.toLowerCase() === (user.email || '').toLowerCase());
          
          if (member) {
            if (member.status === 'suspended' || member.status === 'revoked') {
              signOut(auth).catch(console.error);
              localStorage.removeItem('tol_editorial_session');
              setMessageType('error');
              setMessage(`Access Denied: The account for ${user.email} is currently ${member.status}.`);
              return;
            }
            
            localStorage.setItem('tol_editorial_session', JSON.stringify(member));
            onLoginSuccess(user, member.role, member);
            return;
          }
        } catch (e) {}

        // Otherwise sign out unrecognized account
        signOut(auth).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [onLoginSuccess]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail) {
      setMessageType('error');
      setMessage('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setMessageType('error');
      setMessage('Please enter your individual password.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Direct individual authentication via Firebase Auth (NO shared passwords)
      const cred = await signInWithEmailAndPassword(auth, inputEmail, password);
      const user = cred.user;

      // 1. If Owner
      if (inputEmail === DESIGNATED_OWNER_EMAIL.toLowerCase()) {
        const ownerMember: EditorialUser = {
          uid: user.uid,
          email: DESIGNATED_OWNER_EMAIL,
          displayName: user.displayName || 'Priyasha Priyal Jena',
          role: 'owner',
          authorId: 'priyasha-priyal-jena',
          status: 'active'
        };
        localStorage.removeItem('tol_editorial_session');
        setMessageType('success');
        setMessage('Owner credentials verified. Opening Owner Console...');
        onLoginSuccess(user, 'owner', ownerMember);
        return;
      }

      // 2. Look up the email in the Editorial Staff / Author registry
      const team = await fetchEditorialTeam();
      const member = team.find(m => m.email.toLowerCase() === inputEmail);

      if (!member) {
        await signOut(auth);
        setMessageType('error');
        setMessage(`Access Denied: "${inputEmail}" does not have an assigned role in The Oligarchy editorial system. Contact the Owner to receive an invitation.`);
        return;
      }

      if (member.status === 'suspended' || member.status === 'revoked') {
        await signOut(auth);
        setMessageType('error');
        setMessage(`Access Denied: The account for "${inputEmail}" has been ${member.status} by the Owner.`);
        return;
      }

      // Save verified editorial session
      localStorage.setItem('tol_editorial_session', JSON.stringify(member));
      localStorage.removeItem('tol_simulated_role');

      const roleDisplay = member.role === 'admin' ? 'Managing Editor' : member.role === 'reviewer' ? 'Peer Reviewer' : 'Scholar Contributor';
      setMessageType('success');
      setMessage(`Welcome back, ${member.displayName || inputEmail}! Verified as ${roleDisplay}. Loading workspace...`);
      onLoginSuccess(user, member.role, member);

    } catch (err: any) {
      console.warn('Authentication notice:', err.code, err.message);
      setMessageType('error');
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMessage('Access denied: Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/user-not-found') {
        setMessage('No account found with this email. If you received an invitation token, please use the "Set Up Account" link below.');
      } else if (err.code === 'auth/too-many-requests') {
        setMessage('Too many failed sign-in attempts. Please reset your password or try again later.');
      } else {
        setMessage(`Sign-in notice: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      setMessageType('error');
      setMessage('Please provide your account email address.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setMessageType('success');
      setMessage(`A password reset link has been dispatched to ${targetEmail}. Please check your inbox.`);
    } catch (err: any) {
      console.warn('Password reset notice:', err.code, err.message);
      if (err.code === 'auth/too-many-requests') {
        setMessageType('error');
        setMessage('Too many reset requests. Please wait a few moments before trying again.');
      } else {
        setMessageType('success');
        setMessage(`If ${targetEmail} is registered in the system, a password reset link has been dispatched to your inbox.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // If a setup token is active, show the Account Setup / Set Password screen
  if (setupToken) {
    return (
      <AccountSetupScreen
        token={setupToken}
        onComplete={(user, role, member) => {
          // Clean token from URL
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('setup_token');
            url.searchParams.delete('invite_token');
            window.history.replaceState({}, document.title, url.pathname);
          } catch {}
          onLoginSuccess(user, role, member);
        }}
        onCancel={() => {
          setSetupToken(null);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('setup_token');
            url.searchParams.delete('invite_token');
            window.history.replaceState({}, document.title, url.pathname);
          } catch {}
        }}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 md:my-20 px-6 fade-in select-none">
      <div className="bg-navy border border-paper/10 p-8 rounded-sm shadow-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col gap-2 text-center items-center">
          <div className="w-10 h-10 rounded-full bg-blood/10 border border-blood/30 flex items-center justify-center text-blood mb-2">
            <Lock size={18} />
          </div>
          <span className="font-serif text-[10px] tracking-widest uppercase text-paper/40 font-semibold">
            The Oligarchy • Editorial System
          </span>
          <h2 className="font-serif text-2xl font-bold text-paper">
            {isForgotPasswordMode ? 'Reset Account Password' : tokenInputMode ? 'Enter Invitation Token' : 'Editorial Workspace'}
          </h2>
          <p className="font-serif text-xs text-paper/60 leading-relaxed">
            {isForgotPasswordMode
              ? 'Enter your individual account email to receive a secure password reset link.'
              : tokenInputMode
              ? 'Paste the invitation token issued by the Owner to create your personal account.'
              : 'Sign in with your individual scholarly credentials.'}
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            id="admin-login-message"
            className={`p-3 text-xs font-serif leading-relaxed flex items-start gap-2.5 rounded-sm border ${
              messageType === 'error'
                ? 'bg-blood/20 text-blood-light border-blood/50'
                : messageType === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                : 'bg-paper/5 text-paper/70 border-paper/15'
            }`}
          >
            {messageType === 'error' && <AlertCircle size={15} className="shrink-0 mt-0.5 text-blood" />}
            {messageType === 'success' && <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />}
            {messageType === 'info' && <Info size={15} className="shrink-0 mt-0.5 text-paper/50" />}
            <span>{message}</span>
          </div>
        )}

        {/* Token Input Mode */}
        {tokenInputMode ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (manualToken.trim()) {
              setSetupToken(manualToken.trim());
            } else {
              setMessage('Please enter your invitation token.');
              setMessageType('error');
            }
          }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                Setup Token
              </label>
              <div className="flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm focus-within:border-blood transition-colors">
                <ShieldCheck size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="Paste your invitation token..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="bg-transparent text-paper font-mono text-xs focus:outline-none w-full placeholder-paper/20"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-blood hover:bg-blood-light text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 mt-1 transition-all cursor-pointer shadow-md rounded-sm"
            >
              Verify Token & Setup Account →
            </button>

            <button
              type="button"
              onClick={() => {
                setTokenInputMode(false);
                setMessage('');
              }}
              className="font-sans text-xs text-paper/40 hover:text-paper text-center transition-colors mt-1"
            >
              Cancel & Return to Sign In
            </button>
          </form>
        ) : isForgotPasswordMode ? (
          /* Forgot Password Mode */
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                Account Email
              </label>
              <div className="flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm focus-within:border-blood transition-colors">
                <Mail size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  type="email"
                  required
                  placeholder="your.email@institution.org"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={loading}
                  className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blood hover:bg-blood-light disabled:bg-blood/40 text-paper font-sans text-xs font-bold tracking-widest uppercase py-3 mt-1 transition-all cursor-pointer shadow-md rounded-sm"
            >
              {loading ? 'Dispatching Link...' : 'Send Password Reset Link →'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordMode(false);
                setMessage('');
              }}
              className="flex items-center justify-center gap-1.5 font-sans text-xs text-paper/40 hover:text-paper transition-colors mt-1"
            >
              <ArrowLeft size={12} /> Back to Sign In
            </button>
          </form>
        ) : (
          /* Standard Sign In Mode */
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                Account Email
              </label>
              <div id="email-input-wrapper" className="flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm focus-within:border-blood transition-colors">
                <Mail size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  id="admin-login-email-input"
                  type="email"
                  required
                  placeholder="scholar@theoligarchy.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[10px] uppercase tracking-wider text-paper/60 font-semibold">
                  Personal Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(true);
                    setResetEmail(email || DESIGNATED_OWNER_EMAIL);
                    setMessage('');
                  }}
                  className="font-sans text-[9px] uppercase tracking-wider text-blood hover:text-blood-light hover:underline bg-none border-none p-0 cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div id="password-input-wrapper" className="relative flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm focus-within:border-blood transition-colors">
                <KeyRound size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  id="admin-login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/20 pr-2"
                />
                <button
                  id="admin-login-show-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="text-paper/30 hover:text-paper/70 transition-colors p-0.5 ml-1 shrink-0 cursor-pointer flex items-center justify-center focus:outline-none"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blood hover:bg-blood-light disabled:bg-blood/40 text-paper font-sans text-xs font-bold tracking-widest uppercase py-3.5 mt-2 transition-all cursor-pointer shadow-md rounded-sm"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace →'}
            </button>
          </form>
        )}

        {/* Invitation Token helper footer */}
        {!tokenInputMode && !isForgotPasswordMode && (
          <div className="bg-midnight/50 border border-paper/10 p-3 rounded-sm flex items-center justify-between text-[10px] font-sans">
            <span className="text-paper/50">Received an invitation link or token?</span>
            <button
              type="button"
              onClick={() => {
                setTokenInputMode(true);
                setMessage('');
              }}
              className="text-blood-light hover:underline font-semibold uppercase tracking-wider cursor-pointer"
            >
              Set Up Account →
            </button>
          </div>
        )}

        {/* Security and RBAC footer */}
        <div className="border-t border-paper/10 pt-4 flex flex-col gap-1 items-center justify-center text-center font-sans text-[9px] text-paper/30 tracking-wider">
          <div className="flex gap-2 items-center">
            <span>Isolated Personal Credentials</span>
            <span>•</span>
            <span>Zero Shared Passwords</span>
            <span>•</span>
            <span>Role-Based Access</span>
          </div>
          <span className="text-[8px] text-paper/20">The Owner remains the sole administrator. Authors, editors, and reviewers access only their assigned workspaces.</span>
        </div>
      </div>
    </div>
  );
}
