import { login, resetPassword, sendResetLink } from '@shared/auth.ts';

export { resetPassword, sendResetLink };

export async function signIn(email: string, password: string, remember: boolean) {
  return login(email, password, remember);
}
