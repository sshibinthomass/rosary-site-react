import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { AuthProvider, useAuth, type AuthDriver } from './AuthProvider';

function SignInProbe() {
  const { user, signInWithGoogle, error } = useAuth();
  return <><button onClick={() => void signInWithGoogle()}>Continue with Google</button><span>{user?.email ?? error ?? 'Guest'}</span></>;
}

it('falls back to redirect when a Google popup is blocked', async () => {
  const redirect = vi.fn(async () => undefined);
  const driver: AuthDriver = {
    subscribe(callback) { callback(null); return () => undefined; },
    async popup() { throw Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }); },
    redirect,
    async native() { throw new Error('not used'); },
    async signOut() {},
    isNative: false,
  };
  const user = userEvent.setup();
  render(<AuthProvider driver={driver}><SignInProbe /></AuthProvider>);

  await user.click(screen.getByRole('button', { name: /continue with google/i }));
  expect(redirect).toHaveBeenCalledOnce();
});

it('exposes the signed-in user from the auth listener', async () => {
  const driver: AuthDriver = {
    subscribe(callback) { callback({ uid: 'u1', email: 'plant@example.com', displayName: 'Plant Friend', photoURL: null }); return () => undefined; },
    async popup() {}, async redirect() {}, async native() {}, async signOut() {}, isNative: false,
  };
  render(<AuthProvider driver={driver}><SignInProbe /></AuthProvider>);
  expect(await screen.findByText('plant@example.com')).toBeVisible();
});
