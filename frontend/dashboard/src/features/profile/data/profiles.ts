import type { Profile, ProfilePatch } from '../types.ts';

/**
 * Profile persistence: one localStorage record per userId. Components never
 * touch storage directly — only hooks call these helpers.
 */

const KEY = 'hvi-profiles-v1';

function now(): string {
  return new Date().toISOString();
}

function loadAll(): Record<string, Profile> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, Profile>;
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, Profile>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* Demo storage (photo data-URLs can hit quota) must never break the app. */
  }
}

export function blankProfile(userId: string): Profile {
  const stamp = now();
  return {
    userId,
    fullName: '',
    headline: '',
    bio: '',
    state: '',
    district: '',
    education: '',
    yearsExperience: 0,
    sectorInterest: [],
    targetRole: '',
    languages: [],
    availability: 'full-time',
    trainingMode: 'hybrid',
    privacy: { showPhone: false, visibleToEmployers: true, shareAnonymisedData: true },
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** Stored profile or null. Never writes. */
export function getProfile(userId: string): Profile | null {
  return loadAll()[userId] ?? null;
}

/** Merge a patch over the stored (or blank/seed) profile and persist it. */
export function saveProfile(userId: string, patch: ProfilePatch): Profile {
  const all = loadAll();
  const base = all[userId] ?? getProfile(userId) ?? blankProfile(userId);
  const { photoUrl, privacy, ...rest } = patch;
  const next: Profile = {
    ...base,
    ...rest,
    userId: base.userId,
    createdAt: base.createdAt,
    privacy: { ...base.privacy, ...privacy },
    updatedAt: now(),
  };
  if (photoUrl === undefined) {
    next.photoUrl = base.photoUrl;
  } else if (photoUrl === null) {
    delete next.photoUrl;
  } else {
    next.photoUrl = photoUrl;
  }
  all[userId] = next;
  saveAll(all);
  return next;
}

export function saveProfilePhoto(userId: string, dataUrl: string): Profile {
  return saveProfile(userId, { photoUrl: dataUrl });
}

export function removeProfilePhoto(userId: string): Profile {
  return saveProfile(userId, { photoUrl: null });
}
