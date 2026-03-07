import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, User, AlertCircle, Newspaper, Shield, Mail, Smartphone } from 'lucide-react';
import { initiateLogin, verifyCode, getEmailCodeForTesting } from '@/lib/adminUserService';

type LoginStep = 'credentials' | 'email_verification' | '2fa' | 'device_verification';

export default function AdminLogin() {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [verificationType, setVerificationType] = useState<'email_verification' | '2fa' | 'device_verification'>('email_verification');
  const [email, setEmail] = useState('');
  const { isAuthenticated, refreshUser } = useAdminAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both your username and password.');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      const result = initiateLogin(username.trim(), password);
      
      if (result.success) {
        // Login successful - refresh and navigate
        refreshUser();
        navigate('/admin', { replace: true });
        return;
      }
      
      if (result.requiresEmailVerification) {
        setStep('email_verification');
        setUserId(result.userId);
        setVerificationType('email_verification');
        setEmail(result.userId ? 'user@example.com' : ''); // In production, get from user
        setError('Please check your email for a verification code.');
      } else if (result.requires2FA) {
        setStep('2fa');
        setUserId(result.userId);
        setVerificationType('2fa');
        setError('Please check your email for a two-factor authentication code.');
      } else if (result.requiresDeviceVerification) {
        setStep('device_verification');
        setUserId(result.userId);
        setVerificationType('device_verification');
        setError('New device detected. Please check your email for a verification code.');
      } else {
        setError(result.error || 'Invalid username or password. Please try again.');
        if (!result.locked) {
          setPassword('');
        }
      }
      setLoading(false);
    }, 300);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !userId) {
      setError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      const result = verifyCode(userId, code.trim(), verificationType);
      
      if (result.success) {
        if (verificationType === 'email_verification') {
          // Email verified, try login again
          setStep('credentials');
          setCode('');
          setError('Email verified! Please sign in again.');
        } else {
          // 2FA or device verification complete - login successful
          if (result.user) {
            // User is logged in
            refreshUser();
            navigate('/admin', { replace: true });
          } else {
            setError('Login successful but user session not found. Please try again.');
            setStep('credentials');
          }
        }
      } else {
        setError(result.error || 'Invalid code. Please try again.');
        setCode('');
      }
      setLoading(false);
    }, 300);
  };

  const handleResendCode = () => {
    // In production, this would trigger a new code to be sent
    setError('A new code has been sent to your email.');
    setCode('');
  };

  // Show test code in development
  const testCode = email ? getEmailCodeForTesting(email) : null;

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
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
                <p className="text-sm text-slate-500 mt-0.5">Use your staff credentials to continue.</p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
            </>
          )}

          {/* Step 2: Email Verification / 2FA / Device Verification */}
          {(step === 'email_verification' || step === '2fa' || step === 'device_verification') && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
                  {step === 'email_verification' ? (
                    <Mail className="h-6 w-6 text-blue-600" />
                  ) : step === '2fa' ? (
                    <Shield className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-slate-900 text-center">
                  {step === 'email_verification' && 'Verify Your Email'}
                  {step === '2fa' && 'Two-Factor Authentication'}
                  {step === 'device_verification' && 'Verify New Device'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5 text-center">
                  {step === 'email_verification' && 'We sent a verification code to your email address.'}
                  {step === '2fa' && 'Enter the 6-digit code sent to your email.'}
                  {step === 'device_verification' && 'We detected a new device. Enter the code sent to your email to verify.'}
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                {/* Verification Code */}
                <div>
                  <Label htmlFor="code" className="text-sm font-medium text-slate-700">
                    Verification Code
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest font-mono"
                      autoFocus
                      maxLength={6}
                    />
                  </div>
                  {testCode && (
                    <p className="text-xs text-amber-600 mt-2 text-center">
                      Development: Code is <strong>{testCode}</strong>
                    </p>
                  )}
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
                  disabled={loading || code.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Verifying…' : 'Verify Code'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Resend Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setCode('');
                      setError('');
                      setUserId(undefined);
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="text-xs text-center text-slate-400 mt-6">
            Trouble signing in? Contact your editor-in-chief or system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
