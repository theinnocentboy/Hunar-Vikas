import {
  registerAccount,
  resendVerification,
  verifyEmail,
} from '@shared/auth.ts';

export { resendVerification, verifyEmail };

export async function register(
  name: string,
  email: string,
  password: string,
  accountType: 'individual' | 'employer',
  organizationName = '',
): Promise<void> {
  await registerAccount({
    displayName: name,
    email,
    password,
    accountType,
    organizationName,
  });
}
