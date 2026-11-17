import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiForgotPassword } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthGateHeader, useAuthRedirectTarget } from '@/components/auth/AuthGateHeader';
import { buildAuthUrl } from '@/lib/authRedirect';

export function LoginForm() {
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { redirectTo, authRequired, rawRedirectParam } = useAuthRedirectTarget();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate, redirectTo]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
        variant: 'success',
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description:
          error instanceof Error
            ? error.message
            : 'Invalid email or password. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailVal = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
    if (!emailVal || !emailVal.includes('@')) {
      toast({
        title: 'Enter your email',
        description: 'Please type your email address first so we can initiate password reset.',
        variant: 'warning',
      });
      return;
    }
    try {
      const res = await apiForgotPassword(emailVal);
      toast({
        title: 'Password reset',
        description: res.message || 'If an account with that email exists, reset instructions have been generated.',
        variant: 'info',
      });
    } catch {
      toast({
        title: 'Password reset',
        description: 'If an account with that email exists, reset instructions have been generated.',
        variant: 'info',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl glass-lg p-8 shadow-2xl">
        <AuthGateHeader
          mode="login"
          title="LinkedPulse"
          subtitle="Sign in to access Profile Audit & Post Studio"
        />

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
          aria-label="Sign in form"
        >
          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-200"
            >
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                aria-label="Email address"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p id="login-email-error" className="text-sm text-red-400" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-200"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none"
                aria-label="Forgot password"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                aria-label="Password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p id="login-password-error" className="text-sm text-red-400" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-label={isLoading ? 'Signing in…' : 'Sign in'}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                </svg>
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Footer Link */}
        <p className="mt-6 text-center text-sm text-slate-300">
          Don&apos;t have an account?{' '}
          <Link
            to={buildAuthUrl('/signup', rawRedirectParam, authRequired)}
            className="font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none"
          >
            Create Free Account
          </Link>
        </p>
      </div>
    </div>
  );
}
