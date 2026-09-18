import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore.ts';
import { useToastStore } from '../hooks/useToastStore.ts';
import { Button } from '../components/ui/Button.tsx';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      mode === 'login' ? { email, password } : { email, password, fullName, phone };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setAuth(data.user, data.token);
        addToast('success', mode === 'login' ? 'Welcome back to Shikkis' : 'Account created successfully');
        if (data.user.role === 'owner') {
          navigate('/admin');
        } else {
          navigate(redirect);
        }
      } else {
        addToast('error', data.error || 'Authentication failed');
      }
    } catch {
      addToast('error', 'Network error during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-16 py-64 space-y-24">
      <div className="text-center space-y-8">
        <h1 className="font-serif text-32 font-bold text-text uppercase">
          {mode === 'login' ? 'Sign In to Shikkis' : 'Create Customer Account'}
        </h1>
        <p className="text-xs text-text-muted">
          Access your luxury orders, bespoke fittings, and saved address book.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-12 text-xs font-bold uppercase tracking-wider min-h-[44px] ${
            mode === 'login' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-text-muted'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setMode('register')}
          className={`flex-1 py-12 text-xs font-bold uppercase tracking-wider min-h-[44px] ${
            mode === 'register' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-text-muted'
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16 bg-surface border border-border p-24 rounded-md">
        {mode === 'register' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text uppercase mb-4">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-text uppercase mb-4">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@shikkis.in"
            className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text uppercase mb-4">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
          />
        </div>

        <Button fullWidth type="submit" disabled={isLoading} size="lg">
          {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Register Customer Account'}
        </Button>
      </form>

      {/* Demo Credentials Helper Box */}
      <div className="p-16 border border-brand-gold/40 bg-brand-gold/10 rounded-md text-xs space-y-4">
        <p className="font-bold text-text">Quick Demo Login Credentials:</p>
        <p>• <strong>Owner / Admin:</strong> admin@shikkis.in / OwnerSecret123!</p>
        <p>• <strong>Customer:</strong> customer@shikkis.in / Customer123!</p>
      </div>
    </div>
  );
};
