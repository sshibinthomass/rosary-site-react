import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { ADMIN_EMAIL } from '../config/constants';

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
          setIsAdmin(result.user.email === ADMIN_EMAIL);
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
      setIsAdmin(currentUser?.email === ADMIN_EMAIL);
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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
