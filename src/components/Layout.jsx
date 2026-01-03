import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// Icons as simple SVG components
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

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--color-forest)]/10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <h1 className="font-semibold text-lg text-[var(--color-forest)]">Rosary Plant House</h1>
          </NavLink>
          
          {isAdmin && (
            <NavLink 
              to="/admin" 
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-terracotta)] text-white"
            >
              Admin
            </NavLink>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--color-forest)]/10 safe-bottom">
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
                      ? 'text-[var(--color-forest)]' 
                      : 'text-[var(--color-forest)]/50 hover:text-[var(--color-forest)]/80'
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
    </div>
  );
}
