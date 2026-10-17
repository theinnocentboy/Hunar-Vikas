import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, logout } from '@shared/auth.ts';
import type { AuthUser } from '@shared/auth.ts';

type User = AuthUser;

type AuthValue = {
  currentUser: User;
  sessionUser: User;
  demoUsers: User[];
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionUser, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) {
      window.location.replace('/login/');
      return;
    }
    setSession(user);
  }, []);

  useEffect(() => {
    refresh().catch(() => window.location.replace('/login/')).finally(() => setLoading(false));
  }, [refresh]);

  const signOut = useCallback(async () => {
    await logout();
    setSession(null);
    window.location.replace('/login/');
  }, []);

  const value = useMemo<AuthValue | null>(() => {
    if (!sessionUser) return null;
    return {
      currentUser: sessionUser,
      sessionUser,
      demoUsers: [],
      signOut,
      refresh,
    };
  }, [refresh, sessionUser, signOut]);

  if (loading || !value) {
    return <main style={{ padding: '4rem', textAlign: 'center' }}>Loading your workspace…</main>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
