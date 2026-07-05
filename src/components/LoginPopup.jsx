import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import logo from '../assets/logo.png';

export default function LoginPopup() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { success, error } = useToast();
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Determine if we should show the popup for this tab session
    const checkAndShowPopup = () => {
      // Don't show if auth state is still loading, or if user is already logged in
      if (loading || user) return;

      // Check sessionStorage to see if it was already dismissed in THIS tab
      const isDismissed = sessionStorage.getItem('loginPopupDismissed') === 'true';

      if (!isDismissed) {
        // Let shoppers browse before interrupting the public page with account sync.
        const timer = setTimeout(() => {
          setShow(true);
        }, 15000);
        return () => clearTimeout(timer);
      }
    };

    checkAndShowPopup();
  }, [loading, user]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      success('Welcome back!');
      // On success, the 'user' state will update, which triggers the useEffect payload.
      // But we can also just close it immediately.
      handleClose(); 
    } catch (err) {
      error('Failed to sign in. Please try again.');
    } finally {
      if (document.body) {
        setSigningIn(false);
      }
    }
  };

  const handleClose = () => {
    sessionStorage.setItem('loginPopupDismissed', 'true');
    setShow(false);
  };

  if (!show || user || pathname.startsWith('/order/')) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[var(--bg-primary)] w-full max-w-sm rounded-2xl shadow-xl overflow-hidden relative animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-popup-title"
      >
        {/* Close button (X) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors z-10"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 text-center pt-10">
          <img
            src={logo}
            alt="Rosary Plant House logo"
            className="mx-auto mb-4 h-16 w-16 object-contain"
          />
          <h2 id="login-popup-title" className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Welcome to Rosary!
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Sign in to sync your cart, save your wishlist, and track your orders across all devices.
          </p>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="flex items-center gap-3 w-full justify-center px-6 py-3 bg-white rounded-xl border border-[var(--border-color)] hover:border-[var(--color-forest)] transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mb-4 text-black"
          >
            {signingIn ? (
               <div className="w-5 h-5 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span className="font-medium whitespace-nowrap">
              {signingIn ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>
          
          <button 
            onClick={handleClose}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-block"
          >
            Not now, I'll browse as a guest
          </button>
        </div>
      </div>
    </div>
  );
}
