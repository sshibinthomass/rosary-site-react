import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GoogleMark } from './Icon';
import logo from '../assets/logo.png';

export default function LoginPopup() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { success, error } = useToast();
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Don't show if auth state is still loading, or if user is already logged in
    if (loading || user) return undefined;

    // Every visit gets the offer once: dismissing hides it for the rest of this
    // page load, and opening the site again asks afresh.
    // Let shoppers browse before interrupting the public page with account sync.
    const timer = setTimeout(() => setShow(true), 15000);
    return () => clearTimeout(timer);
  }, [loading, user]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      success('Welcome back!');
      // On success, the 'user' state will update, which triggers the useEffect payload.
      // But we can also just close it immediately.
      handleClose();
    } catch {
      error('Failed to sign in. Please try again.');
    } finally {
      if (document.body) {
        setSigningIn(false);
      }
    }
  };

  const handleClose = () => {
    setShow(false);
  };

  if (!show || user || pathname.startsWith('/order/')) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(32,30,29,0.42)] animate-fade-in">
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss the sign-in sheet"
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div
        className="relative w-full max-w-sm rounded-t-[28px] bg-[var(--bg-secondary)] px-[22px] pb-6 pt-[18px] shadow-[var(--shadow-lifted)] animate-slide-up safe-bottom"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-popup-title"
      >
        <div className="flex justify-center">
          <span className="h-1 w-11 rounded-full bg-[var(--color-neutral-300)]" />
        </div>

        <img
          src={logo}
          alt="Rosary Plant House logo"
          className="mt-5 h-[52px] w-[52px] object-contain"
        />

        <h2 id="login-popup-title" className="mt-4 font-display text-[25px] leading-tight text-[var(--text-primary)]">
          Welcome to Rosary
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Sign in with Google and your cart, wishlist and past orders follow you to any device. Your
          delivery details fill themselves in next time.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="mt-[18px] flex min-h-12 w-full items-center justify-center gap-[11px] rounded-full border border-[var(--border-color)] bg-white text-[15px] font-semibold text-[#201e1d] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {signingIn ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-terracotta)] border-t-transparent" />
          ) : (
            <GoogleMark className="h-[19px] w-[19px]" />
          )}
          <span className="whitespace-nowrap">{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="mt-3.5 w-full text-center text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Not now, I&rsquo;ll browse as a guest
        </button>
      </div>
    </div>
  );
}
