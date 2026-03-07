import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, User, AlertCircle, Newspaper } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both your username and password.');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      const result = login(username.trim(), password);
      if (result.user) {
        navigate('/admin', { replace: true });
      } else {
        setError(result.error || 'Invalid username or password. Please try again.');
        if (!result.locked) {
          setPassword(''); // Only clear password if not locked (locked message shows time)
        }
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Masthead */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 rounded-2xl mb-4">
            <Newspaper className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">The Daily Standard</h1>
          <p className="text-sm text-slate-500 mt-1">Staff Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
            <p className="text-sm text-slate-500 mt-0.5">Use your staff credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                Username
              </Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="pl-9"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
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

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            Trouble signing in? Contact your editor-in-chief or system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
