import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Linkedin, User } from 'lucide-react';
import { useState } from 'react';

export function SignupForm() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signup(data.displayName, data.email, data.password);
      toast({
        title: 'Account created!',
        description: 'Welcome aboard. Your account has been set up successfully.',
        variant: 'success',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not create your account. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
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
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Get started with LinkedIn Post Studio
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
          aria-label="Sign up form"
        >
          {/* Display Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-display-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Display Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User
                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              </div>
              <Input
                id="signup-display-name"
                type="text"
                placeholder="John Doe"
                className="pl-10"
                aria-label="Display name"
                aria-invalid={!!errors.displayName}
                aria-describedby={
                  errors.displayName ? 'signup-display-name-error' : undefined
                }
                {...register('displayName')}
              />
            </div>
            {errors.displayName && (
              <p
                id="signup-display-name-error"
                className="text-sm text-red-500 dark:text-red-400"
                role="alert"
              >
                {errors.displayName.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
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
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                aria-label="Email address"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p
                id="signup-email-error"
                className="text-sm text-red-500 dark:text-red-400"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock
                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              </div>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                aria-label="Password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? 'signup-password-error' : undefined
                }
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p
                id="signup-password-error"
                className="text-sm text-red-500 dark:text-red-400"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-confirm-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock
                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
                  aria-hidden="true"
                />
              </div>
              <Input
                id="signup-confirm-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                aria-label="Confirm password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword
                    ? 'signup-confirm-password-error'
                    : undefined
                }
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p
                id="signup-confirm-password-error"
                className="text-sm text-red-500 dark:text-red-400"
                role="alert"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-label={isLoading ? 'Creating account…' : 'Create account'}
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
                Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Footer Link */}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#0a66c2] transition-colors hover:text-[#004182] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a66c2] focus-visible:ring-offset-2 dark:text-blue-400 dark:hover:text-blue-300 dark:focus-visible:ring-offset-slate-900"
          >
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
