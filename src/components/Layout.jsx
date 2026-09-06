import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CATEGORIES, CURRENCY, FREE_PLANT_THRESHOLD } from '../config/constants';
import Footer from './Footer';
import BackToTop from './BackToTop';
import Icon from './Icon';
import logo from '../assets/logo.png';

let userServicePromise = null;

function loadUserService() {
  if (!userServicePromise) {
    userServicePromise = import('../services/userService');
  }

  return userServicePromise;
}
const HomeIcon = ({ active }) => (
  <Icon name="home" className="w-6 h-6" strokeWidth={active ? 2.6 : 2} />
);

const ShopIcon = ({ active }) => (
  <Icon name="map-pin" className="w-6 h-6" strokeWidth={active ? 2.6 : 2} />
);

const HeartIcon = ({ active }) => (
  <Icon name="heart" filled={active} className="w-6 h-6" strokeWidth={active ? 2.6 : 2} />
);

const CartIcon = ({ active }) => (
  <Icon name="bag" className="w-6 h-6" strokeWidth={active ? 2.6 : 2} />
);

const UserIcon = ({ active }) => (
  <Icon name="user" className="w-6 h-6" strokeWidth={active ? 2.6 : 2} />
);

function MenuGlyph({ type, className = 'w-5 h-5' }) {
  const iconProps = {
    className: `${className} fill-none stroke-current`,
    viewBox: '0 0 24 24',
    strokeWidth: '1.9',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (type) {
    case 'all':
      return (
        <svg {...iconProps}>
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      );
    case 'limited':
      return (
        <svg {...iconProps}>
          <path d="M12 3.5l2.3 4.7 5.2.7-3.8 3.7.9 5.2L12 15.4l-4.6 2.4.9-5.2-3.8-3.7 5.2-.7z" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...iconProps}>
          <path d="M3.5 7.5h6l1.8 2H20a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a1 1 0 011-1z" />
        </svg>
      );
    case 'succulent':
      return (
        <svg {...iconProps}>
          <path d="M12 5c1.7 2.1 1.7 4.1 0 6-1.7-1.9-1.7-3.9 0-6z" />
          <path d="M7 8c2.6.3 4.1 1.6 4.5 4-2.4-.3-3.9-1.7-4.5-4z" />
          <path d="M17 8c-2.6.3-4.1 1.6-4.5 4 2.4-.3 3.9-1.7 4.5-4z" />
          <path d="M5.5 13c2.7-.5 4.7.2 6 2-2.5.7-4.5 0-6-2z" />
          <path d="M18.5 13c-2.7-.5-4.7.2-6 2 2.5.7 4.5 0 6-2z" />
          <path d="M12 15v4" />
        </svg>
      );
    case 'cactus':
      return (
        <svg {...iconProps}>
          <path d="M12 21V7a3 3 0 116 0v4" />
          <path d="M12 12H9a3 3 0 01-3-3V7" />
          <path d="M18 11v1a3 3 0 01-3 3h-3" />
          <path d="M8 21h8" />
        </svg>
      );
    case 'flower':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 4.5c1.3 1.4 1.3 2.8 0 4.1-1.3-1.3-1.3-2.7 0-4.1z" />
          <path d="M12 19.5c-1.3-1.4-1.3-2.8 0-4.1 1.3 1.3 1.3 2.7 0 4.1z" />
          <path d="M4.5 12c1.4-1.3 2.8-1.3 4.1 0-1.3 1.3-2.7 1.3-4.1 0z" />
          <path d="M19.5 12c-1.4 1.3-2.8 1.3-4.1 0 1.3-1.3 2.7-1.3 4.1 0z" />
        </svg>
      );
    case 'jade':
      return (
        <svg {...iconProps}>
          <path d="M7 4.5h10l3 5-8 10-8-10z" />
          <path d="M7 4.5l5 15 5-15M4 9.5h16" />
        </svg>
      );
    case 'cluster':
      return (
        <svg {...iconProps}>
          <path d="M12 11c-2.2-2-2.2-4 0-6 2.2 2 2.2 4 0 6z" />
          <path d="M7.5 13c-2.4-.6-3.5-2.1-3.3-4.5 2.5.2 3.7 1.7 3.3 4.5z" />
          <path d="M16.5 13c-.4-2.8.8-4.3 3.3-4.5.2 2.4-.9 3.9-3.3 4.5z" />
          <path d="M8 19c1.2-2.3 2.5-3.4 4-3.4s2.8 1.1 4 3.4" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...iconProps}>
          <path d="M5 19C6 10 12 5 20 5c0 8-5 14-14 15" />
          <path d="M5 19c4-4 7-7 10-10" />
        </svg>
      );
    case 'aloe':
      return (
        <svg {...iconProps}>
          <path d="M12 21V8" />
          <path d="M12 19L7 8" />
          <path d="M12 19l5-11" />
          <path d="M12 17L5 13" />
          <path d="M12 17l7-4" />
          <path d="M8 21h8" />
        </svg>
      );
    case 'sedum':
      return (
        <svg {...iconProps}>
          <path d="M7 6c5 0 8 3 10 9" />
          <circle cx="7" cy="6" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="14" cy="11" r="1.5" />
          <circle cx="17" cy="15" r="1.5" />
        </svg>
      );
    case 'haworthia':
      return (
        <svg {...iconProps}>
          <path d="M12 5l2.4 7H9.6z" />
          <path d="M7 8l5 8 5-8" />
          <path d="M5 14c2 4 4.3 6 7 6s5-2 7-6" />
          <path d="M10.5 10h3M9.5 13h5" />
        </svg>
      );
    case 'creeper':
      return (
        <svg {...iconProps}>
          <path d="M6 20c6-4 9-9 8-16" />
          <path d="M10 12c-2.8-.2-4.5-1.5-5-4 2.8.1 4.5 1.4 5 4z" />
          <path d="M14 9c2.9-.3 4.7-1.7 5.3-4.2-2.9.1-4.7 1.5-5.3 4.2z" />
          <path d="M12 16c2.8-.2 4.6-1.5 5.4-3.8-2.8-.1-4.6 1.2-5.4 3.8z" />
        </svg>
      );
    case 'snake-plant':
      return (
        <svg {...iconProps}>
          <path d="M8 21V6c2.7 2.5 3.6 7 2.7 15" />
          <path d="M16 21V6c-2.7 2.5-3.6 7-2.7 15" />
          <path d="M12 21V4" />
          <path d="M7 21h10" />
        </svg>
      );
    case 'indoor':
      return (
        <svg {...iconProps}>
          <path d="M4 12l8-7 8 7" />
          <path d="M6.5 11v8.5h11V11" />
          <path d="M12 19v-5" />
          <path d="M12 14c-2.2-.4-3.5-1.6-4-3.5 2.3.1 3.6 1.2 4 3.5z" />
          <path d="M12 14c2.2-.4 3.5-1.6 4-3.5-2.3.1-3.6 1.2-4 3.5z" />
        </svg>
      );
    case 'hanging':
      return (
        <svg {...iconProps}>
          <path d="M8 4h8l-4 5z" />
          <path d="M6.5 12h11l-1.5 7h-8z" />
          <path d="M8 12L4 5M16 12l4-7" />
          <path d="M10 15c-1.6.6-2.5 1.7-2.7 3.2" />
          <path d="M14 15c1.6.6 2.5 1.7 2.7 3.2" />
        </svg>
      );
    case 'mother':
      return (
        <svg {...iconProps}>
          <path d="M12 21V8" />
          <path d="M12 12c-3-.5-4.8-2.1-5.5-5 3 .2 4.9 1.9 5.5 5z" />
          <path d="M12 11c3-.6 4.8-2.3 5.5-5.2-3.1.3-4.9 2-5.5 5.2z" />
          <path d="M16 21v-5" />
          <path d="M16 16c1.8-.3 2.9-1.3 3.4-3-1.8.1-2.9 1.1-3.4 3z" />
          <path d="M8 21h10" />
        </svg>
      );
    case 'combo':
      return (
        <svg {...iconProps}>
          <path d="M4.5 9h15v10.5h-15z" />
          <path d="M4 9h16M12 9v10.5M8 9c-1.7-2-1.2-4 1-4 1.5 0 2.4 1.5 3 4" />
          <path d="M16 9c1.7-2 1.2-4-1-4-1.5 0-2.4 1.5-3 4" />
        </svg>
      );
    case 'box':
      return (
        <svg {...iconProps}>
          <path d="M4.5 8.5L12 4l7.5 4.5v7L12 20l-7.5-4.5z" />
          <path d="M4.5 8.5L12 13l7.5-4.5M12 13v7" />
        </svg>
      );
    case 'book':
      return (
        <svg {...iconProps}>
          <path d="M5 5.5h6a3 3 0 013 3v11a3 3 0 00-3-3H5z" />
          <path d="M19 5.5h-5a3 3 0 00-3 3" />
          <path d="M19 5.5v11h-5a3 3 0 00-3 3" />
        </svg>
      );
    case 'document':
      return (
        <svg {...iconProps}>
          <path d="M7 3.5h7l3 3V20H7z" />
          <path d="M14 3.5V7h3M9.5 11h5M9.5 15h5" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...iconProps}>
          <path d="M6.5 7.5h3l1.2-2h2.6l1.2 2h3A2.5 2.5 0 0120 10v6.5a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5V10a2.5 2.5 0 012.5-2.5z" />
          <circle cx="12" cy="13.5" r="3" />
        </svg>
      );
    case 'help':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.7 9.5a2.5 2.5 0 014.7 1.2c0 1.9-2.4 2-2.4 3.8" />
          <path d="M12 18h.01" />
        </svg>
      );
    case 'info':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...iconProps}>
          <path d="M8.5 5.5l2 3-1.6 1.6c1 2 2.6 3.6 5 5l1.6-1.6 3 2v3c0 .8-.7 1.5-1.5 1.5C9.7 20 4 14.3 4 7c0-.8.7-1.5 1.5-1.5z" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M5 19C6 10 12 5 20 5c0 8-5 14-14 15" />
          <path d="M5 19c4-4 7-7 10-10" />
        </svg>
      );
  }
}

const categoryIconTypes = Object.freeze({
  All: 'all',
  Limited: 'limited',
  Succulent: 'succulent',
  Cactus: 'cactus',
  Echeveria: 'flower',
  Jade: 'jade',
  Crassula: 'cluster',
  Peperomia: 'leaf',
  Aloe: 'aloe',
  Sedum: 'sedum',
  Haworthia: 'haworthia',
  Creeper: 'creeper',
  Sansevieria: 'snake-plant',
  Indoor: 'indoor',
  Hanging: 'hanging',
  Mother: 'mother',
  Combo: 'combo',
  Others: 'box',
});

const infoNavItems = [
  { path: '/guides', label: 'Care Guides', iconType: 'book' },
  { path: '/policies', label: 'Policies', iconType: 'document' },
  { path: '/reviews', label: 'Reviews', iconType: 'limited' },
  { path: '/insta-reviews', label: 'Instagram Stories', iconType: 'camera' },
  { path: '/faq', label: 'FAQ', iconType: 'help' },
  { path: '/about', label: 'About Us', iconType: 'info' },
  { path: '/contact', label: 'Contact', iconType: 'phone' },
];

const navItems = [
  { path: '/', label: 'Home', Icon: HomeIcon },
  { path: '/shop', label: 'Shop', Icon: ShopIcon },
  { path: '/wishlist', label: 'Wishlist', Icon: HeartIcon },
  { path: '/cart', label: 'Cart', Icon: CartIcon },
  { path: '/account', label: 'Account', Icon: UserIcon },
];

export default function Layout({ children }) {
  const { isAdmin, user } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const allCategories = ['All', ...CATEGORIES];
  const accountNavLabel = user ? 'Account' : 'Log in';
  const mainNavItems = navItems.map((item) => item.path === '/account'
    ? { ...item, label: accountNavLabel }
    : item);
  const userNavItems = [
    { path: '/cart', label: 'Cart', Icon: CartIcon, currentCount: cartCount },
    { path: '/wishlist', label: 'Wishlist', Icon: HeartIcon },
    { path: '/account', label: accountNavLabel, Icon: UserIcon },
  ];

  // Close sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [location.pathname]);

  // Sync user to Firestore on login
  useEffect(() => {
    let cancelled = false;

    if (user) {
      loadUserService()
        .then(({ syncUser }) => {
          if (!cancelled) syncUser(user);
        })
        .catch((error) => {
          console.error('Failed to sync user:', error);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Prevent body scroll when sidebar open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleCategoryClick = (cat) => {
    setSidebarOpen(false);
    if (cat === 'All') {
      navigate('/shop');
    } else {
      navigate(`/category/${encodeURIComponent(cat)}`);
    }
  };

  const isAdminArea = location.pathname.startsWith('/admin');
  const bottomTabs = [
    mainNavItems.find((item) => item.path === '/'),
    mainNavItems.find((item) => item.path === '/shop'),
    mainNavItems.find((item) => item.path === '/wishlist'),
    mainNavItems.find((item) => item.path === '/account'),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Standing offer — the first thing a visitor reads */}
      {!isAdminArea && (
        <div className="flex items-center justify-center gap-2 bg-[var(--panel-deep)] px-4 py-2.5 text-[var(--panel-deep-text)]">
          <Icon name="gift" className="h-3.5 w-3.5 text-[var(--color-accent-400)]" strokeWidth={2.6} />
          <span className="text-xs font-semibold">
            Free plant on orders over {CURRENCY}{FREE_PLANT_THRESHOLD.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
              aria-label="Open categories menu"
            >
              <Icon name="menu" className="h-5 w-5" strokeWidth={2.6} />
            </button>
            <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
              <img src={logo} alt="Logo" className="h-[34px] w-[34px] shrink-0 object-contain" />
              <span className="min-w-0">
                <h1 className="truncate font-display text-[17px] leading-tight text-[var(--text-primary)]">Rosary Plant House</h1>
                <span className="hidden truncate text-[11px] text-[var(--text-secondary)] sm:block">
                  Coonoor nursery &middot; ships all India
                </span>
              </span>
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-7">
            {mainNavItems.map(({ path, label, Icon: NavIcon }) => {
              const isActive = path === '/shop'
                ? location.pathname === '/shop' || location.pathname.startsWith('/category/')
                : location.pathname === path;
              const isCart = path === '/cart';
              const icon = NavIcon({ active: isActive });
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 text-sm transition-colors ${isActive ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  <div className="relative">
                    {icon}
                    {isCart && cartCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-terracotta)] text-[10px] font-bold text-[#f5ead8]">
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
                className="rounded-full bg-[var(--color-terracotta)] px-4 py-2 text-xs font-semibold text-[#f5ead8] transition-opacity hover:opacity-90"
              >
                Admin Panel
              </NavLink>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2 shrink-0">
            <NavLink
              to="/account"
              aria-label={accountNavLabel}
              className={({ isActive }) => `
                inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors
                ${isActive
                  ? 'border-[var(--color-sage-200)] bg-[var(--color-sage-200)] text-[var(--color-sage-800)]'
                  : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {user?.displayName
                    ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7a8a5e] text-[10px] font-bold text-[#f9f4ed]">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    )
                    : <UserIcon active={isActive} />}
                  <span className="text-xs font-semibold">{accountNavLabel}</span>
                </>
              )}
            </NavLink>
            <NavLink
              to="/cart"
              aria-label="Cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
            >
              <Icon name="bag" className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--bg-primary)] bg-[var(--color-terracotta)] px-1 text-[10px] font-bold text-[#f5ead8]">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className="rounded-full bg-[var(--color-terracotta)] px-3 py-1.5 text-xs font-semibold text-[#f5ead8]"
              >
                Admin
              </NavLink>
            )}
          </div>
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
          fixed top-0 left-0 z-[70] h-full w-[19rem] bg-[var(--bg-primary)]
          transform transition-transform duration-300 ease-in-out shadow-[var(--shadow-lifted)] flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ height: '100dvh' }}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 flex-none items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
            <h2 className="font-display text-[17px] text-[var(--text-primary)]">Rosary Plant House</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
            aria-label="Close menu"
          >
            <Icon name="x" className="h-5 w-5" />
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
          <nav className="flex flex-col gap-1 px-3 py-3">
          {/* Main Pages */}
          <NavLink
            to="/"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              w-full flex items-center gap-3 px-3.5 py-3 rounded-full text-left text-sm transition-all
              ${isActive
                ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)] font-semibold'
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

          <NavLink
            to="/shop"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              w-full flex items-center gap-3 px-3.5 py-3 rounded-full text-left text-sm transition-all
              ${isActive || location.pathname.startsWith('/category/')
                ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)] font-semibold'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <ShopIcon active={isActive || location.pathname.startsWith('/category/')} />
                </div>
                <span className="font-medium">Shop</span>
              </>
            )}
          </NavLink>

          {/* Highlighted Limited Collection */}
          <button
            onClick={() => handleCategoryClick('Limited')}
            className={`
              w-full flex items-center gap-3 px-3.5 py-3 rounded-full text-left text-sm transition-all
              ${location.pathname === `/category/${encodeURIComponent('Limited')}`
                ? 'bg-[var(--color-terracotta)] text-[#f5ead8] font-semibold'
                : 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)] hover:bg-[var(--color-accent-300)]'
              }
            `}
          >
            <span className="w-6 h-6 flex items-center justify-center shrink-0">
              <MenuGlyph type="limited" className="w-5 h-5" />
            </span>
            <span className="font-semibold">Limited Collection</span>
          </button>

          {/* Categories Accordion */}
          <div className="overflow-hidden rounded-[24px] bg-transparent">
            <button
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className="w-full flex items-center justify-between px-3.5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all rounded-full"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <MenuGlyph type="folder" className="w-5 h-5" />
                </span>
                <span className="font-medium text-[var(--text-primary)]">Categories</span>
              </div>
              <Icon
                name="chevron-down"
                className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-300 ${categoriesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              className={`transition-all duration-300 ${categoriesOpen ? 'max-h-[2000px] mt-1 overflow-y-visible' : 'max-h-0 overflow-hidden'}`}
            >
              <div className="my-1 ml-7 flex flex-col gap-1 border-l-2 border-[var(--bg-tertiary)] pl-4">
                {allCategories.map((cat) => {
                  const isActive =
                    (cat === 'All' && (location.pathname === '/' || location.pathname === '' || location.pathname === '/shop')) ||
                    location.pathname === `/category/${encodeURIComponent(cat)}`;
                  const iconType = categoryIconTypes[cat] || 'leaf';

                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-all rounded-full
                        ${isActive
                          ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }
                      `}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <MenuGlyph type={iconType} className="w-4 h-4" />
                      </span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="my-2 border-t border-[var(--border-color)]"></div>

          {/* User Account / Navigation */}
          {userNavItems.map(({ path, label, Icon: NavIcon, currentCount }) => {
            const isActive = location.pathname === path;
            const isCart = path === '/cart';
            const icon = NavIcon({ active: isActive });
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-3 rounded-full text-left text-sm transition-all
                  ${isActive
                    ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }
                `}
              >
                <div className="relative">
                  {icon}
                  {isCart && currentCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-terracotta)] text-[10px] font-bold text-[#f5ead8]">
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
            {infoNavItems.map(({ path, label, iconType }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  state={{ from: location.pathname }}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-left text-sm transition-all
                    ${isActive
                      ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }
                  `}
                >
                  <span className="w-6 h-6 flex items-center justify-center shrink-0">
                    <MenuGlyph type={iconType} className="w-5 h-5" />
                  </span>
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
                  w-full flex items-center gap-3 px-3.5 py-3 rounded-full text-left text-sm transition-all mt-auto mb-4
                  ${location.pathname.startsWith('/admin')
                    ? 'bg-[var(--color-terracotta)] text-[#f5ead8] font-semibold'
                    : 'text-[var(--color-accent-700)] bg-[var(--color-accent-200)] hover:bg-[var(--color-accent-300)]'
                  }
                `}
              >
                <Icon name="settings" className="h-5 w-5" strokeWidth={1.9} />
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
      <main className="w-full max-w-7xl mx-auto px-4 py-5 md:py-8 flex-1 min-h-[calc(100dvh-4rem)]">
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border-color)] safe-bottom">
        <div className="mx-auto max-w-lg px-4">
          <div className="flex h-16 items-center justify-between">
            {bottomTabs.slice(0, 2).map(({ path, label, Icon: NavIcon }) => {
              const isActive = path === '/shop'
                ? location.pathname === '/shop' || location.pathname.startsWith('/category/')
                : location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`flex w-[60px] flex-col items-center gap-0.5 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {NavIcon({ active: isActive })}
                  <span className={`text-[10px] ${isActive ? 'font-bold' : ''}`}>{label}</span>
                </NavLink>
              );
            })}

            {/* Cart sits in the middle as the primary action */}
            <NavLink to="/cart" aria-label="Cart" className="relative -mt-6">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[var(--bg-primary)] bg-[#7a8a5e] text-[#f9f4ed] shadow-[var(--shadow-medium)]">
                <Icon name="bag" className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[var(--bg-primary)] bg-[var(--color-terracotta)] px-1 text-[11px] font-bold text-[#f5ead8]">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </span>
            </NavLink>

            {bottomTabs.slice(2).map(({ path, label, Icon: NavIcon }) => {
              const isActive = location.pathname === path;
              const tabLabel = path === '/wishlist' ? 'Saved' : path === '/account' ? 'You' : label;
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`flex w-[60px] flex-col items-center gap-0.5 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {NavIcon({ active: isActive })}
                  <span className={`text-[10px] ${isActive ? 'font-bold' : ''}`}>{tabLabel}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Back to Top Button (hidden on admin pages) */}
      {!isAdminArea && <BackToTop />}
    </div>
  );
}

