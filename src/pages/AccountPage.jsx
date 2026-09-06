import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { getUserProfile, saveUserProfile, lookupPincode } from '../services/userService';
import { getOrdersByUserId } from '../services/orderService';
import SEO from '../components/SEO';
import OrderCard from '../components/OrderCard';
import { ACTIVE_STATUSES } from '../utils/orderStatus';
import Icon, { GoogleMark } from '../components/Icon';
import { ListRow, PageBar } from '../components/storefront';
import { NURSERY_HOURS } from '../config/constants';
import { buildOrderSupportMessage, buildWhatsAppLink } from '../utils/nurseryMessages';

const ACCOUNT_ICON_PATHS = Object.freeze({
  leaf: (
    <>
      <path d="M5 19c8 0 14-6 14-14V4h-1C10 4 4 10 4 18v1h1Z" />
      <path d="M4 20c3.5-4.5 8-7 13-8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 11.5a2 2 0 0 0 2 1.5h8.9a2 2 0 0 0 2-1.6L22 8H6" />
    </>
  ),
  heart: <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-9a5.2 5.2 0 0 0 0-7.4Z" />,
  package: (
    <>
      <path d="m3 7 9-5 9 5-9 5-9-5Z" />
      <path d="M3 7v10l9 5 9-5V7" />
      <path d="M12 12v10" />
      <path d="m7.5 4.5 9 5" />
    </>
  ),
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.5 2.5 0 0 1 4.8 1.1c0 1.7-1.6 2.4-2.3 3.1-.4.4-.5.8-.5 1.3" />
      <path d="M12 18h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  appearance: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18" />
    </>
  ),
  settings: (
    <>
      <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.3a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0L6.1 6a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.3.2a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.3.2a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.3-.2a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.3a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.3a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.3.2a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.3-.2a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.3-.2a2 2 0 0 0 .7-2.7l-.2-.4A2 2 0 0 0 18 6l-.3.2a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  )
});

function AccountIcon({ name, className = 'h-6 w-6', strokeWidth = 1.9 }) {
  const iconPath = ACCOUNT_ICON_PATHS[name];

  if (!iconPath) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={`inline-block flex-shrink-0 text-[var(--text-primary)] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
    >
      {iconPath}
    </svg>
  );
}


/** A menu row that can carry an arbitrary icon node and a trailing control. */
function MenuRow({ icon, title, subtitle, trailing, to, onClick }) {
  const body = (
    <div className="flex w-full items-center gap-[13px] px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-tertiary)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--text-primary)]">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {trailing ?? <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />}
    </div>
  );

  if (to) return <Link to={to} className="block">{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full">{body}</button>;
  return body;
}

export default function AccountPage() {
  const { user, loading, isAdmin, signInWithGoogle, logout } = useAuth();
  const { wishlist, addToCart } = useCart();
  const { success, error } = useToast();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    pincode: '',
    district: '',
    state: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [lookupCode, setLookupCode] = useState('');

  // Sync whatsapp when "same as phone" is checked
  useEffect(() => {
    if (sameAsPhone) {
      setProfile(prev => ({ ...prev, whatsapp: prev.phone }));
    }
  }, [profile.phone, sameAsPhone]);

  const loadProfile = useCallback(async () => {
    try {
      // Load profile data
      const data = await getUserProfile(user.uid);

      // Load orders independently so it doesn't break profile if it fails (e.g. missing index)
      try {
        const orders = await getOrdersByUserId(user.uid);
        setUserOrders(orders || []);
      } catch (err) {
        console.error('Failed to load user orders:', err);
        setUserOrders([]);
      }

      if (data) {
        setProfile({
          name: data.name || user.displayName || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          address: data.address || '',
          pincode: data.pincode || '',
          district: data.district || '',
          state: data.state || ''
        });
      } else {
        setProfile(prev => ({ ...prev, name: user.displayName || '' }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }, [user]);

  // Load profile on mount
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  // After login, redirect back to requested page (e.g., order detail)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect');
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, location.search, navigate]);

  const handlePincodeChange = async (value) => {
    setProfile(prev => ({ ...prev, pincode: value }));

    // Auto-lookup when 6 digits entered
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      setLookingUp(true);
      try {
        const result = await lookupPincode(value);
        if (result) {
          setProfile(prev => ({
            ...prev,
            state: result.state,
            district: result.district
          }));
          success('Location found!');
        } else {
          error('Invalid pincode');
        }
      } catch {
        error('Could not lookup pincode');
      } finally {
        setLookingUp(false);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserProfile(user.uid, profile);
      success('Profile saved!');
      setEditMode(false);
    } catch {
      error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleOrderAgain = async (order) => {
    const items = order.items || [];
    if (items.length === 0) {
      error('This order has no plants left to re-add.');
      return;
    }
    setReorderBusy(true);
    let added = 0;
    for (const item of items) {
      try {
        await addToCart({
          id: item.productId,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl
        }, item.quantity || 1);
        added += 1;
      } catch {
        // Keep going — the summary reports what actually landed in the cart.
      }
    }
    setReorderBusy(false);
    if (added === 0) error('Could not add those plants to your cart.');
    else success(`${added} ${added === 1 ? 'plant' : 'plants'} back in your cart.`);
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      success('Welcome back!');
    } catch {
      error('Failed to sign in. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      success('See you soon!');
    } catch {
      error('Failed to sign out.');
    }
  };

  const placedOrders = useMemo(
    () => userOrders.filter(order => order.status !== 'pending' && order.status !== 'cancelled'),
    [userOrders]
  );
  const activeOrders = useMemo(
    () => placedOrders.filter(order => ACTIVE_STATUSES.includes(order.status)),
    [placedOrders]
  );
  const plantsBought = useMemo(
    () => placedOrders.reduce((sum, order) => sum + (order.totalItems || 0), 0),
    [placedOrders]
  );
  const recentOrders = placedOrders.slice(0, 3);

  const localityLine = [profile.district, profile.state, profile.pincode].filter(Boolean).join(', ');
  // The field already shows the RPH- prefix, so a pasted full code must not double it up.
  const trimmedLookup = lookupCode.trim().toUpperCase().replace(/^RPH-?/, '');
  const lookupHref = buildWhatsAppLink(
    buildOrderSupportMessage({ orderId: trimmedLookup ? `RPH-${trimmedLookup}` : '' })
  );

  if (loading) {
    return (
      <div className="animate-fade-in text-center py-12">
        <div className="animate-pulse-soft">
          <AccountIcon name="leaf" className="mx-auto h-10 w-10" />
        </div>
      </div>
    );
  }

  const googleButton = (
    <button
      type="button"
      onClick={handleSignIn}
      className="flex min-h-12 w-full items-center justify-center gap-[11px] rounded-full border border-[var(--border-color)] bg-white text-[15px] font-semibold text-[#201e1d] transition-opacity hover:opacity-90"
    >
      <GoogleMark className="h-[19px] w-[19px]" />
      Continue with Google
    </button>
  );

  return (
    <div className="animate-fade-in">
      <SEO title="My Account" description="Manage your profile, view orders, and update delivery details." noindex />

      <PageBar title={user ? 'Your account' : 'You'} fallbackTo="/" />

      {user ? (
        <div className="flex flex-col gap-4">
          {/* Who you are, and what you have bought */}
          <section className="panel-deep px-5 py-[22px]">
            <div className="flex items-center gap-3.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={profile.name || user.displayName || 'Your profile photo'}
                  className="h-[54px] w-[54px] shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#7a8a5e] font-display text-[22px] text-[#f9f4ed]">
                  {(profile.name || user.displayName || user.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[21px] leading-tight text-[var(--panel-deep-text)]">
                  {profile.name || user.displayName || 'Plant lover'}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--panel-deep-muted)]">{user.email}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2.5">
              {[
                { label: 'Orders', value: placedOrders.length },
                { label: 'Plants bought', value: plantsBought },
                { label: 'Wishlisted', value: wishlist.length }
              ].map((stat) => (
                <div key={stat.label} className="flex-1 rounded-[18px] bg-[rgba(249,244,237,0.1)] px-3.5 py-3">
                  <p className="font-display text-xl leading-none text-[var(--panel-deep-text)]">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-[var(--panel-deep-muted)]">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Everything you can change from here */}
          <div className="overflow-hidden rounded-[24px] bg-[var(--bg-secondary)]">
            <MenuRow
              to="/orders"
              icon={<AccountIcon name="cart" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
              title="My orders"
              subtitle={`${activeOrders.length} on the way`}
              trailing={(
                <span className="flex shrink-0 items-center gap-[7px]">
                  {activeOrders.length > 0 && (
                    <span className="rounded-full bg-[var(--color-sage-200)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-sage-800)]">
                      {activeOrders.length} active
                    </span>
                  )}
                  <Icon name="chevron-right" className="h-4 w-4 text-[var(--text-secondary)]" />
                </span>
              )}
            />
            <MenuRow
              to="/wishlist"
              icon={<AccountIcon name="heart" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
              title="Wishlist"
              subtitle={`${wishlist.length} ${wishlist.length === 1 ? 'plant' : 'plants'} saved`}
            />
            <MenuRow
              onClick={() => setEditMode(true)}
              icon={<Icon name="map-pin" className="h-[18px] w-[18px] text-[var(--text-primary)]" />}
              title="Delivery address"
              subtitle={localityLine || 'Add where your plants should land'}
            />
            <MenuRow
              onClick={() => setEditMode(true)}
              icon={<Icon name="phone" className="h-[18px] w-[18px] text-[var(--text-primary)]" />}
              title="WhatsApp number"
              subtitle={profile.whatsapp || profile.phone || 'Add the number we should message'}
            />
            <MenuRow
              onClick={handleLogout}
              icon={<Icon name="log-out" className="h-[18px] w-[18px] text-[var(--text-primary)]" />}
              title="Sign out"
              trailing={<span />}
            />
          </div>

          {/* Profile editor */}
          {editMode && (
            <section className="rounded-[28px] bg-[var(--bg-secondary)] p-5 animate-fade-in">
              <h2 className="mb-4 font-display text-xl text-[var(--text-primary)]">Delivery details</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="accountName" className="eyebrow mb-1.5 block">Name</label>
                  <input
                    id="accountName"
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="Your name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="accountPhone" className="eyebrow mb-1.5 block">Phone</label>
                    <input
                      id="accountPhone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="input"
                      placeholder="Mobile"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor="accountWhatsapp" className="eyebrow">WhatsApp</label>
                      <span className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="accountSameAsPhone"
                          checked={sameAsPhone}
                          onChange={(e) => setSameAsPhone(e.target.checked)}
                          className="h-3 w-3 rounded accent-[var(--color-terracotta)]"
                        />
                        <label htmlFor="accountSameAsPhone" className="cursor-pointer select-none text-[10px] text-[var(--text-secondary)]">
                          Same as phone
                        </label>
                      </span>
                    </div>
                    <input
                      id="accountWhatsapp"
                      type="tel"
                      value={profile.whatsapp}
                      onChange={(e) => setProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="input"
                      placeholder="WhatsApp"
                      disabled={sameAsPhone}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="accountAddress" className="eyebrow mb-1.5 block">Address</label>
                  <textarea
                    id="accountAddress"
                    value={profile.address}
                    onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                    className="input resize-none"
                    placeholder="House/Flat, Street, Area"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="accountPincode" className="eyebrow mb-1.5 flex items-center gap-1.5">
                      Pincode
                      {lookingUp && <AccountIcon name="search" className="h-3 w-3" strokeWidth={2.2} />}
                    </label>
                    <input
                      id="accountPincode"
                      type="text"
                      value={profile.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input"
                      placeholder="6 digits"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <label htmlFor="accountDistrict" className="eyebrow mb-1.5 block">District</label>
                    <input
                      id="accountDistrict"
                      type="text"
                      value={profile.district}
                      onChange={(e) => setProfile(prev => ({ ...prev, district: e.target.value }))}
                      className="input"
                      placeholder="District"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="accountState" className="eyebrow mb-1.5 block">State</label>
                  <input
                    id="accountState"
                    type="text"
                    value={profile.state}
                    onChange={(e) => setProfile(prev => ({ ...prev, state: e.target.value }))}
                    className="input"
                    placeholder="State"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setEditMode(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Recent orders */}
          <section>
            <h2 className="mb-3 font-display text-xl text-[var(--text-primary)]">My orders</h2>
            {recentOrders.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOrderAgain={handleOrderAgain}
                    reorderBusy={reorderBusy}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[24px] bg-[var(--bg-secondary)] px-4 py-4">
                <AccountIcon name="package" className="h-6 w-6" />
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  No orders yet. Whatever you buy will be listed here with its status.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Guest introduction */}
          <section className="rounded-[28px] bg-[var(--bg-secondary)] px-[22px] py-6">
            <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <AccountIcon name="user" className="h-[26px] w-[26px]" />
            </span>
            <h2 className="mt-4 font-display text-[23px] leading-tight text-[var(--text-primary)]">
              Browsing as a guest
            </h2>
            <p className="mb-[18px] mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              You can buy without an account. Signing in just saves your cart, wishlist and address so the
              next order takes a minute.
            </p>
            {googleButton}
          </section>

          {/* Guest order lookup */}
          <section className="rounded-[28px] bg-[var(--color-sage-200)] p-5">
            <h2 className="font-display text-lg text-[var(--color-sage-900)]">Ordered without an account?</h2>
            <p className="mb-3.5 mt-1.5 text-[13px] leading-relaxed text-[var(--color-sage-800)]">
              Enter the code from your WhatsApp confirmation and we will pull up the order.
            </p>
            <div className="flex gap-2.5">
              <label htmlFor="guestOrderCode" className="sr-only">Order code</label>
              <span className="flex flex-1 items-center gap-1 rounded-full bg-[var(--color-neutral-100)] px-[18px]">
                <span className="text-sm tracking-[0.06em] text-[var(--color-neutral-600)]">RPH-</span>
                <input
                  id="guestOrderCode"
                  type="text"
                  value={lookupCode}
                  onChange={(event) => setLookupCode(event.target.value.toUpperCase().slice(0, 24))}
                  placeholder="20260118-AB12CD"
                  className="min-h-11 w-full min-w-0 bg-transparent text-sm tracking-[0.06em] text-[#201e1d] outline-none placeholder:text-[var(--color-neutral-500)]"
                />
              </span>
              <a
                href={lookupHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  if (!trimmedLookup) {
                    event.preventDefault();
                    error('Enter the code from your WhatsApp confirmation first.');
                  }
                }}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-[#7a8a5e] px-[18px] text-sm font-bold text-[#f9f4ed]"
              >
                Ask us to pull it up
              </a>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--color-sage-800)]">
              Guest orders are only readable from their own link, so this opens WhatsApp with your code and
              we send the link back.
            </p>
          </section>

          {/* Guest quick rows */}
          <div className="overflow-hidden rounded-[24px] bg-[var(--bg-secondary)]">
            <MenuRow
              to="/wishlist"
              icon={<AccountIcon name="heart" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
              title="Wishlist"
              subtitle={`${wishlist.length} saved on this phone`}
            />
            <ListRow
              icon="book"
              title="Care guides"
              subtitle="Watering, monsoon, pests"
              to="/guides"
              tone="plain"
            />
            <ListRow
              icon="whatsapp"
              title="Message the nursery"
              subtitle={NURSERY_HOURS}
              href={buildWhatsAppLink(buildOrderSupportMessage({}))}
              tone="plain"
            />
          </div>
        </div>
      )}

      {/* Help and support */}
      <div className="mt-4 overflow-hidden rounded-[24px] bg-[var(--bg-secondary)]">
        <MenuRow
          to="/reviews"
          icon={<AccountIcon name="star" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
          title="Reviews"
          subtitle="What other plant people say"
        />
        <MenuRow
          to="/faq"
          icon={<AccountIcon name="help" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
          title="FAQ and policies"
          subtitle="Shipping, replacements, returns"
        />
        <MenuRow
          to="/contact"
          icon={<AccountIcon name="mail" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
          title="Contact us"
          subtitle="We answer every message ourselves"
        />
      </div>

      {/* Appearance */}
      <div className="mt-4 flex items-center gap-[13px] rounded-[24px] bg-[var(--bg-secondary)] px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
          <AccountIcon name="appearance" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span className="flex-1 text-sm font-bold text-[var(--text-primary)]">Appearance</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          aria-label="Appearance"
          className="cursor-pointer rounded-full bg-[var(--bg-tertiary)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Admin */}
      {isAdmin && (
        <NavLink to="/admin" className="mt-4 block overflow-hidden rounded-[24px] bg-[var(--bg-secondary)]">
          <MenuRow
            icon={<AccountIcon name="settings" className="h-[18px] w-[18px]" strokeWidth={2.2} />}
            title="Admin dashboard"
            subtitle="Catalogue, orders and analysis"
          />
        </NavLink>
      )}
    </div>
  );
}
