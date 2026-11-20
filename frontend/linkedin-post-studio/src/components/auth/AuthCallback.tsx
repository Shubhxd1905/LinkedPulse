/**
 * AuthCallback.tsx
 * Handles the OAuth redirect from Supabase (Google Sign-In).
 * Supabase places auth tokens in the URL hash after Google redirect.
 * This page picks them up, exchanges them with the backend, and navigates home.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithSupabaseToken } = useAuth();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function handleCallback() {
      try {
        // Supabase auto-parses the hash and sets the session
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          throw new Error(error?.message || 'No session found after OAuth redirect.');
        }

        const { access_token, user } = data.session;
        const email = user?.email || '';
        const name =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          email.split('@')[0];

        await loginWithSupabaseToken(access_token, email, name);
        toast({
          title: 'Signed in with Google',
          description: `Welcome, ${name}!`,
          variant: 'success',
        });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        toast({
          title: 'Google sign-in failed',
          description:
            err instanceof Error ? err.message : 'Authentication failed. Please try again.',
          variant: 'error',
        });
        navigate('/login', { replace: true });
      }
    }

    handleCallback();
  }, [loginWithSupabaseToken, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <svg
          className="mx-auto h-10 w-10 animate-spin text-indigo-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
        </svg>
        <p className="text-slate-300 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
