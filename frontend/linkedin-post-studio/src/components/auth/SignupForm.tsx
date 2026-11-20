/**
 * SignupForm.tsx
 * Passwordless sign-up: Name + Email OTP (6-digit code) or Continue with Google.
 * Uses Supabase Auth — creates the account without requiring a password.
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, ArrowRight, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { AuthGateHeader, useAuthRedirectTarget } from '@/components/auth/AuthGateHeader';
import { buildAuthUrl } from '@/lib/authRedirect';

type Step = 'details' | 'otp';

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export function SignupForm() {
  const { loginWithSupabaseToken, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { redirectTo, authRequired, rawRedirectParam } = useAuthRedirectTarget();

  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Already authenticated → redirect
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate, redirectTo]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  // ── Step 1: Send OTP for Signup ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!name.trim()) {
      toast({ title: 'Enter your name', description: 'Please enter your name to personalize your account.', variant: 'warning' });
      return;
    }
    if (!isValidEmail(email)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'warning' });
      return;
    }
    if (!isSupabaseConfigured) {
      toast({
        title: 'Auth not configured',
        description: 'Supabase credentials are missing. Contact the administrator.',
        variant: 'error',
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          data: {
            full_name: name.trim(),
            name: name.trim(),
          },
        },
      });
      if (error) throw error;
      setStep('otp');
      setCooldown(60);
      toast({
        title: 'Verification code sent!',
        description: `We emailed a 6-digit code to ${email.trim()}.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Failed to send code',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      toast({ title: 'Enter 6-digit code', description: 'Please enter the full code from your email.', variant: 'warning' });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email',
      });
      if (error) throw error;
      if (!data.session) throw new Error('No session returned after OTP verification.');

      const { access_token, user } = data.session;
      const displayName =
        name.trim() ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        email.trim().split('@')[0];

      await loginWithSupabaseToken(access_token, email.trim(), displayName);
      toast({ title: 'Welcome to LinkedPulse!', description: 'Your account has been created successfully.', variant: 'success' });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code. Please try again.';
      toast({ title: 'Verification failed', description: msg, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Auth not configured',
        description: 'Supabase credentials are missing. Contact the administrator.',
        variant: 'error',
      });
      return;
    }
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast({
        title: 'Google sign-in failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md rounded-2xl glass-lg p-8 shadow-2xl">
        <AuthGateHeader
          mode="signup"
          title="Create your account"
          subtitle="Get started with LinkedPulse — Free forever"
        />

        {step === 'details' ? (
          <div className="space-y-5" aria-label="Sign up form">
            {/* Display Name input */}
            <div className="space-y-1.5">
              <label htmlFor="signup-name" className="block text-sm font-medium text-slate-200">
                Full name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </div>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  className="pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                  aria-label="Full name"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </div>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                  aria-label="Email address"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="button"
              className="w-full"
              onClick={handleSendOtp}
              disabled={isLoading}
              aria-label={isLoading ? 'Sending verification code…' : 'Create free account'}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Sending verification code…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Free Account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-white/15" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 border-t border-white/15" />
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              aria-label="Continue with Google"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {isGoogleLoading ? (
                <svg className="h-5 w-5 animate-spin text-slate-300" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                </svg>
              ) : (
                GOOGLE_ICON
              )}
              Continue with Google
            </button>

            {/* Footer link to Sign In */}
            <p className="mt-6 text-center text-sm text-slate-300">
              Already have an account?{' '}
              <Link
                to={buildAuthUrl('/login', rawRedirectParam, authRequired)}
                className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none"
              >
                Sign In
              </Link>
            </p>
          </div>
        ) : (
          /* ── OTP Step ─────────────────────────────────────────────────── */
          <div className="space-y-5" aria-label="OTP verification form">
            <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              <p>
                We sent a 6-digit verification code to{' '}
                <span className="font-semibold text-white">{email}</span>.
                Check your inbox (and spam folder).
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-otp" className="block text-sm font-medium text-slate-200">
                Verification code
              </label>
              <Input
                id="signup-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                className="text-center tracking-[0.4em] text-lg font-semibold"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtp(); }}
                aria-label="6-digit verification code"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.length !== 6}
              aria-label={isLoading ? 'Verifying…' : 'Verify and complete account setup'}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Verifying…
                </span>
              ) : (
                'Verify & Create Account'
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep('details'); setOtp(''); }}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors focus-visible:outline-none"
                aria-label="Back to details entry"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Change details
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cooldown > 0) return;
                  setOtp('');
                  handleSendOtp();
                }}
                disabled={cooldown > 0}
                className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none"
                aria-label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
