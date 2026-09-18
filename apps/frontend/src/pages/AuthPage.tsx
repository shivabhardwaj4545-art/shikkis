import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Lock, LogIn, LogOut, Mail, Package, ShieldCheck, User, UserPlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '@/lib/api';
import { fadeInUp, useMotionSafe } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const variants = useMotionSafe(fadeInUp);

  const { user, initialized, initAuth, login, logout } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Status & errors
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      initAuth();
    }
  }, [initialized, initAuth]);

  // Initialize Google Identity Services SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && !user) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id:
            (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
            '583686598477-ai66in9imtus9n7ar6i64hdrbfsm92ud.apps.googleusercontent.com',
          callback: async (response: any) => {
            if (response.credential) {
              setSubmitting(true);
              setErrorMsg(null);
              try {
                const res = await api.googleLogin(response.credential);
                localStorage.setItem('shikkis_access_token', res.accessToken);
                await initAuth();
                setSuccessMsg('Successfully signed in with Google!');
                setTimeout(() => navigate('/catalog'), 800);
              } catch (err: any) {
                setErrorMsg(err?.message || 'Google sign-in failed. Please try again.');
              } finally {
                setSubmitting(false);
              }
            }
          },
        });

        const container = document.getElementById('google-btn-container');
        if (container) {
          (window as any).google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          });
        }
      } catch (e) {
        console.error('Google Auth init error:', e);
      }
    }
  }, [mode, user, initialized, initAuth, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await login(loginEmail.trim(), loginPassword);
      if (ok) {
        setSuccessMsg('Successfully logged in!');
        setTimeout(() => navigate('/catalog'), 800);
      } else {
        setErrorMsg('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regFirstName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Please fill in all required fields (*).');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.register({
        first_name: regFirstName.trim(),
        last_name: regLastName.trim() || undefined,
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword,
      });

      localStorage.setItem('shikkis_access_token', res.accessToken);
      await initAuth();
      setSuccessMsg('Account created successfully! Welcome to Shikkis.');
      setTimeout(() => navigate('/catalog'), 800);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Email might already be registered.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className="min-h-[80vh] bg-bg py-10 md:py-16"
    >
      <div className="mx-auto max-w-md px-4 sm:px-6">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="font-serif text-3xl font-bold tracking-wide text-text hover:text-brand-crimson transition-colors"
          >
            Shikkis
          </Link>
          <p className="mt-2 text-xs uppercase tracking-widest text-brand-gold font-medium">
            Curated Style • Account Portal
          </p>
        </div>

        {/* If user is already logged in */}
        {user ? (
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-crimson/10 text-brand-crimson dark:bg-brand-gold/10 dark:text-brand-gold">
              <User size={32} />
            </div>

            <h2 className="font-serif text-2xl font-bold text-text mb-1">
              Welcome back, {user.first_name}!
            </h2>
            <p className="text-xs text-text-muted mb-6">
              Logged in as <span className="font-medium text-text">{user.email}</span> ({user.role})
            </p>

            <div className="space-y-3">
              <Link
                to="/orders"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-crimson py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-crimson/90 transition-colors"
              >
                <Package size={16} />
                <span>View My Orders & Track Shipments</span>
              </Link>

              <Link
                to="/catalog"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-surface-alt py-3 text-sm font-medium text-text hover:border-brand-gold transition-colors"
              >
                <span>Browse Luxury Collections</span>
                <ArrowRight size={16} />
              </Link>

              {user.role === 'owner' && (
                <Link
                  to="/admin"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-brand-gold bg-brand-gold/10 py-3 text-sm font-semibold text-brand-gold hover:bg-brand-gold/20 transition-colors"
                >
                  <ShieldCheck size={16} />
                  <span>Go to Admin Control Panel</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-xs font-medium text-text-muted hover:text-red-500 hover:border-red-500/40 transition-colors mt-4"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Forms */
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
            {/* Tab Selector */}
            <div className="flex rounded-xl bg-surface-alt p-1 mb-6 border border-border">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={[
                  'flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all',
                  mode === 'login'
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-muted hover:text-text',
                ].join(' ')}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={[
                  'flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all',
                  mode === 'register'
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-muted hover:text-text',
                ].join(' ')}
              >
                <UserPlus size={14} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full rounded-xl border border-border bg-bg pl-9 pr-4 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-text-muted" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-border bg-bg pl-9 pr-4 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-brand-crimson py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-crimson/90 disabled:opacity-50 transition-colors mt-2"
                >
                  {submitting ? 'Signing in...' : 'Sign In to Account'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      placeholder="Priya"
                      className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Last Name</label>
                    <input
                      type="text"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      placeholder="Sharma"
                      className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="priya@example.com"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-brand-gold focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-brand-crimson py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-crimson/90 disabled:opacity-50 transition-colors mt-2"
                >
                  {submitting ? 'Creating Account...' : 'Register Account'}
                </button>
              </form>
            )}

            {/* Google OAuth Sign-In Divider & Container */}
            <div className="mt-6 pt-5 border-t border-border">
              <div className="relative flex justify-center text-xs uppercase mb-4">
                <span className="bg-surface px-2 text-text-muted font-medium tracking-wider">
                  Or continue with
                </span>
              </div>
              <div id="google-btn-container" className="flex justify-center min-h-[44px]" />
            </div>

          </div>
        )}
      </div>
    </motion.div>
  );
};
