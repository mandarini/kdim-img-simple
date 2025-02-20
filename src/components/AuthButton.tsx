import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
}

export function AuthButton({ isAuthenticated, onAuthChange }: Props) {
  const handleAuth = async () => {
    if (isAuthenticated) {
      await supabase.auth.signOut();
      onAuthChange(false);
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    }
  };

  return (
    <button
      onClick={handleAuth}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      {isAuthenticated ? (
        <>
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </>
      ) : (
        <>
          <LogIn className="h-4 w-4" />
          <span>Sign In with Google</span>
        </>
      )}
    </button>
  );
}