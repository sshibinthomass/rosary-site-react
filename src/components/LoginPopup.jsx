import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon, { GoogleMark } from './Icon';
import logo from '../assets/logo.png';

/** The desktop sheet is wide enough to show where the plants come from. */
const LOGIN_IMAGE = '/home/hero-natural-nursery-1200.webp';

export default function LoginPopup() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { success, error } = useToast();
  const { pathname } = useLocation();
  const [waited, setWaited] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Count from the moment the page opens, not from the moment Firebase auth
    // finishes: on public pages auth is deferred until the visitor interacts or
    // ten idle seconds pass, and waiting for it as well put the sheet almost
    // half a minute out — long enough that most visitors never saw it.
    const timer = setTimeout(() => setWaited(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Every visit gets the offer once: closing it hides the sheet for the rest of
  // this page load, and opening the site again asks afresh.
  const visible = waited && !dismissed && !loading && !user && !pathname.startsWith('/order/');

  useEffect(() => {
    if (!visible) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDismissed(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible]);

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
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(32,30,29,0.42)] animate-fade-in md:items-center md:p-6">
      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss the sign-in sheet"
        className="absolute inset-0 h-full w-full cursor-default"
      />

      {/* A bottom sheet on a phone; a centred, two-column card on a desktop. */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-t-[28px] bg-[var(--bg-secondary)] px-[22px] pb-6 pt-[18px] shadow-[var(--shadow-lifted)] animate-slide-up safe-bottom md:grid md:max-w-3xl md:grid-cols-[1.05fr_1fr] md:rounded-[28px] md:p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-popup-title"
      >
        <div className="relative hidden md:block">
          <img src={LOGIN_IMAGE} alt="" className="washed h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(39,46,27,0.88)] via-[rgba(39,46,27,0.28)] to-transparent" />
          <div className="absolute inset-x-7 bottom-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-sage-200)]">
              Coonoor &middot; The Nilgiris
            </p>
            <p className="mt-2 font-display text-[25px] leading-tight text-[#f9f4ed]">
              Grown on our own bench
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-4 top-4 hidden h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-sunken)] md:flex"
        >
          <Icon name="x" className="h-[18px] w-[18px]" />
        </button>

        <div className="md:flex md:flex-col md:justify-center md:px-9 md:py-10">
          <div className="flex justify-center md:hidden">
            <span className="h-1 w-11 rounded-full bg-[var(--color-neutral-300)]" />
          </div>

          <img
            src={logo}
            alt="Rosary Plant House logo"
            className="mt-5 h-[52px] w-[52px] object-contain md:mt-0"
          />

          <h2
            id="login-popup-title"
            className="mt-4 font-display text-[25px] leading-tight text-[var(--text-primary)] md:mt-5 md:text-[29px]"
          >
            Welcome to Rosary
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] md:mt-2.5 md:text-[15px]">
            Sign in with Google and your cart, wishlist and past orders follow you to any device. Your
            delivery details fill themselves in next time.
          </p>

          <button
            type="button"
            onClick={handleSignIn}
            disabled={signingIn}
            className="mt-[18px] flex min-h-12 w-full items-center justify-center gap-[11px] rounded-full border border-[var(--border-color)] bg-white text-[15px] font-semibold text-[#201e1d] transition-opacity hover:opacity-90 disabled:opacity-50 md:mt-7"
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
            className="mt-3.5 w-full text-center text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:mt-4"
          >
            Not now, I&rsquo;ll browse as a guest
          </button>
        </div>
      </div>
    </div>
  );
}
