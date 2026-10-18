import {
  registerAccount,
  resendVerification,
  verifyEmail,
  type RegisterResponse,
} from '@shared/auth.ts';

export { resendVerification, verifyEmail, type RegisterResponse };

export async function register(
  name: string,
  email: string,
  password: string,
  accountType: 'individual' | 'employer',
  organizationName = '',
): Promise<RegisterResponse> {
  return await registerAccount({
    displayName: name,
    email,
    password,
    accountType,
    organizationName,
  });
}