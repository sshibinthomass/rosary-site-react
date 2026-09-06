import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

import { getOrderById, getOrderUrl, updateOrderStatus, updateOrderCustomer, updateDeliveryCharge, updateManualDiscount, updateOrderItems } from '../services/orderService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { resolveImageUrl } from '../utils/imageCompressor';
import { openExternalUrl } from '../utils/externalNavigation';
import { buildWhatsAppUrlForOrder } from '../utils/orderWhatsApp';
import { buildWhatsAppLink, buildOrderSupportMessage } from '../utils/nurseryMessages';
import { SITE_POLICY } from '../utils/sitePolicy';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CURRENCY,
  FACEBOOK_URL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  NURSERY_HOURS,
  NURSERY_PHONE_DISPLAY,
  NURSERY_PHONE_TEL,
  YOUTUBE_URL,
} from '../config/constants';
import OrderItemEditor from '../components/OrderItemEditor';
import SEO from '../components/SEO';
import Icon from '../components/Icon';
import { EmptyState, PageBar } from '../components/storefront';
import { generateInvoicePDF } from '../utils/pdfGenerator';

import ReactMarkdown from 'react-markdown';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

/** Steps filled on the three-segment progress rail, by status. */
const PROGRESS_STEPS = { confirmed: 1, shipped: 2, delivered: 3 };

const SOCIAL_LINKS = [
  { name: 'Instagram', href: INSTAGRAM_URL, icon: 'instagram' },
  { name: 'Facebook', href: FACEBOOK_URL, icon: 'facebook' },
  { name: 'WhatsApp', href: buildWhatsAppLink(''), icon: 'whatsapp' },
  { name: 'YouTube', href: YOUTUBE_URL, icon: 'youtube' },
];

export default function OrderPage() {
  const { orderId } = useParams();
  const { user, isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Customer edit state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Delivery charge state
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryInput, setDeliveryInput] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Manual discount state
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Name toggle state (admin only)
  const [showTitle, setShowTitle] = useState(false);
  const [productNames, setProductNames] = useState({}); // { productId: { title, commonName } }

  // Item editing state
  const [editingItems, setEditingItems] = useState(false);
  const [savingItems, setSavingItems] = useState(false);

  // PDF Exporting state
  const [exportingOrder, setExportingOrder] = useState(false);

  // Thank You Popup State
  const [showThanksPopup, setShowThanksPopup] = useState(false);
  const [sendingOrderRequest, setSendingOrderRequest] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  useEffect(() => {
    if (order && !isAdmin && order.status?.toLowerCase() !== 'pending') { // Only show popup to customers after WhatsApp confirmation
      const isDismissed = sessionStorage.getItem(`thanksPopupDismissed_${orderId}`) === 'true';
      if (!isDismissed) {
        // Show after a short delay
        const timer = setTimeout(() => {
          setShowThanksPopup(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [order, orderId, isAdmin]);

  const handleCloseThanksPopup = () => {
    sessionStorage.setItem(`thanksPopupDismissed_${orderId}`, 'true');
    setShowThanksPopup(false);
  };

  const handleSendPendingOrderOnWhatsApp = async () => {
    if (!order) return;
    const pendingOrderUrl = order.orderUrl || getOrderUrl(order.id);

    setSendingOrderRequest(true);
    try {
      await openExternalUrl(buildWhatsAppUrlForOrder(order, pendingOrderUrl));
      success('WhatsApp opened. Please tap Send there to confirm.');
    } catch (err) {
      console.error('Failed to open pending order on WhatsApp:', err);
      showError('Could not open WhatsApp. Please try again.');
    } finally {
      setSendingOrderRequest(false);
    }
  };


  const loadOrder = async () => {
    try {
      const orderData = await getOrderById(orderId);
      if (orderData) {
        setOrder(orderData);
        setEditCustomer(orderData.customer || {});
        setDeliveryInput(orderData.deliveryCharge?.toString() || '');
        setDiscountInput(orderData.manualDiscount?.toString() || '');

        // Fetch product names for admin toggle
        fetchProductNames(orderData.items);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is the order owner
  const isOrderOwner = user && order?.customer?.userId && user.uid === order.customer.userId;
  const canEditCustomer = isAdmin || isOrderOwner;

  // Fetch product names for toggle
  const fetchProductNames = async (items) => {
    try {
      const names = {};
      for (const item of items) {
        const isLimited = typeof item.productId === 'string' && /^L/i.test(item.productId);
        let product = null;
        try {
          product = isLimited
            ? await getLimitedById(item.productId)
            : await getProductById(item.productId);
        } catch {
          // ignore individual failures
        }

        if (product) {
          const title = product.title || item.name || product.name || product.commonName;
          const commonName = product.commonName || product.name || item.name || title;
          const plantId = product.id || item.productId;
          names[item.productId] = {
            title,
            commonName,
            plantId,
            description: product.description,
            watering: product.watering,
            sunlight: product.sunlight,
            transit: product.transit
          };
        } else {
          names[item.productId] = { title: item.name, commonName: item.name, plantId: item.productId };
        }
      }
      setProductNames(names);
    } catch (err) {
      console.error('Failed to load product names:', err);
    }
  };

  const handleToggleNames = () => {
    setShowTitle(prev => !prev);
  };

  const getItemName = (item) => {
    const names = productNames[item.productId];
    if (!names) return item.name;

    // For non-admin viewers, always show the Title/Display name.
    if (!isAdmin) {
      return names.title;
    }

    // Admins can toggle between Title and Common Name.
    return showTitle ? names.title : names.commonName;
  };

  const getItemPlantId = (item) => {
    const names = productNames[item.productId];
    if (names?.plantId) return names.plantId;
    return item.productId || '';
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder(prev => ({ ...prev, status: newStatus }));
      success(`Status updated to ${newStatus}`);
    } catch {
      showError('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveCustomer = async () => {
    setSavingCustomer(true);
    try {
      await updateOrderCustomer(order.id, editCustomer);
      setOrder(prev => ({ ...prev, customer: editCustomer }));
      setIsEditingCustomer(false);
      success('Customer details updated!');
    } catch {
      showError('Failed to update details');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleCancelEdit = () => {
    setEditCustomer(order.customer || {});
    setIsEditingCustomer(false);
  };

  const handleSaveDelivery = async () => {
    setSavingDelivery(true);
    try {
      const charge = parseFloat(deliveryInput) || 0;
      await updateDeliveryCharge(order.id, charge);
      setOrder(prev => ({ ...prev, deliveryCharge: charge }));
      setEditingDelivery(false);
      success('Delivery charge updated!');
    } catch {
      showError('Failed to update delivery charge');
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    try {
      const discount = parseFloat(discountInput) || 0;
      await updateManualDiscount(order.id, discount);
      setOrder(prev => ({ ...prev, manualDiscount: discount }));
      setEditingDiscount(false);
      success('Discount updated!');
    } catch {
      showError('Failed to update discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleSaveItems = async (newItems) => {
    setSavingItems(true);
    try {
      const result = await updateOrderItems(order.id, newItems);
      setOrder(prev => {
        const updated = {
          ...prev,
          items: newItems,
          totalItems: result.totalItems,
          totalAmount: result.totalAmount,
          originalAmount: result.originalAmount,
          discountAmount: result.promoRemoved ? 0 : (result.discountAmount ?? prev.discountAmount)
        };
        if (result.promoRemoved) {
          delete updated.promoCode;
          delete updated.discountType;
          delete updated.discountValue;
          delete updated.originalAmount;
        }
        return updated;
      });
      setEditingItems(false);
      fetchProductNames(newItems);
      if (result.promoRemoved) {
        success('Items updated. Promo removed — order total is below the minimum.');
      } else {
        success('Order items updated!');
      }
    } catch {
      showError('Failed to update items');
    } finally {
      setSavingItems(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  /** "Monday, 2 Sept" — used for the plain-language line under the progress rail. */
  const formatDay = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)]';
      case 'confirmed': return 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)]';
      case 'shipped': return 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)]';
      case 'delivered': return 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]';
      case 'cancelled': return 'bg-[#f0d5cd] text-[#8a3a24]';
      default: return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
    }
  };

  const handleExportPDF = async () => {
    setExportingOrder(true);
    try {
      const orderData = {
        orderId: order.orderId || order.id,
        dateFormatted: formatDate(order.createdAt),
        customer: order.customer || null,
        promoCode: order.promoCode,
        discountAmount: order.discountAmount,
        discountType: order.discountType,
        deliveryCharge: order.deliveryCharge || 0,
        manualDiscount: order.manualDiscount || 0
      };

      const doc = await generateInvoicePDF(orderData, order.items || [], getItemName);

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/:/g, '-').replace(/ /g, '_');
      const safeDate = formatDate(order.createdAt).replace(/[:,\s]+/g, '_');
      const fileName = `Rosary_Bill_${order.orderId || order.id}_${safeDate}_${timeStr}.pdf`;

      doc.save(fileName);
      success('PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showError('Failed to generate PDF invoice');
    } finally {
      setExportingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-terracotta)] border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="animate-fade-in mx-auto max-w-2xl">
        <SEO
          title="Your order"
          description="Track a Rosary Plant House order, its delivery details and its plants."
          noindex
        />
        <PageBar title="Order details" />
        <EmptyState
          icon="package"
          title="Order Not Found"
          description={error || 'This order does not exist.'}
        >
          <NavLink to="/" className="btn btn-primary">
            Back to Home
          </NavLink>
        </EmptyState>
      </div>
    );
  }

  if (order.status === 'cancelled' && !isAdmin) {
    return (
      <div className="animate-fade-in mx-auto max-w-2xl">
        <SEO
          title={order.orderId ? `Order ${order.orderId}` : 'Your order'}
          description="Track a Rosary Plant House order, its delivery details and its plants."
          noindex
        />
        <PageBar title="Order details" />
        <EmptyState
          icon="package"
          title="Order Not Found"
          description="This order is no longer available."
        >
          <NavLink to="/" className="btn btn-primary">
            Back to Home
          </NavLink>
        </EmptyState>
      </div>
    );
  }

  const normalisedStatus = order.status?.toLowerCase();
  const isPendingOrder = order.status?.toLowerCase() === 'pending';
  const progressStep = PROGRESS_STEPS[normalisedStatus] || 0;
  const showProgressRail = progressStep > 0;

  // Plain-language line under the rail. Only real order data and the published
  // dispatch policy — never an invented courier or date.
  const progressDay = formatDay(order.updatedAt);
  const etaMatch = SITE_POLICY.shipping.deliveryEtaFromDispatch.find((entry) =>
    [order.customer?.district, order.customer?.state]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(entry.area.toLowerCase())
  );
  let progressNote = '';
  if (normalisedStatus === 'confirmed') {
    progressNote = `Confirmed. We dispatch on the nearest ${SITE_POLICY.shipping.dispatchDays}.`;
  } else if (normalisedStatus === 'shipped') {
    progressNote = progressDay ? `Dispatched ${progressDay}.` : 'On its way to you.';
    progressNote += etaMatch ? ` Expected ${etaMatch.eta} in ${etaMatch.area}.` : ` ${SITE_POLICY.shipping.courier}`;
  } else if (normalisedStatus === 'delivered') {
    progressNote = progressDay ? `Delivered ${progressDay}.` : 'Delivered.';
    progressNote += ' Damaged in transit? Tell us on the delivery day or the next and we replace it.';
  }

  // The RPH order code is the one we look an order up by, so it is the code the
  // customer quotes. The checkout tracker's code only stands in if it is missing.
  const supportCode = order.orderId || order.supportCode || '';
  const supportHref = buildWhatsAppLink(
    buildOrderSupportMessage({ supportCode, orderId: order.orderId || order.id })
  );

  const statusPill = (
    <span className={`badge shrink-0 capitalize ${getStatusColor(order.status)}`}>
      {order.status}
    </span>
  );

  const locationLine = [order.customer.district, order.customer.state, order.customer.pincode]
    .filter(Boolean)
    .join(', ');
  const detailRows = [
    { label: 'Name', value: order.customer.name || 'N/A' },
    { label: 'Phone', value: order.customer.phone || 'N/A' },
    ...(order.customer.whatsapp && order.customer.whatsapp !== order.customer.phone
      ? [{ label: 'WhatsApp', value: order.customer.whatsapp }]
      : []),
    { label: 'Address', value: order.customer.address || 'N/A' },
    ...(locationLine ? [{ label: 'Location', value: locationLine }] : []),
  ];

  return (
    <div className="animate-fade-in relative mx-auto max-w-2xl">
      <SEO
        title={order.orderId ? `Order ${order.orderId}` : 'Your order'}
        description="Track a Rosary Plant House order, its delivery details and its plants."
        noindex
      />

      {/* Thank You & Promo Popup */}
      {showThanksPopup && createPortal(
        <div className="animate-fade-in fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="animate-slide-up safe-bottom relative w-full max-w-md rounded-t-[28px] bg-[var(--bg-secondary)] px-5 pb-7 pt-7 text-center"
            role="dialog"
          >
            <button
              type="button"
              onClick={handleCloseThanksPopup}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-sunken)]"
            >
              <Icon name="x" className="h-[18px] w-[18px]" />
            </button>

            <img src={logo} alt="Rosary Plant House" className="mx-auto mb-4 h-16 w-16 object-contain" />
            <h2 className="font-display text-[27px] leading-tight text-[var(--text-primary)]">
              Thank you{order?.customer?.name ? `, ${order.customer.name}` : ''}
            </h2>
            <p className="mx-auto mt-2 max-w-[320px] text-[14px] leading-relaxed text-[var(--text-secondary)]">
              We are so glad you chose Rosary Plant House.
            </p>

            <div className="mt-5 rounded-[24px] bg-[var(--color-accent-200)] px-5 py-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-700)]">
                Claim a free plant
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-accent-900)]">
                Post an Instagram story with the plants you bought from us and tag{' '}
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline underline-offset-2 hover:opacity-80"
                >
                  {INSTAGRAM_HANDLE}
                </a>{' '}
                to get a complimentary plant with your next order.
              </p>
            </div>

            <div className="mt-5 flex justify-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  title={social.name}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--bg-sunken)]"
                >
                  <Icon name={social.icon} filled className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCloseThanksPopup}
              className="btn btn-primary mt-6 w-full"
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}

      <PageBar title="Order details" trailing={statusPill} />

      {/* Header */}
      <div className="card mb-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[15px] font-bold uppercase tracking-[0.09em] text-[var(--text-primary)]">
              {order.orderId}
            </p>
            <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          {statusPill}
        </div>

        {showProgressRail && (
          <div className="mt-5">
            <div className="flex items-center gap-1.5" role="presentation">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1 flex-1 rounded-full ${step <= progressStep ? 'bg-[#7a8a5e]' : 'bg-[var(--bg-tertiary)]'}`}
                />
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {progressNote}
            </p>
          </div>
        )}
      </div>

      {isPendingOrder && (
        <div className="card mb-3 p-1">
          <div className="rounded-[24px] bg-[var(--color-accent-700)] px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-200)]">
              Not sent yet
            </p>
            <h2 className="mt-1.5 font-display text-[19px] leading-tight text-[#fff2eb]">
              Send this order request
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--color-accent-200)]">
              This order is not placed yet. Please tap Send there to confirm in WhatsApp. No payment has been collected on this site.
            </p>
            <button
              type="button"
              onClick={handleSendPendingOrderOnWhatsApp}
              disabled={sendingOrderRequest}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#fff2eb] px-5 font-display text-[15px] text-[var(--color-accent-700)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {sendingOrderRequest ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent-700)]/30 border-t-[var(--color-accent-700)]" />
              ) : (
                <Icon name="whatsapp" filled className="h-[17px] w-[17px]" />
              )}
              <span>Send order on WhatsApp</span>
            </button>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--color-accent-200)]">
              Reopens the chat with the same list. It will not create a second order.
            </p>
          </div>
        </div>
      )}

      {/* Admin: Update Status */}
      {isAdmin && (
        <div className="card mb-3 p-5">
          <h2 className="mb-3 font-display text-[17px] text-[var(--text-primary)]">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={updatingStatus || order.status === status}
                className={`
                  rounded-full px-4 py-2 text-[13px] font-semibold capitalize transition-all
                  ${order.status === status
                    ? getStatusColor(status) + ' ring-2 ring-[var(--color-terracotta)] ring-offset-2 ring-offset-[var(--bg-secondary)]'
                    : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--color-terracotta)] hover:text-[var(--text-primary)]'
                  }
                  ${updatingStatus ? 'cursor-wait opacity-50' : ''}
                `}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer Details */}
      <div className="card mb-3 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] text-[var(--text-primary)]">Delivery details</h2>
          {canEditCustomer && !isEditingCustomer && (
            <button
              onClick={() => setIsEditingCustomer(true)}
              className="shrink-0 text-[13px] font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingCustomer ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">Name</label>
              <input
                type="text"
                value={editCustomer.name || ''}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">Phone</label>
                <input
                  type="tel"
                  value={editCustomer.phone || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">WhatsApp</label>
                <input
                  type="tel"
                  value={editCustomer.whatsapp || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="input"
                  placeholder="WhatsApp number"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">Address</label>
              <textarea
                value={editCustomer.address || ''}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, address: e.target.value }))}
                className="input min-h-[70px] resize-none"
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">Pincode</label>
                <input
                  type="text"
                  value={editCustomer.pincode || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, pincode: e.target.value }))}
                  className="input"
                  placeholder="Pincode"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">District</label>
                <input
                  type="text"
                  value={editCustomer.district || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, district: e.target.value }))}
                  className="input"
                  placeholder="District"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">State</label>
                <input
                  type="text"
                  value={editCustomer.state || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, state: e.target.value }))}
                  className="input"
                  placeholder="State"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
                className="btn btn-primary flex-1"
              >
                {savingCustomer ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] bg-[var(--bg-primary)] px-4 py-3.5">
            {detailRows.map((row, index) => (
              <div
                key={row.label}
                className={`flex items-start justify-between gap-4 py-2 ${index === 0 ? '' : 'border-t border-[var(--border-color)]'}`}
              >
                <span className="shrink-0 text-[13px] text-[var(--text-secondary)]">{row.label}</span>
                <span className="min-w-0 text-right text-[13px] font-semibold text-[var(--text-primary)]">{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card mb-3 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] text-[var(--text-primary)]">Items ({order.totalItems})</h2>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditingItems(!editingItems)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${editingItems ? 'bg-[#f0d5cd] text-[#8a3a24]' : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {editingItems ? 'Cancel' : 'Edit Items'}
              </button>
            )}
            {isAdmin && !editingItems && (
              <button
                onClick={handleToggleNames}
                className={`
                  rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all
                  ${showTitle
                    ? 'bg-[var(--color-terracotta)] text-[#f5ead8] dark:text-[#201e1d]'
                    : 'border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                {showTitle ? 'Title' : 'Common Name'}
              </button>
            )}
          </div>
        </div>
        {editingItems && isAdmin ? (
          <OrderItemEditor items={order.items} onSave={handleSaveItems} saving={savingItems} />
        ) : (
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex gap-3 border-b border-[var(--border-color)] pb-3 last:border-0 last:pb-0">
              {item.imageUrl && (
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-tertiary)]">
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt={item.name}
                    className="washed h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-[15px] text-[var(--text-primary)]">
                  {index + 1}. {getItemName(item)}
                  {getItemPlantId(item) && (
                    <span className="ml-1 text-[11px] font-normal text-[var(--text-secondary)]">
                      (ID: {getItemPlantId(item)})
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
                {!isAdmin && ['confirmed', 'shipped', 'delivered', 'completed'].includes(order.status?.toLowerCase()) && productNames[item.productId] && (
                  <div className="mt-3 rounded-[24px] bg-[var(--bg-primary)] p-4">
                    <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--text-secondary)]">Care Instructions</h4>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--bg-secondary)] p-3">
                        <Icon name="droplet" className="h-[18px] w-[18px] text-[var(--color-sage-800)]" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">Water</p>
                        <p className="text-center text-[12px] font-bold text-[var(--text-primary)]">{productNames[item.productId].watering || 'Moderate'}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--bg-secondary)] p-3">
                        <Icon name="sun" className="h-[18px] w-[18px] text-[var(--color-accent-700)]" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">Sunlight</p>
                        <p className="text-center text-[12px] font-bold text-[var(--text-primary)]">{productNames[item.productId].sunlight || 'Moderate'}</p>
                      </div>
                    </div>
                    {productNames[item.productId].description && (
                      <details open className="group border-t border-[var(--border-color)] pt-2 text-[13px] text-[var(--text-secondary)]">
                        <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 rounded-2xl px-1 py-2 font-display text-[15px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                          Plant description
                          <Icon name="chevron-down" className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                          {(() => {
                            const raw = productNames[item.productId].description.replace(/Â/g, '');
                            const sections = raw.split(/^## /m);
                            const mdComponents = {
                              p: ({children}) => <p style={{margin: '0.35rem 0'}}>{children}</p>,
                              ul: ({children}) => <ul style={{margin: '0.35rem 0', paddingLeft: '1.25rem', listStyleType: 'disc'}}>{children}</ul>,
                              ol: ({children}) => <ol style={{margin: '0.35rem 0', paddingLeft: '1.25rem', listStyleType: 'decimal'}}>{children}</ol>,
                              li: ({children}) => <li style={{margin: '0.15rem 0'}}>{children}</li>,
                              strong: ({children}) => <strong style={{color: 'var(--text-primary)', fontWeight: 600}}>{children}</strong>,
                              h1: ({children}) => <h3 style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem'}}>{children}</h3>,
                              h2: () => null,
                              h3: ({children}) => <h5 style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.4rem 0 0.2rem'}}>{children}</h5>,
                            };
                            return sections.map((section, i) => {
                              if (i === 0) {
                                // Content before the first ## heading
                                return section.trim() ? <ReactMarkdown key={i} components={mdComponents}>{section.trim()}</ReactMarkdown> : null;
                              }
                              const newlineIdx = section.indexOf('\n');
                              const heading = newlineIdx !== -1 ? section.slice(0, newlineIdx).trim() : section.trim();
                              const body = newlineIdx !== -1 ? section.slice(newlineIdx + 1).trim() : '';
                              return (
                                <details key={i} className="group/section border-b border-[var(--border-color)] last:border-0">
                                  <summary className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl px-1 py-2.5 text-[13px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                                    {heading}
                                    <Icon name="chevron-down" className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 group-open/section:rotate-180" />
                                  </summary>
                                  {body && (
                                    <div className="px-1 pb-2">
                                      <ReactMarkdown components={mdComponents}>{body}</ReactMarkdown>
                                    </div>
                                  )}
                                </details>
                              );
                            });
                          })()}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Totals */}
      <div className="card mb-3 p-5">
        <div className="space-y-2.5">
          {/* Subtotal — show original pre-discount amount when a promo was used */}
          <div className="flex justify-between text-[13px] text-[var(--text-secondary)]">
            <span>Subtotal</span>
            <span>{CURRENCY}{(order.originalAmount ?? order.totalAmount).toLocaleString('en-IN')}</span>
          </div>

          {/* Promo discount row */}
          {order.promoCode && order.discountAmount > 0 && (
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-1.5 text-[var(--color-sage-800)] dark:text-[var(--color-sage-300)]">
                <Icon name="gift" className="h-4 w-4 shrink-0" />
                <span className="truncate font-mono font-semibold">{order.promoCode}</span>
                <span className="shrink-0 text-[12px] text-[var(--text-secondary)]">
                  ({order.discountType === 'percentage'
                    ? `${order.discountValue}% off`
                    : `${CURRENCY}${order.discountValue} off`})
                </span>
              </span>
              <span className="shrink-0 font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-sage-300)]">
                −{CURRENCY}{order.discountAmount.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Manual Discount */}
          {(isAdmin || order.manualDiscount > 0) && (
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-[var(--text-secondary)]">Discount</span>
            {isAdmin && editingDiscount ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                  <input
                    type="number"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="input w-24 min-h-0 px-3 py-1.5 text-right text-[13px]"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleSaveDiscount}
                  disabled={savingDiscount}
                  className="text-[12px] font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
                >
                  {savingDiscount ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingDiscount(false); setDiscountInput(order.manualDiscount?.toString() || ''); }}
                  className="text-[12px] text-[var(--text-secondary)] hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <span className={order.manualDiscount ? 'font-semibold text-[var(--color-sage-800)] dark:text-[var(--color-sage-300)]' : 'italic text-[var(--text-muted)]'}>
                  {order.manualDiscount ? `−${CURRENCY}${order.manualDiscount.toLocaleString('en-IN')}` : 'Not set'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditingDiscount(true)}
                    className="text-[12px] font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
                  >
                    {order.manualDiscount ? 'Edit' : 'Add'}
                  </button>
                )}
              </span>
            )}
          </div>
          )}

          {/* Delivery Charge */}
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-[var(--text-secondary)]">Delivery</span>
            {isAdmin && editingDelivery ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                  <input
                    type="number"
                    value={deliveryInput}
                    onChange={(e) => setDeliveryInput(e.target.value)}
                    className="input w-24 min-h-0 px-3 py-1.5 text-right text-[13px]"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleSaveDelivery}
                  disabled={savingDelivery}
                  className="text-[12px] font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
                >
                  {savingDelivery ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingDelivery(false); setDeliveryInput(order.deliveryCharge?.toString() || ''); }}
                  className="text-[12px] text-[var(--text-secondary)] hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <span className={order.deliveryCharge ? 'font-semibold text-[var(--text-primary)]' : 'italic text-[var(--text-muted)]'}>
                  {order.deliveryCharge ? `${CURRENCY}${order.deliveryCharge.toLocaleString('en-IN')}` : 'Not set'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditingDelivery(true)}
                    className="text-[12px] font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
                  >
                    {order.deliveryCharge ? 'Edit' : 'Add'}
                  </button>
                )}
              </span>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 font-display text-[20px] text-[var(--text-primary)]">
            <span>Total</span>
            <span>{CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0) - (order.manualDiscount || 0)).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Support row */}
        <div className="mt-4 border-t border-[var(--border-color)] pt-4">
          {supportCode && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--text-secondary)]">Support code</span>
              <span className="font-mono text-[14px] font-bold tracking-[0.06em] text-[var(--text-primary)]">{supportCode}</span>
            </div>
          )}
          <p className="mb-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Something wrong with this order, or unsure about anything in it? Screenshot{' '}
            <span className="font-mono font-bold text-[var(--text-primary)]">{supportCode}</span>{' '}
            and send it to us on WhatsApp and we will sort it out. {NURSERY_HOURS}.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={supportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-sage-200)] px-5 font-display text-[14px] text-[var(--color-sage-900)] transition-opacity hover:opacity-90"
            >
              <Icon name="whatsapp" filled className="h-[16px] w-[16px]" />
              Ask about it
            </a>
            <a
              href={`tel:${NURSERY_PHONE_TEL}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] px-5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <Icon name="phone" className="h-4 w-4" />
              Call the nursery
              <span className="sr-only">on {NURSERY_PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Promotional Ad Section */}
      {!isAdmin && (
        <div className="card mb-3 p-5 text-center">
          <h2 className="font-display text-[21px] text-[var(--text-primary)]">Join our plant family</h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Follow us for daily plant care tips, new arrivals and offers.
          </p>
          <div className="mt-4 rounded-[24px] bg-[var(--color-accent-200)] px-5 py-4">
            <p className="text-[13px] leading-relaxed text-[var(--color-accent-900)]">
              Tag{' '}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2 hover:opacity-80"
              >
                {INSTAGRAM_HANDLE}
              </a>{' '}
              in an Instagram story with your new plants to get a complimentary plant with your next
              order.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                <Icon name={social.icon} filled className="h-4 w-4" />
                {social.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <NavLink to="/" className="btn btn-primary flex-1">
          Continue Shopping
        </NavLink>
        {isAdmin && (
          <button
            onClick={handleExportPDF}
            disabled={exportingOrder}
            className="btn btn-secondary flex-1"
          >
            {exportingOrder ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-[var(--text-primary)]" />
            ) : (
              <Icon name="document" className="h-4 w-4" />
            )}
            {exportingOrder ? 'Generating PDF...' : 'Download PDF Bill'}
          </button>
        )}
      </div>
    </div>
  );
}
