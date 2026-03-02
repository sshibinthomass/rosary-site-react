import { useState, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { initiateWhatsAppCheckout } from '../services/whatsappCheckout';
import { getUserProfile, saveUserProfile, lookupPincode } from '../services/userService';
import { getProductById } from '../services/productService';
import { CURRENCY } from '../config/constants';
import { NavLink } from 'react-router-dom';
import ProductModal from '../components/ProductModal';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, removeFromCart, updateQuantity, clearCart, addToCart, isInCart } = useCart();
  const { success, error } = useToast();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productStockMap, setProductStockMap] = useState({});

  useEffect(() => {
    if (cart.length === 0) return;
    const fetchStockData = async () => {
      const map = {};
      await Promise.all(
        cart.map(async (item) => {
          try {
            const product = await getProductById(item.productId);
            if (product) map[item.productId] = product;
          } catch {}
        })
      );
      setProductStockMap(map);
    };
    fetchStockData();
  }, [cart]);

  const isItemOutOfStock = useCallback((item) => {
    const product = productStockMap[item.productId];
    if (!product) return false;
    return product.available === false || (product.qtyAvailable === 'NA' && !product.inStock);
  }, [productStockMap]);

  const outOfStockItems = cart.filter(isItemOutOfStock);
  const hasOutOfStockItems = outOfStockItems.length > 0;
  const inStockItems = cart.filter((item) => !isItemOutOfStock(item));
  const inStockTotal = inStockItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const [showCheckout, setShowCheckout] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  
  const [checkoutInfo, setCheckoutInfo] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    pincode: '',
    district: '',
    state: ''
  });

  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  // Load saved profile when checkout opens
  useEffect(() => {
    if (showCheckout && user && !profileLoaded) {
      loadSavedProfile();
    }
  }, [showCheckout, user]);

  // Sync whatsapp when "same as phone" is checked
  useEffect(() => {
    if (sameAsPhone) {
      setCheckoutInfo(prev => ({ ...prev, whatsapp: prev.phone }));
    }
  }, [checkoutInfo.phone, sameAsPhone]);

  const loadSavedProfile = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      if (profile || user.displayName) {
        setCheckoutInfo(prev => ({
          ...prev,
          name: profile?.name || user.displayName || '',
          phone: profile?.phone || '',
          whatsapp: profile?.whatsapp || '',
          address: profile?.address || '',
          pincode: profile?.pincode || '',
          district: profile?.district || '',
          state: profile?.state || ''
        }));
        setProfileLoaded(true);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handlePincodeChange = async (value) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setCheckoutInfo(prev => ({ ...prev, pincode: cleanValue }));
    
    if (cleanValue.length === 6) {
      setLookingUp(true);
      try {
        const result = await lookupPincode(cleanValue);
        if (result) {
          setCheckoutInfo(prev => ({
            ...prev,
            state: result.state,
            district: result.district
          }));
          success('Location found!');
        } else {
          error('Invalid pincode');
        }
      } catch (err) {
        console.error('Pincode lookup error:', err);
      } finally {
        setLookingUp(false);
      }
    }
  };

  if (cart.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">🛒</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Your cart is empty</h2>
        <p className="text-[var(--text-secondary)] mt-2">Add some beautiful plants!</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Browse Plants
        </NavLink>
      </div>
    );
  }

  // ... (existing helper functions)

  const handleCheckoutClick = async () => {
    // If not logged in, proceed directly
    if (!user) {
      try {
        await initiateWhatsAppCheckout(inStockItems, inStockTotal, checkoutInfo, null);
        clearCart();
        setShowCheckout(false);
        success('Order created successfully!');
      } catch (err) {
        error('Failed to create order. Please try again.');
      }
      return;
    }
    // If logged in, ask to save
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // Save all checkout fields to profile
      await saveUserProfile(user.uid, {
        name: checkoutInfo.name,
        phone: checkoutInfo.phone,
        whatsapp: checkoutInfo.whatsapp,
        address: checkoutInfo.address,
        pincode: checkoutInfo.pincode,
        district: checkoutInfo.district,
        state: checkoutInfo.state
      });
      success('Profile updated!');
    } catch (err) {
      console.error('Error saving profile:', err);
      error('Failed to save profile, but proceeding with order');
    }
    
    // Proceed with order
    try {
      await initiateWhatsAppCheckout(inStockItems, inStockTotal, checkoutInfo, user.uid);
      clearCart();
      setShowCheckout(false);
      setShowSaveConfirm(false);
      success('Order created successfully!');
    } catch (err) {
      error('Failed to create order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipSave = async () => {
    try {
      await initiateWhatsAppCheckout(inStockItems, inStockTotal, checkoutInfo, user?.uid || null);
      clearCart();
      setShowCheckout(false);
      setShowSaveConfirm(false);
      success('Order created successfully!');
    } catch (err) {
      error('Failed to create order. Please try again.');
    }
  };

  const handleItemClick = async (item) => {
    try {
      const fullProduct = await getProductById(item.productId);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      } else {
        setSelectedProduct({ id: item.productId, ...item });
      }
    } catch (err) {
      setSelectedProduct({ id: item.productId, ...item });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Your Cart ({inStockItems.length})
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Clear All
        </button>
      </div>

      {/* Out of Stock Warning Banner */}
      {hasOutOfStockItems && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-base">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                Some plants in your cart are out of stock
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">
                They are shown below and will not be included in your total or order.
              </p>
            </div>
          </div>
          <div className="space-y-2 mt-1">
            {outOfStockItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 bg-red-100/60 dark:bg-red-900/40 rounded-lg p-2"
              >
                <div className="w-12 h-12 rounded-md overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
                  <img
                    src={item.imageUrl || '/placeholder-plant.jpg'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-900 dark:text-red-50 truncate">
                    {item.productId}. {item.name}
                  </p>
                  <p className="text-[10px] text-red-700 dark:text-red-200">
                    Out of stock – cannot be ordered
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-[10px] text-red-700 hover:text-red-900 dark:text-red-200 dark:hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {inStockItems.map((item) => (
          <div
            key={item.productId}
            className="card p-3 flex gap-3 cursor-pointer"
            onClick={() => handleItemClick(item)}
          >
            {/* Image */}
            <div className="w-24 h-24 md:w-20 md:h-20 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
              <img
                src={item.imageUrl || '/placeholder-plant.jpg'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--text-primary)] truncate">
                {item.productId}. {item.name}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {CURRENCY}{item.price?.toLocaleString('en-IN')}
              </p>
              
              {/* Quantity Controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(item.productId, item.quantity - 1); }}
                  className="w-9 h-9 md:w-7 md:h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--color-cream)] transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center text-[var(--text-primary)] font-medium">
                  {item.quantity}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); updateQuantity(item.productId, item.quantity + 1); }}
                  className="w-9 h-9 md:w-7 md:h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--color-cream)] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price & Remove */}
            <div className="text-right">
              <p className="font-semibold text-[var(--text-primary)]">
                {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromCart(item.productId); }}
                className="text-red-500 hover:text-red-600 text-xs mt-2"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      <div className="card p-4 space-y-3">
        <div className="flex justify-between text-[var(--text-primary)]">
          <span>Subtotal</span>
          <span className="font-semibold">{CURRENCY}{inStockTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)] text-sm">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
        <hr className="border-[var(--border-color)]" />
        <div className="flex justify-between text-[var(--text-primary)] text-lg">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{CURRENCY}{inStockTotal.toLocaleString('en-IN')}</span>
        </div>

        {!showCheckout ? (
          <button
            onClick={() => setShowCheckout(true)}
            className="btn btn-primary w-full mt-4"
          >
            Proceed to Checkout
          </button>
        ) : (
          <div className="space-y-4 mt-4 animate-fade-in border-t border-[var(--color-forest)]/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[var(--text-primary)]">Delivery Details</h3>
              <button 
                onClick={() => setShowCheckout(false)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
            
            {!user && (
              <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-2 rounded-lg">
                💡 Sign in to save your details for next time!
              </p>
            )}
            
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">Name</label>
              <input
                type="text"
                value={checkoutInfo.name}
                onChange={(e) => setCheckoutInfo(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Full Name"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">Phone</label>
                <input
                  type="tel"
                  value={checkoutInfo.phone}
                  onChange={(e) => setCheckoutInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="Mobile"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">WhatsApp</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={checkoutInfo.whatsapp}
                    onChange={(e) => setCheckoutInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="input"
                    placeholder="WhatsApp"
                    disabled={sameAsPhone}
                  />
                </div>
              </div>
            </div>
            
            {/* Same as phone checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sameAsPhone"
                checked={sameAsPhone}
                onChange={(e) => setSameAsPhone(e.target.checked)}
                className="rounded text-[var(--text-primary)] focus:ring-[var(--color-forest)]"
              />
              <label htmlFor="sameAsPhone" className="text-xs text-[var(--text-primary)]/70">
                WhatsApp number is same as Phone
              </label>
            </div>
            
            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">Address</label>
              <textarea
                value={checkoutInfo.address}
                onChange={(e) => setCheckoutInfo(prev => ({ ...prev, address: e.target.value }))}
                className="input min-h-[60px]"
                rows={2}
                placeholder="House, Street, Area"
              />
            </div>

            {/* Pincode & Location */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                  Pincode {lookingUp && '⏳'}
                </label>
                <input
                  type="text"
                  value={checkoutInfo.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="input"
                  maxLength={6}
                  placeholder="Pincode"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">District</label>
                <input
                  type="text"
                  value={checkoutInfo.district}
                  readOnly
                  className="input bg-[var(--bg-tertiary)]"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">State</label>
                <input
                  type="text"
                  value={checkoutInfo.state}
                  readOnly
                  className="input bg-[var(--bg-tertiary)]"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCheckout(false)}
                className="btn btn-secondary flex-1"
              >
                Back
              </button>
              <button
                onClick={handleCheckoutClick}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <span>💬</span> Order via WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Save Confirmation Modal */}
        {showSaveConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
            <div className="relative w-full max-w-sm bg-[var(--bg-secondary)] rounded-xl p-6 animate-scale-up space-y-4 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 bg-[var(--color-forest)]/10 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                  💾
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Save for next time?</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Do you want to update your profile with these details for faster checkout next time?
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSkipSave}
                  className="flex-1 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-sm font-medium"
                >
                  No, just order
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Yes, Save & Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={async (product) => { await addToCart(product); }}
        inCart={selectedProduct ? isInCart(selectedProduct.id) : false}
      />
    </div>
  );
}
