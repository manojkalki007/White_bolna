'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, orgName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set axios default Authorization header whenever token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // On mount: restore session from Supabase (auto-persisted)
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        // Get existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          const accessToken = session.access_token;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          try {
            const { data } = await api.get<{ user: User }>('/auth/me');
            if (mounted) {
              setToken(accessToken);
              setUser(data.user);
            }
          } catch {
            // Token invalid at backend — clear session
            await supabase.auth.signOut();
            if (mounted) {
              setToken(null);
              setUser(null);
            }
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    restoreSession();

    // Listen for Supabase auth state changes (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          const newToken = session.access_token;
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          setToken(newToken);
        }

        if (event === 'SIGNED_OUT') {
          setToken(null);
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login: POST to our backend /auth/login (which calls Supabase internally).
   * Our backend returns a Supabase access_token as the Bearer token.
   */
  const login = async (email: string, password: string) => {
    const { data } = await api.post<{ token: string; refreshToken: string; user: User }>(
      '/auth/login',
      { email, password }
    );

    // Also refresh the Supabase session in the browser so auto-refresh works
    await supabase.auth.setSession({
      access_token: data.token,
      refresh_token: data.refreshToken ?? '',
    });

    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
  };

  /**
   * Register: POST to our backend /auth/register.
   * Backend creates both Supabase Auth user and our DB record.
   */
  const register = async (
    name: string,
    email: string,
    password: string,
    orgName: string
  ) => {
    await api.post('/auth/register', { name, email, password, orgName });
    // After registration, log in with the same credentials
    await login(email, password);
  };

  /**
   * Logout: sign out from Supabase and clear local state.
   */
  const logout = async () => {
    await supabase.auth.signOut();
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
