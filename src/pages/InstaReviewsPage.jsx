import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import Icon from '../components/Icon';
import { EmptyState } from '../components/storefront';
import logo from '../assets/logo.png';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config/constants';

// Dynamically import all images from the public/insta_reviews folder
// Vite's import.meta.glob with { eager: true, as: 'url' } gives us an object
// where keys are paths (e.g., '/public/insta_reviews/image1.jpg')
// and values are the resolved URL strings.
// Using relative paths to the public directory won't work perfectly with standard Vite globbing
// because public assets are served directly from root.
// However, Vite documentation suggests not globbing the public directory directly,
// but since the requirement is to just drop files in `public/insta_reviews`,
// we will fetch the list of files if possible, or just statically require them.
// Actually, `import.meta.glob` works on files inside `src/`. For `public/`,
// we can use a slightly different approach or a server-endpoint.
// However, a common workaround in Vite to get a list of files in a public dir
// is to actually put them in `src/assets/insta_reviews` and glob them instead.
// But the prompt specified `public/insta_reviews`.
// Let's use `import.meta.glob` pointing to `/public/insta_reviews/*`.
// If it fails, we'll try something else.

const imageContext = import.meta.glob('/public/insta_reviews/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const defaultImages = Object.values(imageContext);

export default function InstaReviewsPage() {
  const [images] = useState(defaultImages);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/';
  const STORY_DURATION = 5000; // 5 seconds per story
  const UPDATE_INTERVAL = 50; // Update progress every 50ms

  // In a real scenario where images might change at runtime without a rebuild (e.g. dropped in public folder by a backend),
  // we would need an API endpoint to list them. But since this is a Vite app,
  // dropping them in public while Vite is running won't automatically trigger a re-render
  // unless we use `import.meta.glob` and Vite's HMR picks it up (which it does for `import.meta.glob`).
  // So the initial state `defaultImages` is sufficient.

  const nextStory = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // End of stories, go back to previous page
      navigate(fromPath);
    }
  }, [currentIndex, images.length, navigate, fromPath]);

  const prevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (images.length === 0) return;

    let timer;
    if (!isPaused) {
      timer = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (UPDATE_INTERVAL / STORY_DURATION) * 100;
          if (newProgress >= 100) {
            nextStory();
            return 0; // Reset progress explicitly just in case
          }
          return newProgress;
        });
      }, UPDATE_INTERVAL);
    }

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, nextStory, images.length]);

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);

  const handleClickMenu = (e) => {
    const clickX = e.clientX || (e.touches && e.touches[0].clientX);
    const screenWidth = window.innerWidth;

    // Tap left 30% = previous, right 70% = next
    if (clickX < screenWidth * 0.3) {
      prevStory();
    } else {
      nextStory();
    }
  };

  if (images.length === 0) {
    return (
      <div className="animate-fade-in mx-auto max-w-3xl pb-16">
        <SEO title="Customer Stories" canonicalUrl="https://rosaryplanthouse.com/insta-reviews" />
        <EmptyState
          icon="camera"
          title="No stories on the bench yet"
          description="Customer unboxings live here. Nothing is queued up right now, so come back after the next dispatch."
        >
          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="btn btn-primary"
          >
            Go back
          </button>
        </EmptyState>

        <section className="mt-8 rounded-[28px] bg-[var(--color-accent-200)] p-5">
          <h2 className="mb-1.5 font-display text-[18px] text-[var(--color-accent-900)]">Post yours, get a free plant</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-accent-800)]">
            Share a story from a previous order, tag us, and we add a complimentary plant to your next one.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-[var(--color-accent-700)] px-[18px] text-sm font-semibold text-[var(--color-accent-100)] transition-opacity hover:opacity-90"
          >
            <Icon name="instagram" className="h-[17px] w-[17px]" />
            Follow {INSTAGRAM_HANDLE}
          </a>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex w-full justify-center overflow-hidden bg-[var(--color-sage-900)]">
      <SEO title="Customer Stories" canonicalUrl="https://rosaryplanthouse.com/insta-reviews" />

      {/* Container - constrained on desktop, full on mobile */}
      <div
        className="relative h-full w-full overflow-hidden bg-[#2f3a1f] md:my-auto md:h-[90vh] md:w-[400px] md:rounded-[28px] md:shadow-[var(--shadow-lifted)]"
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClickMenu}
      >
        {/* Progress Bars Container */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3 md:pt-4">
          {images.map((_, index) => (
            <div key={index} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(249,244,237,0.35)]">
              <div
                className="h-full rounded-full bg-[#f9f4ed] transition-all duration-[50ms] ease-linear"
                style={{
                  width: `${
                    index < currentIndex ? 100
                    : index === currentIndex ? progress
                    : 0
                  }%`
                }}
              />
            </div>
          ))}
        </div>

        {/* Header Overlay */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-[rgba(39,46,27,0.7)] to-transparent px-3 pb-10 pt-7 md:pt-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-full bg-[#f9f4ed] object-contain" />
            <span className="truncate text-xs font-bold text-[#f9f4ed]">{INSTAGRAM_HANDLE}</span>
            <span className="shrink-0 rounded-full bg-[rgba(249,244,237,0.2)] px-2 py-0.5 text-[11px] font-semibold text-[#f9f4ed]">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(fromPath); }}
            aria-label="Close stories"
            className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,244,237,0.16)] text-[#f9f4ed] transition-colors hover:bg-[rgba(249,244,237,0.3)]"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Arrows (Visible Guides) */}
        {currentIndex > 0 && (
          <div className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(39,46,27,0.4)] text-[rgba(249,244,237,0.85)] backdrop-blur-sm">
              <Icon name="chevron-left" className="h-5 w-5" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(39,46,27,0.4)] text-[rgba(249,244,237,0.85)] backdrop-blur-sm">
            <Icon name="chevron-right" className="h-5 w-5" />
          </div>
        </div>

        {/* Image */}
        <img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Review Story ${currentIndex + 1}`}
          className="h-full w-full select-none object-cover"
          draggable="false"
        />
      </div>
    </div>
  );
}
