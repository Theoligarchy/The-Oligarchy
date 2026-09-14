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
  Lock
} from 'lucide-react';
import { fetchEditorialTeam } from '../lib/rbac';
import { EditorialUser } from '../types';

interface AdminLoginProps {
  onLoginSuccess: (user: User, role?: string, editorialMember?: EditorialUser | null) => void;
}

const DESIGNATED_ADMIN_EMAIL = 'theoligarchy.ppj@gmail.com';

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password mode state
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState(DESIGNATED_ADMIN_EMAIL);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    // Purge any legacy unencrypted local admin tokens from previous sessions
    localStorage.removeItem('local_admin_session');

    // Auto-login only if active session belongs to the designated admin or a registered staff member
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Check if an editorial team session is already cached locally
        try {
          const cachedSession = localStorage.getItem('tol_editorial_session');
          if (cachedSession) {
            const member = JSON.parse(cachedSession);
            if (member && member.email && member.role && member.status !== 'suspended') {
              onLoginSuccess(user, member.role, member);
              return;
            }
          }
        } catch (e) {}

        // 2. If it's the designated primary admin
        if (user.email && user.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
          onLoginSuccess(user, 'admin', null);
        } else {
          // 3. Check if user.email matches a registered editorial team member
          try {
            const team = await fetchEditorialTeam();
            const member = team.find(m => m.email.toLowerCase() === (user.email || '').toLowerCase());
            if (member && member.status !== 'suspended') {
              localStorage.setItem('tol_editorial_session', JSON.stringify(member));
              onLoginSuccess(user, member.role, member);
              return;
            }
          } catch (e) {}

          // Otherwise sign out unauthorized account
          signOut(auth).catch(console.error);
        }
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
      setMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 1. Check if logging in as the primary designated administrator
      if (inputEmail === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
        const userCredential = await signInWithEmailAndPassword(auth, DESIGNATED_ADMIN_EMAIL, password);
        const user = userCredential.user;

        localStorage.removeItem('tol_editorial_session');
        setMessageType('success');
        setMessage('Managing Editor credentials verified. Entering console...');
        onLoginSuccess(user, 'admin', null);
        return;
      }

      // 2. Look up the email in the Editorial Staff / Author registry
      const team = await fetchEditorialTeam();
      const member = team.find(m => m.email.toLowerCase() === inputEmail);

      if (!member) {
        setMessageType('error');
        setMessage(`Access Denied: "${inputEmail}" is not registered in the editorial staff registry. Please contact the Managing Editor to receive access.`);
        return;
      }

      if (member.status === 'suspended') {
        setMessageType('error');
        setMessage(`Access Denied: The account for "${inputEmail}" has been suspended. Please contact the Managing Editor.`);
        return;
      }

      // 3. Verify password via Firebase Authentication:
      // Try direct authentication first (if user has an individual Firebase Auth record),
      // otherwise authenticate against the shared editorial credentials
      let authenticatedUser: User | null = null;
      try {
        const directCred = await signInWithEmailAndPassword(auth, inputEmail, password);
        authenticatedUser = directCred.user;
      } catch (directErr: any) {
        if (directErr.code === 'auth/user-not-found' || directErr.code === 'auth/invalid-credential') {
          // Verify with the shared editorial master password
          const masterCred = await signInWithEmailAndPassword(auth, DESIGNATED_ADMIN_EMAIL, password);
          authenticatedUser = masterCred.user;
        } else {
          throw directErr;
        }
      }

      if (authenticatedUser) {
        // Save verified editorial session
        localStorage.setItem('tol_editorial_session', JSON.stringify(member));
        localStorage.removeItem('tol_simulated_role'); // Clear any role override

        const roleTitle = member.role === 'author' 
          ? 'Author / Guest Researcher' 
          : member.role === 'reviewer' 
          ? 'Peer Reviewer' 
          : 'Editorial Staff';

        setMessageType('success');
        setMessage(`Welcome, ${member.displayName || inputEmail}! Verified as ${roleTitle}. Loading your workspace...`);
        onLoginSuccess(authenticatedUser, member.role, member);
      }
    } catch (err: any) {
      console.warn('Authentication notice:', err.code, err.message);
      setMessageType('error');
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMessage('Access denied: Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setMessage('No account found with these credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setMessage('Too many failed sign-in attempts. Please reset your password or try again later.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setMessage('Notice: Email/Password sign-in provider is disabled in Firebase Console.');
      } else {
        setMessage(`Authentication notice: ${err.message}`);
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
      setMessage('Please provide an email address.');
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
      } else if (err.code === 'auth/user-not-found') {
        // Do not leak user existence, display success
        setMessageType('success');
        setMessage(`A password reset link has been dispatched to ${targetEmail}. Please check your inbox.`);
      } else {
        setMessageType('error');
        setMessage(`Password reset notice: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 md:my-20 px-6 fade-in select-none">
      <div className="bg-navy border border-paper/10 p-8 rounded-sm shadow-2xl flex flex-col gap-6">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blood/15 border border-blood/30 flex items-center justify-center text-blood">
            <Lock size={18} />
          </div>
          <h2 className="font-gothic text-3xl text-paper">
            {isForgotPasswordMode ? 'Password Recovery' : 'Editorial Access'}
          </h2>
          <p className="font-serif text-xs italic text-paper/40 mt-1.5">
            {isForgotPasswordMode 
              ? 'Request a secure Firebase password recovery link'
              : 'Managing Editor, Peer Reviewer & Scholar Contributor Portal'}
          </p>
        </div>

        {/* Informative Alert Banner */}
        {message && (
          <div className={`p-4 rounded-sm flex gap-3 text-xs leading-relaxed border ${
            messageType === 'success' 
              ? 'bg-green-950/20 text-[#8bc4a8] border-green-500/20' 
              : messageType === 'error'
              ? 'bg-red-950/25 text-red-300 border-red-500/30'
              : 'bg-blue-950/20 text-blue-300 border-blue-500/20'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-[#8bc4a8] mt-0.5" />
            ) : messageType === 'error' ? (
              <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
            ) : (
              <Info size={16} className="shrink-0 text-blue-300 mt-0.5" />
            )}
            <span className="font-serif text-paper/90">{message}</span>
          </div>
        )}

        {isForgotPasswordMode ? (
          /* Forgot Password Form */
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-5 select-text">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                Email Address
              </label>
              <div className="relative flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm">
                <Mail size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={loading}
                  placeholder="theoligarchy.ppj@gmail.com"
                  className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/20"
                />
              </div>
              <p className="font-serif text-[11px] text-paper/40 mt-1">
                A password reset email with a secure Firebase recovery link will be sent to this verified address.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blood hover:bg-blood-light disabled:bg-blood/40 text-paper font-sans text-xs font-bold tracking-widest uppercase py-3.5 mt-2 transition-all cursor-pointer shadow-md rounded-sm"
            >
              {loading ? 'Transmitting...' : 'Send Password Reset Link →'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordMode(false);
                setMessage('');
              }}
              className="font-sans text-xs uppercase tracking-wider text-paper/40 hover:text-paper flex items-center justify-center gap-1.5 py-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </button>
          </form>
        ) : (
          /* Standard Email & Password Form */
          <form onSubmit={handleSignIn} className="flex flex-col gap-5 select-text">
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Editorial Email
                </label>
                {email !== DESIGNATED_ADMIN_EMAIL && (
                  <button
                    type="button"
                    onClick={() => setEmail(DESIGNATED_ADMIN_EMAIL)}
                    className="font-sans text-[9px] uppercase tracking-wider text-paper/40 hover:text-paper hover:underline bg-none border-none p-0 cursor-pointer"
                  >
                    Managing Editor
                  </button>
                )}
              </div>
              <div className="relative flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm">
                <Mail size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. your-email@gmail.com or theoligarchy.ppj@gmail.com"
                  className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/20"
                />
              </div>
              <p className="font-serif text-[11px] text-paper/35">
                Staff members and registered authors sign in here using their registered email and the editorial password.
              </p>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="font-sans text-[10px] font-semibold tracking-wider uppercase text-paper/40">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(true);
                    setResetEmail(email || DESIGNATED_ADMIN_EMAIL);
                    setMessage('');
                  }}
                  className="font-sans text-[9px] uppercase tracking-wider text-blood hover:text-blood-light hover:underline bg-none border-none p-0 cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div id="password-input-wrapper" className="relative flex items-center bg-midnight border border-paper/10 rounded-sm px-3 py-2 text-sm">
                <KeyRound size={14} className="text-paper/30 mr-2.5 shrink-0" />
                <input
                  id="admin-login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-transparent text-paper font-serif focus:outline-none w-full placeholder-paper/15 pr-2"
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

        <div className="border-t border-paper/10 pt-4 flex flex-col gap-1 items-center justify-center text-center font-sans text-[9px] text-paper/30 tracking-wider">
          <div className="flex gap-2 items-center">
            <span>Role-Based Access Control</span>
            <span>•</span>
            <span>Enterprise Encryption</span>
          </div>
          <span className="text-[8px] text-paper/20">Authors sign in with their registered email to enter the restricted Author Workspace.</span>
        </div>
      </div>
    </div>
  );
}
