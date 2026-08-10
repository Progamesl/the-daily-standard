import { useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, AlertCircle, Newspaper, Mail } from 'lucide-react';

/**
 * Staff sign-in, backed by Supabase Auth.
 *
 * The previous version authenticated against localStorage and had a second
 * "email verification" step that compared against a hardcoded constant — no
 * email was ever sent, and the code was visible in the shipped bundle. Both
 * the fake step and the shared backdoor code are gone; this is a real
 * email + password sign-in against Supabase.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { isAuthenticated, loading, isConfigured, login } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/admin';

  // Wait for the session check before deciding anything, so a signed-in user
  // isn't shown the login form for a frame.
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    const message = await login(email.trim(), password);

    if (message) {
      setError(message);
      setPassword('');
      setSubmitting(false);
      return;
    }

    navigate(returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Masthead */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl mb-4">
            <Newspaper className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">The Octagon</h1>
          <p className="text-sm text-slate-500 mt-1">Staff Portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Use the email and password for your staff account.
            </p>
          </div>

          {!isConfigured && (
            <div className="flex items-start gap-2.5 p-3 mb-4 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Sign-in is unavailable because the site is missing its database
                configuration. Contact the site administrator.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={submitting || !isConfigured} className="w-full">
              {submitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            Trouble signing in? Ask an editor-in-chief to reset your account.
          </p>
        </div>
      </div>
    </div>
  );
}
