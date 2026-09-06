import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';

let userServicePromise = null;

function loadUserService() {
  if (!userServicePromise) {
    userServicePromise = import('../services/userService');
  }

  return userServicePromise;
}

export default function ProfileSetupModal() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    address: '',
    pincode: '',
    district: '',
    state: '',
    phone: '',
    whatsapp: ''
  });
  const [sameAsPhone, setSameAsPhone] = useState(false);

  // Sync whatsapp when "same as phone" is checked
  useEffect(() => {
    if (sameAsPhone) {
      setProfile(prev => ({ ...prev, whatsapp: prev.phone }));
    }
  }, [profile.phone, sameAsPhone]);

  // Check if we should show the modal
  useEffect(() => {
    if (user) {
      checkProfileStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkProfileStatus = async () => {
    // Only check on fresh login
    const isFreshLogin = sessionStorage.getItem('isFreshLogin');
    if (!isFreshLogin) return;

    // Consume the flag so it doesn't trigger again on reload
    sessionStorage.removeItem('isFreshLogin');

    try {
      const { getUserProfile } = await loadUserService();
      const data = await getUserProfile(user.uid);

      // If profile is empty/incomplete, show modal
      if (!data || !data.address) {
        setProfile(prev => ({
          ...prev,
          name: user.displayName || '',
          ...data
        }));
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Error checking profile:', err);
    }
  };

  const handlePincodeChange = async (value) => {
    // Allow only digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setProfile(prev => ({ ...prev, pincode: cleanValue }));

    // Auto-lookup when 6 digits entered
    if (cleanValue.length === 6) {
      setLookingUp(true);
      try {
        const { lookupPincode } = await loadUserService();
        const result = await lookupPincode(cleanValue);
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
        // Silent error for optional lookup
        console.error('Pincode lookup error:', err);
      } finally {
        setLookingUp(false);
      }
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { saveUserProfile } = await loadUserService();
      await saveUserProfile(user.uid, profile);
      success('Profile updated!');
      setIsOpen(false);
    } catch (err) {
      error('Failed to save details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Sheet */}
      <div className="animate-slide-up relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg-secondary)] shadow-[var(--shadow-lifted)] sm:rounded-[28px]">
        {/* Header */}
        <div className="flex-none px-6 pb-4 pt-5 text-center">
          <div className="mb-4 flex justify-center sm:hidden">
            <span className="h-1 w-11 rounded-full bg-[var(--bg-tertiary)]" />
          </div>
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-sage-200)] text-[var(--color-sage-800)]">
            <Icon name="map-pin" className="h-6 w-6" />
          </span>
          <h2 className="font-display text-[23px] text-[var(--text-primary)]">
            Where should we send your plants?
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
            Fill this in once and your next order takes a minute. You can skip it and enter the details at checkout instead.
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
          {/* Name */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
              Name
            </p>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              placeholder="Your full name"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
                Phone
              </p>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="input"
                placeholder="10 digits"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
                WhatsApp
              </p>
              <input
                type="tel"
                value={profile.whatsapp}
                onChange={(e) => setProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="input disabled:opacity-60"
                placeholder="Same as phone"
                disabled={sameAsPhone}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              id="modalSameAsPhone"
              checked={sameAsPhone}
              onChange={(e) => setSameAsPhone(e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-terracotta)]"
            />
            <span className="text-[13px] text-[var(--text-secondary)]">
              WhatsApp is the same as my phone
            </span>
          </label>

          {/* Address */}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
              Address
            </p>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
              className="input"
              rows={2}
              placeholder="House, street, area"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
                Pincode
                {lookingUp && <Icon name="refresh" className="h-3 w-3 animate-spin" />}
              </p>
              <input
                type="text"
                value={profile.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className="input"
                placeholder="643102"
                maxLength={6}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
                District
              </p>
              <input
                type="text"
                value={profile.district}
                onChange={(e) => setProfile(prev => ({ ...prev, district: e.target.value }))}
                className="input bg-[var(--bg-sunken)] px-3.5 text-[13px]"
                placeholder="District"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
                State
              </p>
              <input
                type="text"
                value={profile.state}
                onChange={(e) => setProfile(prev => ({ ...prev, state: e.target.value }))}
                className="input bg-[var(--bg-sunken)] px-3.5 text-[13px]"
                placeholder="State"
              />
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            District and state fill in from your pincode.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center gap-3 px-6 pb-6 pt-4 safe-bottom">
          <button onClick={handleSkip} className="btn btn-secondary flex-1">
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary flex-[2]"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            ) : (
              'Save details'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
