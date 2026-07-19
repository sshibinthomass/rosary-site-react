import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ADMIN_EMAILS } from '../config/constants';
import { getGoogleSignInStrategy } from '../utils/nativeAppSupport';
import { getNativeGoogleCredentialTokens, getNativeGoogleSignInErrorMessage } from '../utils/nativeGoogleAuth';

const AuthContext = createContext(null);
let firebaseAuthApiPromise = null;

async function loadFirebaseAuthApi() {
  if (!firebaseAuthApiPromise) {
    firebaseAuthApiPromise = Promise.all([
      import('firebase/auth'),
      import('../config/firebaseAuth'),
    ]).then(([authApi, firebaseConfig]) => ({
      auth: firebaseConfig.auth,
      googleProvider: firebaseConfig.googleProvider,
      GoogleAuthProvider: authApi.GoogleAuthProvider,
      getRedirectResult: authApi.getRedirectResult,
      onAuthStateChanged: authApi.onAuthStateChanged,
      signInWithCredential: authApi.signInWithCredential,
      signInWithPopup: authApi.signInWithPopup,
      signInWithRedirect: authApi.signInWithRedirect,
      signOut: authApi.signOut,
    }));
  }

  return firebaseAuthApiPromise;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const loggingInRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    const initializeAuth = async () => {
      try {
        const { auth, getRedirectResult, onAuthStateChanged } = await loadFirebaseAuthApi();
        if (cancelled) return;

        getRedirectResult(auth)
          .then((result) => {
            console.log('Redirect result:', result);
            if (result?.user) {
              console.log('Redirect user found:', result.user.email);
              sessionStorage.setItem('isFreshLogin', 'true');
              setUser(result.user);
              setIsAdmin(ADMIN_EMAILS.includes(result.user.email));
            }
          })
          .catch((error) => {
            console.error('Redirect result error:', error);
          });

        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          console.log('Auth state changed:', currentUser ? `User: ${currentUser.email}` : 'No user');
          if (currentUser && loggingInRef.current) {
            sessionStorage.setItem('isFreshLogin', 'true');
            loggingInRef.current = false;
          }
          setUser(currentUser);
          setIsAdmin(ADMIN_EMAILS.includes(currentUser?.email));
          setLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (!cancelled) setLoading(false);
      }
    };

    const scheduleAuth = () => {
      if (typeof window === 'undefined') {
        initializeAuth();
        return () => {};
      }

      let authStarted = false;
      let timeoutId = null;
      const pathname = window.location.pathname;
      const shouldLoadImmediately = /^\/(account|admin|orders)(\/|\.html|$)/.test(pathname);
      const startAuth = () => {
        if (authStarted) return;
        authStarted = true;
        if (timeoutId) window.clearTimeout(timeoutId);
        initializeAuth();
      };

      if (shouldLoadImmediately) {
        startAuth();
        return () => {};
      }

      window.addEventListener('pointerdown', startAuth, { once: true, passive: true });
      window.addEventListener('keydown', startAuth, { once: true });
      window.addEventListener('wheel', startAuth, { once: true, passive: true });
      window.addEventListener('touchstart', startAuth, { once: true, passive: true });
      timeoutId = window.setTimeout(startAuth, 10000);

      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        window.removeEventListener('pointerdown', startAuth);
        window.removeEventListener('keydown', startAuth);
        window.removeEventListener('wheel', startAuth);
        window.removeEventListener('touchstart', startAuth);
      };
    };

    const cancelScheduledAuth = scheduleAuth();

    return () => {
      cancelled = true;
      cancelScheduledAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    let authApi;
    try {
      authApi = await loadFirebaseAuthApi();
      const {
        auth,
        googleProvider,
        GoogleAuthProvider,
        signInWithCredential,
        signInWithPopup,
      } = authApi;

      loggingInRef.current = true;
      if (getGoogleSignInStrategy(Capacitor) === 'native') {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const nativeResult = await FirebaseAuthentication.signInWithGoogle({
          skipNativeAuth: true,
          scopes: ['email', 'profile'],
        });
        const { idToken, accessToken } = getNativeGoogleCredentialTokens(nativeResult);
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const result = await signInWithCredential(auth, credential);
        sessionStorage.setItem('isFreshLogin', 'true');
        loggingInRef.current = false;
        setUser(result.user);
        setIsAdmin(ADMIN_EMAILS.includes(result.user?.email));
        return result;
      }

      // Try popup first (works better on desktop & bypasses tracking prevention)
      const result = await signInWithPopup(auth, googleProvider);
      // Popup success - manually set user state if listener lags
      console.log('Popup success:', result.user.email);
      setUser(result.user);
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // If popup blocked or closed, try redirect (better for mobile)
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') {
        try {
          const { auth, googleProvider, signInWithRedirect } = authApi || await loadFirebaseAuthApi();
          console.log('Falling back to redirect...');
          sessionStorage.setItem('isFreshLogin', 'true');
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error('Redirect also failed:', redirectError);
          loggingInRef.current = false;
          throw redirectError;
        }
      } else {
        loggingInRef.current = false;
        alert(`Sign-in failed: ${getNativeGoogleSignInErrorMessage(error)}`);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      const { auth, signOut } = await loadFirebaseAuthApi();
      await signOut(auth);
      if (getGoogleSignInStrategy(Capacitor) === 'native') {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut().catch((error) => {
          console.warn('Native sign-out warning:', error);
        });
      }
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
