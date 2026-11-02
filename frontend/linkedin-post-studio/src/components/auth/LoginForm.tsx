import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiForgotPassword } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Linkedin } from 'lucide-react';
import { useState } from 'react';

export function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

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
      navigate('/dashboard');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] dark:opacity-[0.05]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <Card className="relative z-10 w-full max-w-md p-8 shadow-xl dark:shadow-2xl">
        {/* Logo / Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a66c2] shadow-lg shadow-[#0a66c2]/25">
            <Linkedin className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              LinkedIn Post Studio
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in to optimize your LinkedIn presence
            </p>
          </div>
        </div>

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
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail
                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
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
              <p
                id="login-email-error"
                className="text-sm text-red-500 dark:text-red-400"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-[#0a66c2] transition-colors hover:text-[#004182] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a66c2] focus-visible:ring-offset-2 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:ring-offset-slate-900"
                aria-label="Forgot password"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock
                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                aria-label="Password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? 'login-password-error' : undefined
                }
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p
                id="login-password-error"
                className="text-sm text-red-500 dark:text-red-400"
                role="alert"
              >
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
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    fill="currentColor"
                    className="opacity-75"
                  />
                </svg>
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Footer Link */}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-[#0a66c2] transition-colors hover:text-[#004182] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a66c2] focus-visible:ring-offset-2 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:ring-offset-slate-900"
          >
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  );
}
