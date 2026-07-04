import { NavLink } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFoundPage() {
  return (
    <div className="animate-fade-in text-center py-16 px-4">
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noindex />
      
      {/* Illustration */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-[var(--color-forest)]/10 rounded-full animate-pulse-soft" />
        <div className="absolute inset-2 bg-[var(--bg-secondary)] rounded-full border-2 border-[var(--border-color)] flex items-center justify-center shadow-lg">
          <span className="text-6xl">🌵</span>
        </div>
      </div>

      {/* Message */}
      <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
        404
      </h1>
      <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] mb-4">
        Oops! This page has wilted away
      </h2>
      <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto leading-relaxed mb-8">
        The page you're looking for doesn't exist or may have been moved. 
        But don't worry — there are plenty of beautiful plants waiting for you!
      </p>

      {/* CTA */}
      <NavLink 
        to="/" 
        className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--color-forest)] text-white rounded-xl font-semibold text-base shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--color-forest-light)]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Browse Plants
      </NavLink>

      {/* Decorative bottom */}
      <div className="mt-12 flex items-center justify-center gap-2 text-[var(--text-secondary)] text-sm">
        <span>🌿</span>
        <span>Lost? Try searching on the home page</span>
        <span>🌿</span>
      </div>
    </div>
  );
}
