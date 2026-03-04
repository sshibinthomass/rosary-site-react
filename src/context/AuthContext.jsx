import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../config/firebase';
import { ADMIN_EMAILS } from '../config/constants';

const AuthContext = createContext(null);

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
    // Check for redirect result on mount
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

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser ? `User: ${currentUser.email}` : 'No user');
      if (currentUser && loggingInRef.current) {
        sessionStorage.setItem('isFreshLogin', 'true');
        loggingInRef.current = false;
      }
      setUser(currentUser);
      setIsAdmin(ADMIN_EMAILS.includes(currentUser?.email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      loggingInRef.current = true;
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
        alert(`Sign-in failed: ${error.message}`);
        throw error;
      }
    }
  };

  const signInWithFacebook = async () => {
    try {
      loggingInRef.current = true;
      const result = await signInWithPopup(auth, facebookProvider);
      console.log('Facebook popup success:', result.user?.email || result.user?.uid);
      setUser(result.user);
    } catch (error) {
      console.error('Facebook sign-in error:', error);
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        alert('An account already exists with the same email. Please sign in using your original method.');
        loggingInRef.current = false;
        return;
      }
      
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') {
        try {
          console.log('Falling back to Facebook redirect...');
          sessionStorage.setItem('isFreshLogin', 'true');
          await signInWithRedirect(auth, facebookProvider);
        } catch (redirectError) {
          console.error('Facebook redirect also failed:', redirectError);
          loggingInRef.current = false;
          throw redirectError;
        }
      } else {
        loggingInRef.current = false;
        alert(`Facebook sign-in failed: ${error.message}`);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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
    signInWithFacebook,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
