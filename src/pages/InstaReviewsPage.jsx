import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

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
  const [images, setImages] = useState(defaultImages);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
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
      // End of stories, go back to reviews
      navigate('/reviews');
    }
  }, [currentIndex, images.length, navigate]);

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <SEO title="Customer Stories" />
        <h2 className="text-xl mb-4">No stories available currently.</h2>
        <button 
          onClick={() => navigate('/reviews')}
          className="px-6 py-2 bg-[var(--color-forest)] text-white rounded-full"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex justify-center w-full h-full overflow-hidden">
      <SEO title="Customer Stories" />
      
      {/* Container - constrained on desktop, full on mobile */}
      <div 
        className="relative w-full h-full md:w-[400px] md:h-[90vh] md:my-auto md:rounded-2xl overflow-hidden bg-gray-900 shadow-2xl"
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClickMenu}
      >
        {/* Progress Bars Container */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2 md:pt-4">
          {images.map((_, index) => (
            <div key={index} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-[50ms] ease-linear"
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
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-6 md:pt-8 bg-gradient-to-b from-black/60 to-transparent pb-8 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-terracotta)] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-[var(--color-forest)]">
              R
            </div>
            <span className="text-white font-semibold text-sm drop-shadow-md">
              Rosary Plant House
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium tracking-wide">
                {currentIndex + 1} / {images.length}
              </span>
            </span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/reviews'); }}
            className="text-white p-1 pointer-events-auto filter drop-shadow hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Arrows (Visible Guides) */}
        {currentIndex > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="bg-black/30 text-white/80 p-2 rounded-full backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>
        )}
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="bg-black/30 text-white/80 p-2 rounded-full backdrop-blur-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Image */}
        <img 
          key={currentIndex}
          src={images[currentIndex]} 
          alt={`Review Story ${currentIndex + 1}`}
          className="w-full h-full object-cover select-none"
          draggable="false"
        />
      </div>
    </div>
  );
}
