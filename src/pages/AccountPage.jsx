import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { getUserProfile, saveUserProfile, lookupPincode } from '../services/userService';
import { getOrdersByUserId } from '../services/orderService';
import { NavLink } from 'react-router-dom';

export default function AccountPage() {
  const { user, loading, isAdmin, signInWithGoogle, logout } = useAuth();
  const { cart, wishlist } = useCart();
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

  // Sync whatsapp when "same as phone" is checked
  useEffect(() => {
    if (sameAsPhone) {
      setProfile(prev => ({ ...prev, whatsapp: prev.phone }));
    }
  }, [profile.phone, sameAsPhone]);

  // Load profile on mount
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // After login, redirect back to requested page (e.g., order detail)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect');
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, location.search, navigate]);

  const loadProfile = async () => {
    try {
      // Load profile data
      const data = await getUserProfile(user.uid);
      
      // Load orders independently so it doesn't break profile if it fails (e.g. missing index)
      try {
        const orders = await getOrdersByUserId(user.uid);
        setUserOrders(orders || []);
      } catch (err) {
        console.error("Failed to load user orders:", err);
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
  };

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
      } catch (err) {
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
    } catch (err) {
      error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      success('Welcome back! 🌿');
    } catch (err) {
      error('Failed to sign in. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      success('See you soon! 👋');
    } catch (err) {
      error('Failed to sign out.');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in text-center py-12">
        <div className="animate-pulse-soft">
          <span className="text-4xl">🌿</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {user ? (
        /* Profile Card for Logged In User */
        <div className="card p-5">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-full h-full rounded-full object-cover border-4 border-[var(--color-forest)]"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[var(--color-forest)] flex items-center justify-center text-white text-xl font-semibold">
                  {user.displayName?.[0] || user.email?.[0] || '?'}
                </div>
              )}
              
              {isAdmin && (
                <div className="absolute -bottom-1 -right-1 bg-[var(--color-terracotta)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ADMIN
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                {profile.name || user.displayName || 'Plant Lover'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] truncate">{user.email}</p>
            </div>
            
            <button
              onClick={() => setEditMode(!editMode)}
              className="p-2 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

          {/* Profile Form */}
          {editMode && (
            <div className="space-y-3 pt-4 border-t border-[var(--border-color)] animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="input"
                    placeholder="Mobile"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-[var(--text-secondary)]">WhatsApp</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="accountSameAsPhone"
                        checked={sameAsPhone}
                        onChange={(e) => setSameAsPhone(e.target.checked)}
                        className="w-3 h-3 rounded text-[var(--color-forest)] focus:ring-[var(--color-forest)]"
                      />
                      <label htmlFor="accountSameAsPhone" className="text-[10px] text-[var(--text-secondary)] cursor-pointer select-none">
                        Same as Phone
                      </label>
                    </div>
                  </div>
                  <input
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
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Address</label>
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                  className="input min-h-[70px] resize-none"
                  placeholder="House/Flat, Street, Area"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pincode {lookingUp && <span className="text-[var(--color-terracotta)]">🔍</span>}
                  </label>
                  <input
                    type="text"
                    value={profile.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input"
                    placeholder="6 digits"
                    maxLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">District</label>
                  <input
                    type="text"
                    value={profile.district}
                    onChange={(e) => setProfile(prev => ({ ...prev, district: e.target.value }))}
                    className="input"
                    placeholder="District"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">State</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile(prev => ({ ...prev, state: e.target.value }))}
                  className="input"
                  placeholder="State"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Display saved details when not editing */}
          {!editMode && profile.address && (
            <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
               <div className="grid grid-cols-2 gap-4">
                {profile.phone && (
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Phone</p>
                    <p className="text-sm text-[var(--text-primary)]">{profile.phone}</p>
                  </div>
                )}
                {profile.whatsapp && (
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">WhatsApp</p>
                    <p className="text-sm text-[var(--text-primary)]">{profile.whatsapp}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Delivery Address</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {profile.address}
                  <br />
                  {profile.district && `${profile.district}, `}
                  {profile.state && `${profile.state}`}
                  {profile.pincode && ` - ${profile.pincode}`}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Guest Login Card */
        <div className="card p-6 text-center">
          <span className="text-5xl">👤</span>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Welcome!</h2>
          <p className="text-[var(--text-secondary)] mt-2 max-w-xs mx-auto text-sm">
            Sign in to sync your cart & wishlist across devices
          </p>
          
          <button
            onClick={handleSignIn}
            className="mt-6 flex items-center gap-3 mx-auto px-6 py-3 bg-white rounded-xl border border-[var(--border-color)] hover:border-[var(--color-forest)] transition-all hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-medium text-[var(--color-forest)]">Continue with Google</span>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="card p-3 text-center">
          <span className="text-3xl">🛒</span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{cart.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Cart Items</p>
        </div>
        <div className="card p-3 text-center">
          <span className="text-3xl">💚</span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{wishlist.length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Saved</p>
        </div>
        <NavLink to={user ? `/orders` : '#'} className="card p-3 text-center hover:bg-[var(--bg-tertiary)] transition-colors block cursor-pointer">
          <span className="text-3xl">📦</span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {userOrders.filter(o => o.status !== 'pending' && o.status !== 'cancelled').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">My Orders</p>
        </NavLink>
      </div>
 
      {/* Help & Support (Already added below in previous steps) */}

      {/* Help & Support */}
      <div className="card p-4 mt-3 space-y-3">
        <NavLink to="/reviews" className="flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] p-2 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">⭐</span>
            <span className="font-medium">Reviews</span>
          </div>
          <span className="text-[var(--text-secondary)]">›</span>
        </NavLink>
        <NavLink to="/faq" className="flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] p-2 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤔</span>
            <span className="font-medium">FAQ & Policies</span>
          </div>
          <span className="text-[var(--text-secondary)]">›</span>
        </NavLink>
        <NavLink to="/contact" className="flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] p-2 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📬</span>
            <span className="font-medium">Contact Us</span>
          </div>
          <span className="text-[var(--text-secondary)]">›</span>
        </NavLink>
      </div>

      {/* Settings */}
      <div className="card p-4 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌓</span>
          <span className="font-medium text-[var(--text-primary)]">Appearance</span>
        </div>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-none rounded-lg px-3 py-1.5 text-sm font-medium outline-none cursor-pointer"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Admin Link */}
      {isAdmin && (
        <NavLink
          to="/admin"
          className="card p-4 mt-4 flex items-center justify-between group hover:border-[var(--color-terracotta)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <span className="font-medium text-[var(--text-primary)]">Admin Dashboard</span>
          </div>
          <svg className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--color-terracotta)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </NavLink>
      )}

      {/* Logout */}
      {user && (
        <button
          onClick={handleLogout}
          className="btn btn-secondary w-full mt-6"
        >
          Sign Out
        </button>
      )}
    </div>
  );
}
