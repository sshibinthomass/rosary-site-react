import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from 'firebase/auth';

import { firebaseIsConfigured } from '../../integrations/firebaseConfig';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthDriver {
  subscribe(callback: (user: AuthUser | null) => void): () => void;
  popup(): Promise<void>;
  redirect(): Promise<void>;
  native(): Promise<void>;
  signOut(): Promise<void>;
  isNative: boolean;
}

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

async function loadFirebaseAuth() {
  const [firebase, authApi] = await Promise.all([import('../../integrations/firebase'), import('firebase/auth')]);
  const provider = new authApi.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return { auth: firebase.getFirebaseAuth(), provider, authApi };
}

function createFirebaseAuthDriver(): AuthDriver {
  if (!firebaseIsConfigured) {
    return {
      subscribe(callback) { callback(null); return () => undefined; },
      async popup() { throw new Error('Add Firebase environment variables before signing in.'); },
      async redirect() { throw new Error('Add Firebase environment variables before signing in.'); },
      async native() { throw new Error('Add Firebase environment variables before signing in.'); },
      async signOut() {},
      isNative: Capacitor.isNativePlatform(),
    };
  }
  return {
    subscribe(callback) {
      let unsubscribe: (() => void) | undefined;
      let cancelled = false;
      void loadFirebaseAuth().then(({ auth, authApi }) => {
        if (cancelled) return;
        void authApi.getRedirectResult(auth).catch(() => undefined);
        unsubscribe = authApi.onAuthStateChanged(auth, (user) => callback(user ? toAuthUser(user) : null));
      }).catch(() => callback(null));
      return () => { cancelled = true; unsubscribe?.(); };
    },
    async popup() { const { auth, provider, authApi } = await loadFirebaseAuth(); await authApi.signInWithPopup(auth, provider); },
    async redirect() { const { auth, provider, authApi } = await loadFirebaseAuth(); await authApi.signInWithRedirect(auth, provider); },
    async native() {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true, scopes: ['email', 'profile'] });
      const idToken = result.credential?.idToken;
      const accessToken = result.credential?.accessToken;
      if (!idToken && !accessToken) throw new Error('Google did not return a sign-in credential.');
      const { auth, authApi } = await loadFirebaseAuth();
      await authApi.signInWithCredential(auth, authApi.GoogleAuthProvider.credential(idToken, accessToken));
    },
    async signOut() {
      const { auth, authApi } = await loadFirebaseAuth();
      await authApi.signOut(auth);
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut().catch(() => undefined);
      }
    },
    isNative: Capacitor.isNativePlatform(),
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error?: string;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps extends PropsWithChildren { driver?: AuthDriver }

const redirectErrorCodes = new Set(['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export function AuthProvider({ children, driver: providedDriver }: AuthProviderProps) {
  const driver = useMemo(() => providedDriver ?? createFirebaseAuthDriver(), [providedDriver]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => driver.subscribe((nextUser) => { setUser(nextUser); setLoading(false); }), [driver]);

  async function signInWithGoogle() {
    try {
      setError(undefined);
      if (driver.isNative) await driver.native();
      else await driver.popup();
    } catch (caught) {
      const code = typeof caught === 'object' && caught && 'code' in caught ? String(caught.code) : '';
      if (!driver.isNative && redirectErrorCodes.has(code)) {
        await driver.redirect();
        return;
      }
      const message = caught instanceof Error ? caught.message : 'Google sign-in could not start.';
      setError(message);
      throw caught;
    }
  }

  async function signOut() {
    await driver.signOut();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, error, signInWithGoogle, signOut }), [error, loading, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
