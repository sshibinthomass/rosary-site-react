import { useState, useEffect, useCallback, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resolveImageUrl } from '../utils/imageCompressor';
import { initiateWhatsAppCheckout } from '../services/whatsappCheckout';
import { getUserProfile, saveUserProfile, lookupPincode } from '../services/userService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { validatePromoCode } from '../services/promoService';
import { useSettings } from '../context/SettingsContext';
import { CURRENCY } from '../config/constants';
import { CATALOG_REFRESH_EVENT } from '../utils/catalogRefresh';
import { NavLink } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import SEO from '../components/SEO';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, removeFromCart, updateQuantity, clearCart, addToCart, isInCart } = useCart();
  const { success, error } = useToast();
  const { settings } = useSettings();
  const promoEnabled = settings.promoCodesEnabled ?? true;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productStockMap, setProductStockMap] = useState({});

  const refreshCartStockData = useCallback(async () => {
    if (cart.length === 0) {
      setProductStockMap({});
      return;
    }

    const map = {};
    await Promise.all(
      cart.map(async (item) => {
        try {
          const isLimited = typeof item.productId === 'string' && /^L/i.test(item.productId);
          const product = isLimited
            ? await getLimitedById(item.productId)
            : await getProductById(item.productId);
          if (product) map[item.productId] = product;
        } catch (stockError) {
          console.warn('Could not refresh cart stock for item:', item.productId, stockError);
        }
      })
    );
    setProductStockMap(map);
  }, [cart]);

  useEffect(() => {
    refreshCartStockData();
  }, [refreshCartStockData]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleCatalogRefresh = () => {
      refreshCartStockData();
    };

    window.addEventListener(CATALOG_REFRESH_EVENT, handleCatalogRefresh);
    return () => window.removeEventListener(CATALOG_REFRESH_EVENT, handleCatalogRefresh);
  }, [refreshCartStockData]);

  const isItemOutOfStock = useCallback((item) => {
    const product = productStockMap[item.productId];
    if (!product) return false;
    return product.available === false || (product.qtyAvailable === 'NA' && !product.inStock);
  }, [productStockMap]);

  const outOfStockItems = cart.filter(isItemOutOfStock);
  const hasOutOfStockItems = outOfStockItems.length > 0;
  const inStockItems = cart.filter((item) => !isItemOutOfStock(item)).map(item => {
    const product = productStockMap[item.productId];
    if (product) {
      const currentPrice = product.salesPrice || product.price;
      if (currentPrice !== undefined) {
        return { ...item, price: currentPrice };
      }
    }
    return item;
  });
  const inStockTotal = inStockItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoInfo, setPromoInfo] = useState(null); // { code, discount, type, value }
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const discountedTotal = promoInfo ? Math.max(0, inStockTotal - promoInfo.discount) : inStockTotal;

  // Re-validate promo whenever cart total changes
  useEffect(() => {
    if (!promoInfo) return;
    validatePromoCode(promoInfo.code, inStockTotal).then((result) => {
      if (!result.valid) {
        setPromoInfo(null);
        setPromoCode(promoInfo.code);
        setPromoError(result.reason);
      } else {
        // Recalculate discount for updated total (e.g. percentage)
        setPromoInfo(prev => prev ? { ...prev, discount: result.discount } : null);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inStockTotal]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoInfo(null);
    try {
      const result = await validatePromoCode(promoCode.trim(), inStockTotal);
      if (result.valid) {
        setPromoInfo({
          code: promoCode.trim().toUpperCase(),
          discount: result.discount,
          type: result.promo.type,
          value: result.promo.value
        });
        success(`Promo applied! You save ${CURRENCY}${result.discount.toLocaleString('en-IN')}`);
      } else {
        setPromoError(result.reason);
      }
    } catch {
      setPromoError('Could not validate promo code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoInfo(null);
    setPromoCode('');
    setPromoError('');
  };

  // Clear promo whenever the user navigates away from this page
  useEffect(() => {
    return () => {
      setPromoInfo(null);
      setPromoCode('');
      setPromoError('');
    };
  }, []);

  const [showCheckout, setShowCheckout] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const checkoutRef = useRef(null);
  
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
  const [saveDetailsForNextOrder, setSaveDetailsForNextOrder] = useState(false);
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

  const finalizeCheckoutResult = async (checkoutResult) => {
    if (checkoutResult?.savedToFirestore) {
      await clearCart();
      success('Order created successfully!');
    } else {
      success('WhatsApp opened with your cart details. Your cart is still saved.');
    }

    setShowCheckout(false);
  };

  const handleCheckoutClick = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (user && saveDetailsForNextOrder) {
        try {
          await saveUserProfile(user.uid, {
            name: checkoutInfo.name,
            phone: checkoutInfo.phone,
            whatsapp: checkoutInfo.whatsapp,
            address: checkoutInfo.address,
            pincode: checkoutInfo.pincode,
            district: checkoutInfo.district,
            state: checkoutInfo.state
          });
        } catch (profileError) {
          console.error('Error saving profile:', profileError);
          error('Could not save your details, but continuing with your order request.');
        }
      }

      const checkoutResult = await initiateWhatsAppCheckout(inStockItems, discountedTotal, checkoutInfo, user?.uid || null, promoInfo);
      await finalizeCheckoutResult(checkoutResult);
    } catch (err) {
      console.error('Checkout failed:', err);
      error('Failed to create order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemClick = async (item) => {
    try {
      const isLimited = typeof item.productId === 'string' && /^L/i.test(item.productId);
      const fullProduct = isLimited
        ? await getLimitedById(item.productId)
        : await getProductById(item.productId);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      } else {
        setSelectedProduct({ id: item.productId, ...item });
      }
    } catch (err) {
      console.warn('Could not load full cart product details:', err);
      setSelectedProduct({ id: item.productId, ...item });
    }
  };

  return (
    <div className="animate-fade-in">
      <SEO title="Your Cart" description="Review items in your cart and proceed to checkout. Shop plants from Rosary Plant House." noindex />
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
                    src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
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
                src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
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

        {/* Promo Code Section */}
        {promoEnabled && !promoInfo ? (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                placeholder="Promo code"
                className="input flex-1 text-sm uppercase placeholder:normal-case"
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCode.trim()}
                className="btn btn-secondary text-sm px-4 shrink-0 disabled:opacity-50"
              >
                {promoLoading ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                ) : 'Apply'}
              </button>
            </div>
            {promoError && (
              <p className="text-xs text-red-500">{promoError}</p>
            )}
            {!promoError && (
              <p className="text-[10px] text-[var(--text-secondary)]">
                🌿 Follow us on <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" className="text-[var(--color-forest)] font-medium hover:underline">Instagram</a> for exclusive promo codes!
              </p>
            )}
          </div>
        ) : promoEnabled && promoInfo ? (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 text-base">🏷️</span>
              <div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">{promoInfo.code}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  −{CURRENCY}{promoInfo.discount.toLocaleString('en-IN')} saved
                </p>
              </div>
            </div>
            <button
              onClick={handleRemovePromo}
              className="text-xs text-green-700 dark:text-green-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : null}

        {promoInfo && (
          <div className="flex justify-between text-green-600 dark:text-green-400 text-sm font-medium">
            <span>Discount</span>
            <span>−{CURRENCY}{promoInfo.discount.toLocaleString('en-IN')}</span>
          </div>
        )}

        <div className="flex justify-between gap-3 text-[var(--text-secondary)] text-sm">
          <span>Delivery charge</span>
          <span className="text-right">Delivery charge will be confirmed on WhatsApp before payment</span>
        </div>
        <hr className="border-[var(--border-color)]" />
        <div className="flex justify-between text-[var(--text-primary)] text-lg">
          <span className="font-semibold">Total</span>
          <div className="text-right">
            {promoInfo && (
              <p className="text-xs text-[var(--text-secondary)] line-through">
                {CURRENCY}{inStockTotal.toLocaleString('en-IN')}
              </p>
            )}
            <span className="font-bold">{CURRENCY}{discountedTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {!showCheckout ? (
          <button
            onClick={() => {
              setShowCheckout(true);
              setTimeout(() => {
                checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="btn btn-primary w-full mt-4"
          >
            Enter delivery details
          </button>
        ) : (
          <div ref={checkoutRef} className="space-y-4 mt-4 animate-fade-in border-t-2 border-[var(--color-forest)]/20 pt-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2">
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="w-5 h-5 rounded-full bg-[var(--color-forest)] text-white text-[10px] font-bold flex items-center justify-center">✓</span>
                Cart
              </span>
              <span className="flex-1 h-px bg-[var(--color-forest)]/30" />
              <span className="flex items-center gap-1 text-[var(--color-forest)] font-semibold">
                <span className="w-5 h-5 rounded-full bg-[var(--color-forest)] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                Delivery Details
              </span>
            </div>

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
            
            {user && (
              <label className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 px-3 py-2">
                <input
                  type="checkbox"
                  checked={saveDetailsForNextOrder}
                  onChange={(e) => setSaveDetailsForNextOrder(e.target.checked)}
                  className="rounded text-[var(--text-primary)] focus:ring-[var(--color-forest)]"
                />
                <span className="text-xs text-[var(--text-primary)]/80">
                  Save these details for next order
                </span>
              </label>
            )}

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 p-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">What happens next</h4>
              <ol className="space-y-1 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                <li>Send your cart on WhatsApp</li>
                <li>We confirm availability and delivery charge</li>
                <li>You pay after confirmation</li>
                <li>Will be dispatched on nearest dispatch date.</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCheckout(false)}
                disabled={isSaving}
                className="btn btn-secondary flex-1 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCheckoutClick}
                disabled={isSaving}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>💬</span>
                )}
                {isSaving ? 'Opening WhatsApp...' : 'Send order request on WhatsApp'}
              </button>
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
