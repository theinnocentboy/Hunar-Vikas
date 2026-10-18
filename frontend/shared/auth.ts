export type AuthUser = {
  userId: string;
  memberCode: string;
  name: string;
  email: string;
  role: 'individual' | 'employer';
  approved: boolean;
  approvalStatus: string | null;
  organization: string;
  createdAt: string;
};

export type RegisterResponse = {
  verification_required?: boolean;
  otp_already_sent?: boolean;
  cooldown_seconds?: number;
};

export type ResendResponse = {
  ok?: boolean;
  cooldown_seconds?: number;
};

type AuthResponse = {
  authenticated?: boolean;
  user?: {
    member_code: string;
    display_name: string;
    email: string;
    role: AuthUser['role'];
    approved: boolean;
    approval_status: string | null;
    organization: string;
  };
  csrf_token?: string;
  verification_required?: boolean;
  otp_already_sent?: boolean;
  cooldown_seconds?: number;
  ok?: boolean;
  error?: string;
  code?: string;
  fields?: Record<string, string>;
};

let csrfToken = '';

function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}${path}`;
}

export class AuthApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(response: AuthResponse, status: number) {
    super(response.error ?? `Authentication request failed (${status}).`);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = response.code ?? 'auth_error';
    this.fields = response.fields ?? {};
  }
}

async function request(path: string, init: RequestInit = {}): Promise<AuthResponse> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (csrfToken && path !== '/api/auth/me') headers.set('X-CSRF-Token', csrfToken);

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });
  const payload = (await response.json().catch(() => ({}))) as AuthResponse;
  if (!response.ok) throw new AuthApiError(payload, response.status);
  if (payload.csrf_token) csrfToken = payload.csrf_token;
  return payload;
}

function toUser(response: AuthResponse): AuthUser | null {
  if (!response.authenticated || !response.user) return null;
  const user = response.user;
  return {
    userId: user.member_code,
    memberCode: user.member_code,
    name: user.display_name,
    email: user.email,
    role: user.role,
    approved: user.approved,
    approvalStatus: user.approval_status,
    organization: user.organization,
    createdAt: new Date().toISOString(),
  };
}

function requireUser(response: AuthResponse): AuthUser {
  const user = toUser(response);
  if (!user) throw new Error('Authentication response did not contain a user.');
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return toUser(await request('/api/auth/me'));
}

export async function login(email: string, password: string, remember: boolean): Promise<AuthUser> {
  return requireUser(await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember }),
  })) as AuthUser;
}

export async function registerAccount(data: {
  email: string;
  password: string;
  displayName: string;
  accountType: AuthUser['role'];
  organizationName?: string;
}): Promise<RegisterResponse> {
  return await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      display_name: data.displayName,
      account_type: data.accountType,
      organization_name: data.organizationName ?? '',
      accept_terms: true,
    }),
  });
}

export async function verifyEmail(email: string, otp: string, remember = true, token?: string): Promise<AuthUser> {
  return requireUser(await request('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(token ? { token, remember } : { email, otp, remember }),
  })) as AuthUser;
}

export async function resendVerification(email: string): Promise<ResendResponse> {
  return await request('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function sendResetLink(email: string): Promise<void> {
  await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  csrfToken = '';
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST', body: '{}' });
  csrfToken = '';
}