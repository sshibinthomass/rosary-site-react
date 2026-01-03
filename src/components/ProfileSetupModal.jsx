import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserProfile, saveUserProfile, lookupPincode } from '../services/userService';

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
  }, [user]);

  const checkProfileStatus = async () => {
    // Only check on fresh login
    const isFreshLogin = sessionStorage.getItem('isFreshLogin');
    if (!isFreshLogin) return;

    // Consume the flag so it doesn't trigger again on reload
    sessionStorage.removeItem('isFreshLogin');

    try {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-forest)]/10 bg-[var(--color-cream-dark)]/30">
          <div className="w-12 h-12 bg-[var(--color-forest)] rounded-full flex items-center justify-center mb-4 text-white text-2xl mx-auto shadow-lg shadow-[var(--color-forest)]/20">
            📝
          </div>
          <h2 className="text-xl font-bold text-[var(--color-forest)] text-center">
            Complete Your Profile
          </h2>
          <p className="text-[var(--color-forest)]/60 text-center mt-2 text-sm">
            Please provide these details for smooth delivery. You can skip this and fill it during checkout.
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-forest)]/70 mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="input bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="Your name"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-forest)]/70 mb-1.5 uppercase tracking-wide">
                Phone
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="input bg-gray-50/50 focus:bg-white transition-colors"
                placeholder="Mobile number"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-[var(--color-forest)]/70 uppercase tracking-wide">
                  WhatsApp
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="modalSameAsPhone"
                    checked={sameAsPhone}
                    onChange={(e) => setSameAsPhone(e.target.checked)}
                    className="w-3 h-3 rounded text-[var(--color-forest)] focus:ring-[var(--color-forest)] border-gray-300"
                  />
                  <label htmlFor="modalSameAsPhone" className="text-[10px] text-[var(--color-forest)]/60 cursor-pointer select-none font-medium">
                    Same as Phone
                  </label>
                </div>
              </div>
              <input
                type="tel"
                value={profile.whatsapp}
                onChange={(e) => setProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="input bg-gray-50/50 focus:bg-white transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="WhatsApp number"
                disabled={sameAsPhone}
              />
            </div>
          </div>
          
          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-forest)]/70 mb-1.5 uppercase tracking-wide">
              Address
            </label>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
              className="input min-h-[80px] resize-none bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="House/Flat No., Street, Landmark"
            />
          </div>
          
          {/* Location */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-[var(--color-forest)]/70 mb-1.5 uppercase tracking-wide">
                Pincode {lookingUp && <span className="animate-spin inline-block">⏳</span>}
              </label>
              <input
                type="text"
                value={profile.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className="input bg-gray-50/50 focus:bg-white transition-colors"
                placeholder="6 digits"
                maxLength={6}
              />
            </div>
            
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-forest)]/70 mb-1.5 uppercase tracking-wide">
                  District
                </label>
                <input
                  type="text"
                  value={profile.district}
                  onChange={(e) => setProfile(prev => ({ ...prev, district: e.target.value }))}
                  className="input bg-gray-50/50 focus:bg-white transition-colors"
                  placeholder="District"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-forest)]/70 mb-1.5 uppercase tracking-wide">
                  State
                </label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile(prev => ({ ...prev, state: e.target.value }))}
                  className="input bg-gray-50/50 focus:bg-white transition-colors"
                  placeholder="State"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-forest)]/10 bg-gray-50/50 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 text-[var(--color-forest)]/60 font-medium hover:text-[var(--color-forest)] hover:bg-[var(--color-cream-dark)] rounded-xl transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] btn btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Save Details</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
