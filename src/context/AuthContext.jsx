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
        if (result?.user) {
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
      // Try popup first (works on desktop)
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      // If popup blocked, try redirect (better for mobile)
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user') {
        sessionStorage.setItem('isFreshLogin', 'true'); // Keep this for redirect path
        await signInWithRedirect(auth, googleProvider);
      } else {
        loggingInRef.current = false;
        console.error('Google sign-in error:', error);
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
