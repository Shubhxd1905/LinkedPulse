import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '@/lib/validators';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthGateHeader, useAuthRedirectTarget } from '@/components/auth/AuthGateHeader';
import { buildAuthUrl } from '@/lib/authRedirect';

export function SignupForm() {
  const { signup, isAuthenticated, isLoading: isAuthLoading } = useAuth();
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
      navigate(redirectTo, { replace: true });
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md rounded-2xl glass-lg p-8 shadow-2xl">
        <AuthGateHeader
          mode="signup"
          title="Create your account"
          subtitle="Get started with LinkedPulse"
        />

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-label="Sign up form">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label htmlFor="signup-display-name" className="block text-sm font-medium text-slate-200">
              Display Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
              <Input
                id="signup-display-name"
                type="text"
                placeholder="John Doe"
                className="pl-10"
                aria-label="Display name"
                aria-invalid={!!errors.displayName}
                aria-describedby={errors.displayName ? 'signup-display-name-error' : undefined}
                {...register('displayName')}
              />
            </div>
            {errors.displayName && (
              <p id="signup-display-name-error" className="text-sm text-red-400" role="alert">
                {errors.displayName.message}
              </p>
            )}
          </div>

          {/* Email */}
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
                aria-label="Email address"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p id="signup-email-error" className="text-sm text-red-400" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="block text-sm font-medium text-slate-200">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                aria-label="Password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'signup-password-error' : undefined}
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p id="signup-password-error" className="text-sm text-red-400" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-slate-200">
              Confirm Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
              <Input
                id="signup-confirm-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                aria-label="Confirm password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p id="signup-confirm-password-error" className="text-sm text-red-400" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-label={isLoading ? 'Creating account…' : 'Create account'}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                </svg>
                Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Footer Link */}
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
    </div>
  );
}
