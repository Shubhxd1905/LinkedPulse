/**
 * SignupForm.tsx
 * Account creation is handled automatically by the Email OTP flow on the
 * Login page (Supabase `shouldCreateUser: true`). This component redirects
 * new users to the unified sign-in page so they can get started.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function SignupForm() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Forward the full query string so redirect targets are preserved
    const destination = `/login${location.search}`;
    navigate(destination, { replace: true });
  }, [navigate, location.search]);

  return null;
}
