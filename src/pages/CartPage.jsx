import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resolveImageUrl } from '../utils/imageCompressor';
import { initiateWhatsAppCheckout } from '../services/whatsappCheckout';
import { openExternalUrl, reserveExternalUrlWindow } from '../utils/externalNavigation';
import { buildWhatsAppUrlForOrder } from '../utils/orderWhatsApp';
import { getUserProfile, saveUserProfile, lookupPincode } from '../services/userService';
import { getOrdersByUserId, getOrderUrl } from '../services/orderService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { validatePromoCode } from '../services/promoService';
import { useSettings } from '../context/SettingsContext';
import {
  CURRENCY,
  FREE_PLANT_THRESHOLD,
  INSTAGRAM_URL,
  NURSERY_HOURS,
  NURSERY_PHONE_DISPLAY,
  NURSERY_PHONE_TEL,
} from '../config/constants';
import { CATALOG_REFRESH_EVENT } from '../utils/catalogRefresh';
import { normalizeCheckoutPincode } from '../utils/checkoutLocation';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { Link } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import SEO from '../components/SEO';
import Icon, { GoogleMark } from '../components/Icon';
import {
  DeepPanel,
  EmptyState,
  ListRow,
  NumberedStep,
  PageBar,
  QuantityStepper,
  StickyBar,
} from '../components/storefront';

const DISPATCH_DAYS = { 1: 'Monday', 3: 'Wednesday' };

/** Orders reach the nearest upcoming Monday or Wednesday dispatch. */
function getNextDispatchDay(from = new Date()) {
  const today = from.getDay();
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = (today + offset) % 7;
    if (DISPATCH_DAYS[candidate]) return DISPATCH_DAYS[candidate];
  }
  return 'Monday';
}

/** Pulls the pre-written WhatsApp body back out of a wa.me link. */
function readWhatsAppMessageText(whatsappUrl) {
  if (!whatsappUrl) return '';
  try {
    const query = String(whatsappUrl).split('?')[1] || '';
    return new URLSearchParams(query).get('text') || '';
  } catch {
    return '';
  }
}

export default function CartPage() {
  const { user, signInWithGoogle } = useAuth();
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
  const plantCount = inStockItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoInfo, setPromoInfo] = useState(null); // { code, discount, type, value }
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const discountedTotal = promoInfo ? Math.max(0, inStockTotal - promoInfo.discount) : inStockTotal;
  // The one number the summary, the free-plant card and the continue button share.
  const plantsTotal = discountedTotal;
  const freePlantRemaining = Math.max(0, FREE_PLANT_THRESHOLD - plantsTotal);
  const hasFreePlant = freePlantRemaining === 0;

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
  const [savedProfile, setSavedProfile] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const checkoutRef = useRef(null);
  const pincodeLookupRequestRef = useRef(0);

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
  const [signingIn, setSigningIn] = useState(false);
  const [saveDetailsForNextOrder, setSaveDetailsForNextOrder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [checkoutConfirmation, setCheckoutConfirmation] = useState(null);
  const [checkoutIssue, setCheckoutIssue] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingOrdersLoading, setPendingOrdersLoading] = useState(false);
  const [openingPendingOrderId, setOpeningPendingOrderId] = useState(null);

  const orderMessageText = useMemo(
    () => readWhatsAppMessageText(checkoutConfirmation?.whatsappUrl),
    [checkoutConfirmation]
  );
  const dispatchDay = useMemo(() => getNextDispatchDay(), []);

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

  const loadPendingOrders = useCallback(async () => {
    if (!user) {
      setPendingOrders([]);
      return;
    }

    setPendingOrdersLoading(true);
    try {
      const userOrders = await getOrdersByUserId(user.uid);
      setPendingOrders((userOrders || []).filter(
        order => order.status?.toLowerCase() === 'pending'
      ));
    } catch (pendingError) {
      console.error('Failed to load pending WhatsApp orders:', pendingError);
    } finally {
      setPendingOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPendingOrders();
  }, [loadPendingOrders]);

  const loadSavedProfile = async () => {
    try {
      const profile = await getUserProfile(user.uid);
      if (profile || user.displayName) {
        const nextInfo = {
          name: profile?.name || user.displayName || '',
          phone: profile?.phone || '',
          whatsapp: profile?.whatsapp || '',
          address: profile?.address || '',
          pincode: profile?.pincode || '',
          district: profile?.district || '',
          state: profile?.state || ''
        };
        setCheckoutInfo(prev => ({ ...prev, ...nextInfo }));
        setSavedProfile(nextInfo.address ? nextInfo : null);
        setProfileLoaded(true);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handlePincodeChange = async (value) => {
    const requestId = ++pincodeLookupRequestRef.current;
    const cleanValue = normalizeCheckoutPincode({}, value).pincode;
    setCheckoutInfo(prev => normalizeCheckoutPincode(prev, value));

    if (cleanValue.length !== 6) {
      setLookingUp(false);
      return;
    }

    setLookingUp(true);
    try {
      const result = await lookupPincode(cleanValue);
      if (pincodeLookupRequestRef.current !== requestId) return;

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
      if (pincodeLookupRequestRef.current === requestId) {
        console.error('Pincode lookup error:', err);
        error('Could not look up pincode');
      }
    } finally {
      if (pincodeLookupRequestRef.current === requestId) {
        setLookingUp(false);
      }
    }
  };

  const handleOpenWhatsAppAgain = async () => {
    if (!checkoutConfirmation?.whatsappUrl) return;

    try {
      await openExternalUrl(checkoutConfirmation.whatsappUrl);
      try {
        await checkoutConfirmation.recordWhatsAppRetry?.({ success: true });
      } catch (trackingError) {
        console.warn('Checkout tracking warning:', trackingError);
      }
      setCheckoutConfirmation(prev => prev ? {
        ...prev,
        whatsappOpened: true,
        whatsappError: ''
      } : prev);
      success('WhatsApp opened. Please tap Send there to confirm.');
    } catch (openError) {
      try {
        await checkoutConfirmation.recordWhatsAppRetry?.({ success: false, error: openError });
      } catch (trackingError) {
        console.warn('Checkout tracking warning:', trackingError);
      }
      console.error('Failed to reopen WhatsApp checkout:', openError);
      error('Could not reopen WhatsApp. Please try again.');
    }
  };

  const handleCopyOrderText = async () => {
    if (!orderMessageText) {
      error('There is no order text to copy yet.');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderMessageText);
      } else {
        const holder = document.createElement('textarea');
        holder.value = orderMessageText;
        holder.setAttribute('readonly', '');
        holder.style.position = 'fixed';
        holder.style.opacity = '0';
        document.body.appendChild(holder);
        holder.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(holder);
        if (!copied) throw new Error('Copy command was rejected');
      }
      success('Order text copied. Paste it into any chat or email.');
    } catch (copyError) {
      console.error('Could not copy the order text:', copyError);
      error('Could not copy the order text. Please try again.');
    }
  };

  const formatPendingOrderDate = (timestamp) => {
    if (!timestamp) return 'Date unavailable';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const handleSendPendingOrderOnWhatsApp = async (order) => {
    const orderId = order.id || order.orderId;
    const orderUrl = order.orderUrl || getOrderUrl(order.id);

    setOpeningPendingOrderId(orderId);
    try {
      await openExternalUrl(buildWhatsAppUrlForOrder(order, orderUrl));
      success('WhatsApp opened. Please tap Send there to confirm.');
    } catch (openError) {
      console.error('Failed to open pending order on WhatsApp:', openError);
      error('Could not open WhatsApp. Please try again.');
    } finally {
      setOpeningPendingOrderId(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Screen C — Send the message                                        */
  /* ------------------------------------------------------------------ */
  // The RPH order code is what we look an order up by, so that is the code the
  // customer is given. The tracker's code only stands in when nothing was saved.
  const confirmationSupportCode = checkoutConfirmation
    ? checkoutConfirmation.orderId || checkoutConfirmation.supportCode
    : '';

  const checkoutConfirmationPanel = checkoutConfirmation ? (
    <div className="animate-fade-in pb-40">
      <PageBar title="Place your order" fallbackTo="/" />

      <div className="flex flex-col items-center px-2 pb-2 pt-3 text-center">
        <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[var(--color-sage-200)] text-[var(--color-sage-700)]">
          <Icon name="send" className="h-8 w-8" strokeWidth={2} />
        </span>
        <h2 className="mb-2 mt-4 font-display text-[27px] leading-tight text-[var(--text-primary)]">
          {checkoutConfirmation.whatsappOpened ? 'One last step' : 'Your order is safely saved'}
        </h2>
        <p className="max-w-[340px] text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Your order is placed only once your WhatsApp message reaches us. If the chat is open, just
          press send — the list is already written for you. We reply between 9 AM and 9 PM.
        </p>
        <p className="mt-3 max-w-[340px] text-[13px] leading-relaxed text-[var(--text-muted)]">
          {checkoutConfirmation.whatsappOpened
            ? 'Your order request was opened in WhatsApp. Please tap Send there to confirm. No payment has been collected on this site.'
            : 'WhatsApp could not open, but this order is already saved. Resend it below and we will pick it up — it will not create a second order.'}
        </p>
      </div>

      <div className="mt-5 rounded-[28px] bg-[var(--bg-secondary)] p-5">
        {confirmationSupportCode && (
          <>
            <div className="flex items-baseline justify-between gap-4 pb-2.5">
              <span className="text-[13px] text-[var(--text-secondary)]">Support code</span>
              <span className="font-mono text-sm font-bold tracking-[0.06em] text-[var(--text-primary)]">
                {confirmationSupportCode}
              </span>
            </div>
            <p className="border-b border-[var(--border-color)] pb-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              Screenshot this code and send it to us on WhatsApp if anything about the order looks
              wrong, or if you are unsure about it.
            </p>
          </>
        )}
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <span className="text-[13px] text-[var(--text-secondary)]">Plants</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {checkoutConfirmation.itemCount} · {CURRENCY}
            {(checkoutConfirmation.total || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 pt-2.5">
          <span className="text-[13px] text-[var(--text-secondary)]">If we get it today</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">Dispatch {dispatchDay}</span>
        </div>
        {checkoutConfirmation.orderUrl && (
          <a
            href={checkoutConfirmation.orderUrl}
            className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[var(--border-color)] py-2.5 font-display text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            View order
          </a>
        )}
      </div>

      <div className="mt-4 rounded-[28px] bg-[var(--bg-secondary)] p-1">
        <div className="rounded-[24px] bg-[var(--color-accent-700)] px-5 py-[18px]">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-200)]">
            Resend
          </p>
          <p className="mb-3.5 font-display text-[19px] leading-tight text-[#fff2eb]">
            Send this order again
          </p>
          <button
            type="button"
            onClick={handleOpenWhatsAppAgain}
            disabled={!checkoutConfirmation.whatsappUrl}
            className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#fff2eb] font-display text-[15px] text-[var(--color-accent-700)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="whatsapp" filled className="h-[17px] w-[17px]" />
            Resend on WhatsApp
          </button>
          <p className="mt-2.5 text-xs leading-relaxed text-[var(--color-accent-200)]">
            Reopens the chat with the same list and code. It will not create a second order.
          </p>
        </div>

        <div className="px-5 pb-4 pt-[18px]">
          <p className="mb-1 font-display text-[17px] text-[var(--text-primary)]">Still stuck?</p>
          <p className="mb-3.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Support code: {confirmationSupportCode} — screenshot it and send it on WhatsApp, and we
            will place the order for you.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={`tel:${NURSERY_PHONE_TEL}`}
              className="flex items-center gap-3 rounded-[20px] bg-[var(--bg-primary)] px-3.5 py-3 transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage-200)] text-[var(--color-sage-700)]">
                <Icon name="phone" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  Call {NURSERY_PHONE_DISPLAY}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                  {NURSERY_HOURS}
                </span>
              </span>
              <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            </a>
            <button
              type="button"
              onClick={handleCopyOrderText}
              className="flex w-full items-center gap-3 rounded-[20px] bg-[var(--bg-primary)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-200)] text-[var(--color-accent-700)]">
                <Icon name="copy" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  Copy the order text
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                  Paste it into any chat or email
                </span>
              </span>
              <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>
      </div>

      <h3 className="mb-3 mt-7 font-display text-xl text-[var(--text-primary)]">
        Get ready meanwhile
      </h3>
      <div className="flex flex-col gap-2">
        <ListRow
          to="/guides/succulents-in-india"
          title="Get the potting mix ready"
          subtitle="Gritty, fast-draining, no garden soil"
        />
        <ListRow
          to="/guides/root-rot-succulent-care"
          title="Keep the roots from staying wet"
          subtitle="Spot root rot in the first few weeks"
        />
      </div>

      <p className="mt-5 text-xs leading-relaxed text-[var(--text-secondary)]">
        Damaged in transit? Send a video on the delivery day or the next and we replace it.
      </p>

      <StickyBar>
        <Link to="/" className="btn btn-primary flex-1">
          Keep shopping
        </Link>
        <Link to="/orders" className="btn btn-secondary shrink-0">
          My orders
        </Link>
      </StickyBar>
    </div>
  ) : null;

  const pendingOrdersPanel = user && (pendingOrdersLoading || pendingOrders.length > 0) ? (
    <div className="mb-4 rounded-[28px] bg-[var(--color-accent-200)] p-5 text-left">
      <div className="mb-3.5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--color-accent-700)]">
          <Icon name="clock" className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg text-[var(--color-accent-900)]">
            Pending WhatsApp orders
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-accent-800)]">
            These order requests are saved, but not placed yet. Send them on WhatsApp to confirm.
          </p>
        </div>
      </div>

      {pendingOrdersLoading && pendingOrders.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--bg-secondary)] p-3.5 text-[13px] text-[var(--text-secondary)]">
          Checking pending orders...
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pendingOrders.map(order => {
            const orderKey = order.id || order.orderId;
            const orderUrl = order.orderUrl || getOrderUrl(order.id);
            const orderTotal = (Number(order.totalAmount) || 0)
              + (Number(order.deliveryCharge) || 0)
              - (Number(order.manualDiscount) || 0);

            return (
              <div key={orderKey} className="rounded-[24px] bg-[var(--bg-secondary)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
                      {order.orderId || order.id}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {formatPendingOrderDate(order.createdAt)} · {order.totalItems || order.items?.length || 0} items · {CURRENCY}{orderTotal.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link to={`/order/${order.id}`} className="btn btn-secondary text-sm">
                      View order
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleSendPendingOrderOnWhatsApp(order)}
                      disabled={openingPendingOrderId === orderKey}
                      className="btn btn-sage gap-2 text-sm"
                    >
                      {openingPendingOrderId === orderKey ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Icon name="whatsapp" filled className="h-4 w-4" />
                      )}
                      <span>Send on WhatsApp</span>
                    </button>
                  </div>
                </div>
                {orderUrl && (
                  <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                    This link will be included in the WhatsApp message.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  if (checkoutConfirmation) {
    return (
      <div className="animate-fade-in">
        <SEO title="Your Cart" description="Review items in your cart and proceed to checkout. Shop plants from Rosary Plant House." noindex />
        {checkoutConfirmationPanel}
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="animate-fade-in">
        <SEO title="Your Cart" description="Review items in your cart and proceed to checkout. Shop plants from Rosary Plant House." noindex />
        <PageBar title="Your cart" fallbackTo="/shop" />
        {pendingOrdersPanel}
        <EmptyState
          icon="bag"
          title="Your cart is empty"
          description="Nothing on the bench yet. Pick a few plants and they will wait here for you."
        >
          <Link to="/shop" className="btn btn-primary">
            Browse the bench
          </Link>
        </EmptyState>
      </div>
    );
  }

  const finalizeCheckoutResult = async (checkoutResult) => {
    setCheckoutConfirmation({
      orderUrl: checkoutResult?.orderUrl || checkoutResult?.order?.orderUrl || '',
      whatsappUrl: checkoutResult?.whatsappUrl || '',
      savedToFirestore: Boolean(checkoutResult?.savedToFirestore),
      whatsappOpened: checkoutResult?.whatsappOpened !== false,
      whatsappError: checkoutResult?.whatsappError || '',
      supportCode: checkoutResult?.supportCode || '',
      orderId: checkoutResult?.order?.orderId || '',
      itemCount: plantCount,
      total: plantsTotal,
      recordWhatsAppRetry: checkoutResult?.recordWhatsAppRetry
    });

    if (checkoutResult?.savedToFirestore) {
      if (checkoutResult.order) {
        setPendingOrders(prev => [
          checkoutResult.order,
          ...prev.filter(order => order.id !== checkoutResult.order.id)
        ]);
      }
      await clearCart();
    }

    setShowCheckout(false);
  };

  const handleCheckoutClick = async () => {
    if (isSaving) return;
    const externalUrlReservation = reserveExternalUrlWindow();
    setCheckoutIssue(null);
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

      const checkoutResult = await initiateWhatsAppCheckout(
        inStockItems,
        discountedTotal,
        checkoutInfo,
        user?.uid || null,
        promoInfo,
        externalUrlReservation,
      );
      await finalizeCheckoutResult(checkoutResult);
    } catch (err) {
      console.error('Checkout failed:', err);
      setShowCheckout(true);
      const message = 'Order was not confirmed. Your cart is safe—please try again.';
      setCheckoutIssue({
        supportCode: err?.supportCode || '',
        message: 'Order was not confirmed. Your cart is safe—please try again.'
      });
      error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckoutSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      success('Signed in. Your details will be saved for next time.');
    } catch {
      error('Could not sign in. You can still order as a guest.');
    } finally {
      setSigningIn(false);
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

  const showSavedAddressCard = Boolean(user && savedProfile && !editingAddress);

  const fieldLabel = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)]';
  const pillField = 'w-full rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-[18px] text-sm text-[var(--text-primary)] outline-none transition-colors min-h-11 placeholder:text-[var(--text-muted)] focus:border-[var(--color-terracotta)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[var(--bg-sunken)] disabled:text-[var(--text-muted)]';
  const readOnlyField = 'w-full rounded-full bg-[var(--bg-sunken)] px-3.5 text-[13px] text-[var(--text-primary)] outline-none min-h-11';

  /* ------------------------------------------------------------------ */
  /* Screen B — Delivery details                                         */
  /* ------------------------------------------------------------------ */
  const deliveryScreen = (
    <div ref={checkoutRef} className="animate-fade-in pb-40">
      <PageBar
        title="Delivery details"
        trailing={
          <button
            type="button"
            onClick={() => setShowCheckout(false)}
            className="shrink-0 text-sm font-semibold text-[var(--color-accent-700)] hover:underline"
          >
            Cart
          </button>
        }
        fallbackTo="/cart"
      />

      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#7a8a5e] text-[11px] font-bold text-[#f9f4ed]">
          ✓
        </span>
        <span className="text-xs text-[var(--text-secondary)]">Cart</span>
        <span className="h-0.5 flex-1 rounded-full bg-[var(--border-color)]" />
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--color-terracotta)] text-[11px] font-bold text-[#f5ead8]">
          2
        </span>
        <span className="text-xs font-bold text-[var(--text-primary)]">Details</span>
        <span className="h-0.5 flex-1 rounded-full bg-[var(--border-color)]" />
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)]">
          3
        </span>
      </div>

      {showSavedAddressCard ? (
        <div className="flex flex-col gap-3.5">
          <div className="rounded-[28px] bg-[var(--color-sage-200)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-sage-700)]">
                  Saved from your last order
                </p>
                <p className="font-display text-lg leading-tight text-[var(--text-primary)]">
                  {savedProfile.name || 'Your saved address'}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-sage-900)]">
                  {savedProfile.address}
                  <br />
                  {[savedProfile.district, savedProfile.state, savedProfile.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="mt-2 text-[13px] text-[var(--color-sage-900)]">
                  {savedProfile.phone}
                  {savedProfile.whatsapp && savedProfile.whatsapp === savedProfile.phone
                    ? ' · WhatsApp same'
                    : savedProfile.whatsapp
                      ? ` · WhatsApp ${savedProfile.whatsapp}`
                      : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAddress(true)}
                className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-3.5 py-[7px] text-xs font-bold text-[var(--color-sage-900)]"
              >
                Change
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-full bg-[var(--bg-secondary)] px-4 py-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-terracotta)] text-[#f5ead8]">
              <Icon name="check" className="h-3 w-3" />
            </span>
            <span className="text-[13px] text-[var(--text-primary)]">Deliver to this address</span>
          </div>

          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {savedProfile.district || 'Your district'} is 1–2 days from dispatch. The delivery charge
            for this pincode comes on WhatsApp with your stock confirmation.
          </p>

          <div className="rounded-[28px] bg-[var(--bg-secondary)] p-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-[var(--text-secondary)]">{plantCount} plants</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {CURRENCY}{inStockTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <span className="font-display text-[17px] text-[var(--text-primary)]">Plants total</span>
              <span className="font-display text-[22px] text-[var(--text-primary)]">
                {CURRENCY}{plantsTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <ListRow
            icon="list"
            to="/orders"
            title="Your last 3 orders"
            subtitle="Reorder anything with one tap"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {!user && (
            <div className="flex items-center gap-3 rounded-[24px] bg-[var(--color-sage-200)] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--color-sage-700)]">
                <Icon name="user" className="h-[18px] w-[18px]" />
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--color-sage-900)]">
                Sign in and these details fill themselves in next time.
              </p>
              <button
                type="button"
                onClick={handleCheckoutSignIn}
                disabled={signingIn}
                className="flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-3.5 text-[13px] font-bold text-[var(--text-primary)] transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <GoogleMark className="h-4 w-4" />
                {signingIn ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          )}

          <div>
            <label className={fieldLabel} htmlFor="checkout-name">Name</label>
            <input
              id="checkout-name"
              type="text"
              value={checkoutInfo.name}
              onChange={(e) => setCheckoutInfo(prev => ({ ...prev, name: e.target.value }))}
              className={pillField}
              placeholder="Your full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel} htmlFor="checkout-phone">Phone</label>
              <input
                id="checkout-phone"
                type="tel"
                value={checkoutInfo.phone}
                onChange={(e) => setCheckoutInfo(prev => ({ ...prev, phone: e.target.value }))}
                className={pillField}
                placeholder="10 digits"
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="checkout-whatsapp">WhatsApp</label>
              <input
                id="checkout-whatsapp"
                type="tel"
                value={checkoutInfo.whatsapp}
                onChange={(e) => setCheckoutInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                className={pillField}
                placeholder="Same as phone"
                disabled={sameAsPhone}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5" htmlFor="sameAsPhone">
            <input
              type="checkbox"
              id="sameAsPhone"
              checked={sameAsPhone}
              onChange={(e) => setSameAsPhone(e.target.checked)}
              className="h-5 w-5 rounded-md accent-[var(--color-terracotta)]"
            />
            <span className="text-[13px] text-[var(--text-primary)]">
              WhatsApp is the same as my phone
            </span>
          </label>

          <div>
            <label className={fieldLabel} htmlFor="checkout-address">Address</label>
            <textarea
              id="checkout-address"
              value={checkoutInfo.address}
              onChange={(e) => setCheckoutInfo(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full resize-y rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-[18px] py-3.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-terracotta)]"
              placeholder="House, street, area"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className={fieldLabel} htmlFor="checkout-pincode">
                Pincode {lookingUp && '…'}
              </label>
              <input
                id="checkout-pincode"
                type="text"
                value={checkoutInfo.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className={pillField}
                maxLength={6}
                placeholder="643102"
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="checkout-district">District</label>
              <input
                id="checkout-district"
                type="text"
                value={checkoutInfo.district}
                readOnly
                className={readOnlyField}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="checkout-state">State</label>
              <input
                id="checkout-state"
                type="text"
                value={checkoutInfo.state}
                readOnly
                className={readOnlyField}
              />
            </div>
          </div>

          <p className="-mt-1 text-xs text-[var(--text-secondary)]">
            District and state fill in from your pincode.
          </p>

          {user && (
            <label className="flex items-center gap-2.5 rounded-full bg-[var(--bg-secondary)] px-4 py-3">
              <input
                type="checkbox"
                checked={saveDetailsForNextOrder}
                onChange={(e) => setSaveDetailsForNextOrder(e.target.checked)}
                className="h-5 w-5 rounded-md accent-[var(--color-terracotta)]"
              />
              <span className="text-[13px] text-[var(--text-primary)]">
                Save these details for next order
              </span>
            </label>
          )}
        </div>
      )}

      {checkoutIssue && (
        <div className="mt-4 rounded-[24px] bg-[var(--color-accent-200)] p-4 text-[13px] text-[var(--color-accent-900)]">
          <p>{checkoutIssue.message}</p>
          {checkoutIssue.supportCode && (
            <p className="mt-1 font-mono text-xs font-bold">
              Support code: {checkoutIssue.supportCode}
            </p>
          )}
        </div>
      )}

      <DeepPanel
        className="mt-5"
        eyebrow="What happens next"
        title="Four steps, all on WhatsApp"
      >
        <div className="flex flex-col gap-4">
          <NumberedStep index="1" title="Your cart reaches us">
            Opens WhatsApp with the list filled in. Nothing is charged.
          </NumberedStep>
          <NumberedStep index="2" title="We tell you the delivery charge">
            It depends on your location, so we confirm it with stock — usually within the hour, 9 AM
            to 9 PM.
          </NumberedStep>
          <NumberedStep index="3" title="You pay the total">
            Plants plus delivery, by GPay, PayTM, PhonePe or net banking. No cash on delivery.
          </NumberedStep>
          <NumberedStep index="4" title="Packed and dispatched">
            Nearest Monday or Wednesday, bare-root.
          </NumberedStep>
        </div>
      </DeepPanel>

      <p className="mt-4 text-xs leading-relaxed text-[var(--text-secondary)]">
        We keep your name, phone and address to pack the order. Nothing else.
      </p>

      <StickyBar>
        <button
          type="button"
          onClick={handleCheckoutClick}
          disabled={isSaving}
          className="btn btn-sage w-full"
        >
          {isSaving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Icon name="whatsapp" filled className="h-[19px] w-[19px]" />
          )}
          {isSaving ? 'Opening WhatsApp…' : 'Send this order on WhatsApp'}
        </button>
      </StickyBar>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* Screen A — Cart                                                     */
  /* ------------------------------------------------------------------ */
  const cartScreen = (
    <div className="animate-fade-in pb-40">
      <PageBar
        title="Your cart"
        fallbackTo="/shop"
        trailing={
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-[13px] font-semibold text-[var(--color-accent-700)]">
              {plantCount} items
            </span>
            <button
              type="button"
              onClick={clearCart}
              className="text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Clear all
            </button>
          </span>
        }
      />

      {pendingOrdersPanel}

      {hasOutOfStockItems && (
        <div className="mb-4 rounded-[28px] bg-[var(--color-accent-200)] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--color-accent-700)]">
              <Icon name="alert" className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base text-[var(--color-accent-900)]">
                Some plants in your cart are out of stock
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-accent-800)]">
                They are shown below and will not be included in your total or order.
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex flex-col gap-2">
            {outOfStockItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-[20px] bg-[var(--bg-secondary)] p-2.5"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-tertiary)]">
                  <img
                    src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
                    alt={getStorefrontProductTitle(item)}
                    className="washed h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                    {getStorefrontProductTitle(item)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    Out of stock – cannot be ordered
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  aria-label={`Remove ${getStorefrontProductTitle(item)} from cart`}
                  className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-color)] px-3.5 text-[13px] font-bold text-[var(--color-accent-700)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <Icon name="x" className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {inStockItems.map((item) => (
          <div
            key={item.productId}
            role="button"
            tabIndex={0}
            onClick={() => handleItemClick(item)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(item); }}
            className="flex cursor-pointer items-center gap-3 rounded-[28px] bg-[var(--bg-tertiary)] p-3 text-left"
          >
            <div className="h-[78px] w-[78px] shrink-0 overflow-hidden rounded-[20px] bg-[var(--bg-sunken)]">
              <img
                src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
                alt={getStorefrontProductTitle(item)}
                className="washed h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base leading-tight text-[var(--text-primary)]">
                {getStorefrontProductTitle(item)}
              </p>
              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                {[item.category, `#${item.productId}`, `${CURRENCY}${(item.price || 0).toLocaleString('en-IN')} each`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div
                className="mt-2 flex items-center gap-2.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="presentation"
              >
                <QuantityStepper
                  size="sm"
                  value={item.quantity}
                  onDecrease={() => updateQuantity(item.productId, item.quantity - 1)}
                  onIncrease={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="border-transparent bg-[var(--bg-secondary)]"
                />
                <span className="font-display text-[17px] text-[var(--text-primary)]">
                  {CURRENCY}{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  aria-label={`Remove ${getStorefrontProductTitle(item)} from cart`}
                  className="ml-auto flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-color)] px-3.5 text-[13px] font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent-700)] hover:text-[var(--color-accent-700)]"
                >
                  <Icon name="x" className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {promoEnabled && !promoInfo && (
        <div className="mt-4">
          <div className="flex gap-2.5">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
              placeholder="Promo code"
              aria-label="Promo code"
              className="min-h-11 flex-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-[18px] text-sm uppercase text-[var(--text-primary)] outline-none transition-colors placeholder:normal-case placeholder:text-[var(--text-secondary)] focus:border-[var(--color-terracotta)]"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={promoLoading || !promoCode.trim()}
              className="btn btn-secondary shrink-0 px-5"
            >
              {promoLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : 'Apply'}
            </button>
          </div>
          {promoError ? (
            <p className="mt-2 text-xs text-[var(--color-accent-700)]">{promoError}</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Codes go out on{' '}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--color-accent-700)] hover:underline"
              >
                Instagram
              </a>
              {' '}first.
            </p>
          )}
        </div>
      )}

      {promoEnabled && promoInfo && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-full bg-[var(--color-sage-200)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-sage-900)]">{promoInfo.code}</p>
            <p className="mt-0.5 text-xs text-[var(--color-sage-800)]">
              −{CURRENCY}{promoInfo.discount.toLocaleString('en-IN')} saved
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemovePromo}
            className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs font-bold text-[var(--color-sage-900)]"
          >
            Remove
          </button>
        </div>
      )}

      <div className="mt-4 rounded-[28px] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-[var(--text-secondary)]">{plantCount} plants</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {CURRENCY}{inStockTotal.toLocaleString('en-IN')}
          </span>
        </div>

        {promoInfo && (
          <div className="flex items-baseline justify-between gap-4 pt-2.5 text-sm text-[var(--color-sage-800)]">
            <span>Discount</span>
            <span className="font-bold">
              −{CURRENCY}{promoInfo.discount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-4 py-2.5">
          <span className="text-sm text-[var(--text-secondary)]">Delivery charge</span>
          <span className="text-right text-[13px] text-[var(--text-secondary)]">
            We tell you on WhatsApp<br />before you pay
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <span className="font-display text-lg text-[var(--text-primary)]">Plants total</span>
          <span className="font-display text-2xl text-[var(--text-primary)]">
            {CURRENCY}{plantsTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-[28px] bg-[var(--color-sage-200)] px-5 py-[18px]">
        <Icon name="gift" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-sage-700)]" />
        <p className="text-[13px] leading-relaxed text-[var(--color-sage-900)]">
          {hasFreePlant ? (
            'Your free plant is included.'
          ) : (
            <>
              Add <span className="font-bold">{CURRENCY}{freePlantRemaining.toLocaleString('en-IN')}</span>
              {' '}more and we drop in a free plant.
            </>
          )}
        </p>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        Plants ship bare-root, no pot unless the listing says so. Delivery is charged at cost and we
        tell you the amount on WhatsApp before you pay.
      </p>

      <StickyBar>
        <div className="w-full">
          <button
            type="button"
            onClick={() => {
              setShowCheckout(true);
              setTimeout(() => {
                checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
            className="btn btn-primary w-full"
          >
            Continue · {CURRENCY}{plantsTotal.toLocaleString('en-IN')}
          </button>
          <p className="mt-2 text-center text-[11px] text-[var(--text-secondary)]">
            Nothing is charged yet
          </p>
        </div>
      </StickyBar>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <SEO title="Your Cart" description="Review items in your cart and proceed to checkout. Shop plants from Rosary Plant House." noindex />
      {showCheckout ? deliveryScreen : cartScreen}

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
