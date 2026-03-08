import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { syncUser } from '../services/userService';
import { CATEGORIES } from '../config/constants';
import Footer from './Footer';
import BackToTop from './BackToTop';
import logo from '../assets/logo.png';
const HomeIcon = ({ active }) => (
  <svg className={`w-6 h-6 ${active ? 'fill-current' : 'stroke-current fill-none'}`} viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const HeartIcon = ({ active }) => (
  <svg className={`w-6 h-6 ${active ? 'fill-current' : 'stroke-current fill-none'}`} viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const CartIcon = ({ active }) => (
  <svg className={`w-6 h-6 ${active ? 'fill-current' : 'stroke-current fill-none'}`} viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const UserIcon = ({ active }) => (
  <svg className={`w-6 h-6 ${active ? 'fill-current' : 'stroke-current fill-none'}`} viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const navItems = [
  { path: '/', label: 'Home', Icon: HomeIcon },
  { path: '/wishlist', label: 'Wishlist', Icon: HeartIcon },
  { path: '/cart', label: 'Cart', Icon: CartIcon },
  { path: '/account', label: 'Account', Icon: UserIcon },
];

export default function Layout({ children }) {
  const { isAdmin } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const allCategories = ['All', ...CATEGORIES];

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Sync user to Firestore on login
  useEffect(() => {
    if (user) {
      syncUser(user);
    }
  }, [user]);

  // Prevent body scroll when sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleCategoryClick = (cat) => {
    setSidebarOpen(false);
    if (cat === 'All') {
      navigate('/');
    } else {
      navigate(`/category/${encodeURIComponent(cat)}`);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Open categories menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <NavLink to="/" className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
              <h1 className="font-semibold text-lg text-[var(--text-primary)]">Rosary Plant House</h1>
            </NavLink>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = location.pathname === path;
              const isCart = path === '/cart';
              return (
                <NavLink 
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 transition-colors ${isActive ? 'text-[var(--color-forest)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  <div className="relative">
                    <Icon active={isActive} />
                    {isCart && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-terracotta)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                </NavLink>
              );
            })}
            
            {isAdmin && (
              <NavLink 
                to="/admin" 
                className="text-xs font-medium px-4 py-2 rounded-full bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta)]/90 transition-colors"
              >
                Admin Panel
              </NavLink>
            )}
          </div>

          {/* Mobile Admin Link (Only if not in desktop nav) */}
          {isAdmin && (
            <div className="md:hidden">
              <NavLink 
                to="/admin" 
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-terracotta)] text-white"
              >
                Admin
              </NavLink>
            </div>
          )}
        </div>
      </header>

      {/* Category Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
        </div>
      )}
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-full w-72 bg-[var(--bg-primary)] border-r border-[var(--border-color)]
          transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ height: '100dvh' }}
      >
        {/* Sidebar Header */}
        <div className="flex-none flex items-center justify-between px-4 h-16 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <h2 className="font-semibold text-[var(--text-primary)]">Menu</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items - Dedicated scrollable container */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          <nav className="py-2 px-2 flex flex-col gap-1">
          {/* Main Pages */}
          <NavLink
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-all
              ${isActive
                ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <HomeIcon active={isActive} />
                </div>
                <span className="font-medium">Home</span>
              </>
            )}
          </NavLink>

          {/* Highlighted Limited Collection */}
          <button
            onClick={() => handleCategoryClick('Limited')}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-all
              ${location.pathname === `/category/${encodeURIComponent('Limited')}`
                ? 'bg-[var(--color-terracotta)] text-white font-semibold'
                : 'bg-[var(--color-terracotta)]/10 text-[var(--color-terracotta)] hover:bg-[var(--color-terracotta)]/20'
              }
            `}
          >
            <span className="text-lg w-6 flex items-center justify-center">⭐</span>
            <span className="font-semibold">Limited Collection</span>
          </button>

          {/* Categories Accordion */}
          <div className="rounded-lg overflow-hidden bg-transparent">
            <button
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className="w-full flex items-center justify-between px-3 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center text-lg grayscale">🗂️</span>
                <span className="font-medium text-[var(--text-primary)]">Categories</span>
              </div>
              <svg 
                className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-300 ${categoriesOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              className={`transition-all duration-300 ${categoriesOpen ? 'max-h-[2000px] mt-1 overflow-y-visible' : 'max-h-0 overflow-hidden'}`}
            >
              <div className="pl-6 flex flex-col gap-1 border-l-2 border-[var(--bg-tertiary)] ml-6 my-1">
                {allCategories.map((cat) => {
                  const isActive = 
                    (cat === 'All' && (location.pathname === '/' || location.pathname === '')) ||
                    location.pathname === `/category/${encodeURIComponent(cat)}`;
                  
                  const emoji = {
                    'All': '🏠', 'Limited': '⭐', 'Succulent': '🪴', 'Cactus': '🌵',
                    'Echeveria': '🌸', 'Jade': '💎', 'Crassula': '🍀', 'Peperomia': '🌿',
                    'Aloe': '🌱', 'Sedum': '🪻', 'Haworthia': '🌾', 'Creeper': '🍃',
                    'Sansevieria': '🐍', 'Indoor': '🏡', 'Hanging': '🎋', 'Mother': '🌳',
                    'Combo': '🎁', 'Others': '📦'
                  }[cat] || '🌿';

                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-all rounded-r-lg
                        ${isActive
                          ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)] font-semibold border-l-2 -ml-[2px] border-[var(--color-forest)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }
                      `}
                    >
                      <span className="text-sm w-5 text-center">{emoji}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="my-2 border-t border-[var(--border-color)]"></div>

          {/* User Account / Navigation */}
          {[
            { path: '/cart', label: 'Cart', Icon: CartIcon, currentCount: cartCount },
            { path: '/wishlist', label: 'Wishlist', Icon: HeartIcon },
            { path: user ? '/orders' : '/account', label: user ? 'Orders' : 'Account', Icon: UserIcon },
          ].map(({ path, label, Icon, currentCount }) => {
            const isActive = location.pathname === path;
            const isCart = path === '/cart';
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-all
                  ${isActive
                    ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }
                `}
              >
                <div className="relative">
                  <Icon active={isActive} />
                  {isCart && currentCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-terracotta)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {currentCount > 9 ? '9+' : currentCount}
                    </span>
                  )}
                </div>
                <span className="font-medium">{label}</span>
              </NavLink>
            );
          })}

          <div className="my-2 border-t border-[var(--border-color)]"></div>

          {/* Info Pages */}
          <div className="flex flex-col gap-1">
            {[
              { path: '/reviews', label: 'Reviews', emoji: '⭐' },
              { path: '/insta-reviews', label: 'Instagram Stories', emoji: '📸' },
              { path: '/faq', label: 'FAQ', emoji: '❓' },
              { path: '/about', label: 'About Us', emoji: 'ℹ️' },
              { path: '/contact', label: 'Contact', emoji: '📞' }
            ].map(({ path, label, emoji }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all
                    ${isActive
                      ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }
                  `}
                >
                  <span className="text-base w-6 text-center grayscale">{emoji}</span>
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Admin link if Admin */}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-[var(--border-color)]"></div>
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-all mt-auto mb-4
                  ${location.pathname.startsWith('/admin')
                    ? 'bg-[var(--color-terracotta)] text-white font-semibold'
                    : 'text-[var(--color-terracotta)] bg-[var(--color-terracotta)]/10 hover:bg-[var(--color-terracotta)]/20'
                  }
                `}
              >
                <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Admin Panel</span>
              </NavLink>
            </>
          )}
          </nav>
          {/* Extra space at bottom to ensure scrolling is possible and clear */}
          <div className="h-20 flex-none" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border-color)] safe-bottom">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map(({ path, label, Icon }) => {
              const isActive = location.pathname === path;
              const isCart = path === '/cart';
              
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`
                    flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative
                    ${isActive 
                      ? 'text-[var(--text-primary)]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <div className="relative">
                    <Icon active={isActive} />
                    {isCart && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-terracotta)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
      {/* Floating Cart Button (hidden on cart & admin pages) */}
      {location.pathname !== '/cart' && !location.pathname.startsWith('/admin') && (
        <NavLink
          to="/cart"
          className="fixed bottom-24 right-5 z-40 md:hidden animate-scale-in"
        >
          <div className="w-14 h-14 bg-[var(--color-terracotta)] text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 relative">
            <svg className="w-7 h-7 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-[var(--color-forest)] text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[var(--bg-secondary)]">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </div>
        </NavLink>
      )}

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
