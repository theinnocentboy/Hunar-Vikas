import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../config/roles.ts';
import { useAuth } from './AuthContext.tsx';

export type Profile = {
  name: string;
  role: string;
  place: string;
  initials: string;
};

type RoleValue = {
  profile: Profile;
  firstName: string;
  role: UserRole;
  saveBasic: (name: string, place: string) => void;
};

const RoleContext = createContext<RoleValue | null>(null);

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [profileOverride, setProfileOverride] = useState<{ name: string; place: string } | null>(null);
  const role: UserRole = currentUser.role === 'employer' ? 'employer' : 'citizen';

  const profile = useMemo<Profile>(() => {
    const base: Profile = {
      name: currentUser.name,
      role: currentUser.role === 'employer' ? 'Employer' : 'Citizen',
      place: 'India',
      initials: initialsFor(currentUser.name),
    };
    if (profileOverride === null) return base;
    return {
      ...base,
      name: profileOverride.name,
      place: profileOverride.place,
      initials: initialsFor(profileOverride.name),
    };
  }, [currentUser, profileOverride]);

  const firstName = useMemo(() => profile.name.split(' ')[0] ?? profile.name, [profile]);

  const saveBasic = useCallback((name: string, place: string) => {
    setProfileOverride({ name, place });
  }, []);

  return (
    <RoleContext.Provider value={{ profile, firstName, role, saveBasic }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleValue {
  const value = useContext(RoleContext);
  if (value === null) throw new Error('useRole must be used inside RoleProvider');
  return value;
}
