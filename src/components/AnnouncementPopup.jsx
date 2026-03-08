import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';

const SESSION_KEY = 'rph_popup_dismissed';

export default function AnnouncementPopup() {
  const { settings } = useSettings();
  const popup = settings.popup;
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const prevEnabledRef = useRef(null);

  useEffect(() => {
    if (!popup) return;

    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = popup.enabled;

    if (!popup.enabled) {
      setVisible(false);
      return;
    }

    // If popup just got enabled (admin turned it on), reset session dismissal so it shows
    if (wasEnabled === false && popup.enabled === true) {
      sessionStorage.removeItem(SESSION_KEY);
    }

    if (popup.showOnce && sessionStorage.getItem(SESSION_KEY)) return;

    setAnimating(true);
    setVisible(true);
  }, [popup]);

  function dismiss() {
    setAnimating(false);
    setTimeout(() => setVisible(false), 200);
    if (popup?.showOnce) {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }

  if (!visible || !popup?.enabled) return null;

  const bg = popup.bgColor || '#2d6a4f';
  const fg = popup.textColor || '#ffffff';
  const hasButton = popup.buttonText?.trim();

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${animating ? 'opacity-100' : 'opacity-0'}`}
        onClick={dismiss}
      />

      {/* Popup card */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transition-all duration-200
          ${animating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
        style={{ backgroundColor: bg, color: fg }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Close popup"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)', color: fg }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image */}
        {popup.imageUrl && (
          <img
            src={popup.imageUrl}
            alt=""
            className="w-full max-h-52 object-cover"
            loading="eager"
          />
        )}

        {/* Content */}
        <div className={`px-6 pb-5 text-center ${popup.imageUrl ? 'pt-4' : 'pt-6'}`}>
          {popup.emoji && (
            <div className="text-5xl mb-3 leading-none select-none">{popup.emoji}</div>
          )}

          {popup.title && (
            <h2 className="text-xl font-bold mb-2 leading-tight" style={{ color: fg }}>
              {popup.title}
            </h2>
          )}

          {popup.message && (
            <p className="text-sm leading-relaxed mb-5" style={{ color: fg, opacity: 0.9 }}>
              {popup.message}
            </p>
          )}

          {/* Actions */}
          <div className={`flex gap-2 ${hasButton ? '' : 'justify-center'}`}>
            {hasButton && (
              <a
                href={popup.buttonLink || '#'}
                onClick={dismiss}
                className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm text-center transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: fg, color: bg }}
              >
                {popup.buttonText}
              </a>
            )}
            <button
              onClick={dismiss}
              className={`py-2.5 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-80 active:scale-95 ${hasButton ? '' : 'flex-1'}`}
              style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: fg }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
