import { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { getOrderById, updateOrderStatus, updateOrderCustomer, updateDeliveryCharge, updateOrderItems } from '../services/orderService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { resolveImageUrl } from '../utils/imageCompressor';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CURRENCY } from '../config/constants';
import OrderItemEditor from '../components/OrderItemEditor';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function OrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
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

  // Name toggle state (admin only)
  const [showTitle, setShowTitle] = useState(false);
  const [productNames, setProductNames] = useState({}); // { productId: { title, commonName } }
  const [loadingNames, setLoadingNames] = useState(false);

  // Item editing state
  const [editingItems, setEditingItems] = useState(false);
  const [savingItems, setSavingItems] = useState(false);

  // PDF Exporting state
  const [exportingOrder, setExportingOrder] = useState(false);

  const handleSwitchAccount = async () => {
    try {
      if (user) {
        await logout();
      }
    } catch (e) {
      console.error('Error during logout before switching account:', e);
    }
    navigate(`/account?redirect=/order/${orderId}`, { replace: true });
  };

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await getOrderById(orderId);
      if (orderData) {
        setOrder(orderData);
        setEditCustomer(orderData.customer || {});
        setDeliveryInput(orderData.deliveryCharge?.toString() || '');

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
          names[item.productId] = { title, commonName, plantId };
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      showError('Failed to update delivery charge');
    } finally {
      setSavingDelivery(false);
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
    } catch (err) {
      showError('Failed to update items');
    } finally {
      setSavingItems(false);
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
        deliveryCharge: order.deliveryCharge || 0
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
      <div className="animate-fade-in text-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--color-forest)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[var(--text-secondary)] mt-4">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">📋</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Order Not Found</h2>
        <p className="text-[var(--text-secondary)] mt-2">{error || 'This order does not exist.'}</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Back to Home
        </NavLink>
      </div>
    );
  }

  if (order.status === 'cancelled' && !isAdmin) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">📋</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Order Not Found</h2>
        <p className="text-[var(--text-secondary)] mt-2">This order is no longer available.</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Back to Home
        </NavLink>
      </div>
    );
  }

  const hasOwnerUserId = !!order.customer?.userId;
  const isOwner = hasOwnerUserId && user && user.uid === order.customer.userId;
  const isLoggedIn = !!user;

  if (hasOwnerUserId && !isAdmin && !isOwner) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">📋</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Order Not Found</h2>
        <p className="text-[var(--text-secondary)] mt-2">
          {isLoggedIn
            ? 'This order belongs to a different account. Please switch to the account used to place this order.'
            : 'Please log in with the account used to place this order to view it.'}
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="btn btn-primary min-w-[180px]"
          >
            Login to your account
          </button>
          <NavLink to="/" className="btn btn-secondary min-w-[180px]">
            Back to Home
          </NavLink>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Order Details</h1>
          <span className={`badge ${getStatusColor(order.status)} capitalize`}>
            {order.status}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Order ID: <span className="font-mono font-medium text-[var(--text-primary)]">{order.orderId}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Placed on: {formatDate(order.createdAt)}
        </p>
      </div>

      {/* Admin: Update Status */}
      {isAdmin && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={updatingStatus || order.status === status}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${order.status === status
                    ? getStatusColor(status) + ' ring-2 ring-offset-2 ring-[var(--color-forest)] dark:ring-offset-[var(--bg-primary)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }
                  ${updatingStatus ? 'opacity-50 cursor-wait' : ''}
                `}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--text-primary)]">Items ({order.totalItems})</h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditingItems(!editingItems)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${editingItems ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {editingItems ? '✕ Cancel' : '✏️ Edit Items'}
              </button>
            )}
            {isAdmin && !editingItems && (
              <button
                onClick={handleToggleNames}
                className={`
                  text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                  ${showTitle
                    ? 'bg-[var(--color-forest)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                {showTitle ? '📖 Title' : '🏷️ Common Name'}
              </button>
            )}
          </div>
        </div>
        {editingItems && isAdmin ? (
          <OrderItemEditor items={order.items} onSave={handleSaveItems} saving={savingItems} />
        ) : (
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex gap-3 pb-3 border-b border-[var(--border-color)] last:border-0 last:pb-0">
              {item.imageUrl && (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--text-primary)] truncate">
                  {index + 1}. {getItemName(item)}
                  {getItemPlantId(item) && (
                    <span className="text-[var(--text-secondary)] text-xs ml-1">
                      (ID: {getItemPlantId(item)})
                    </span>
                  )}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-2">
          {/* Subtotal — show original pre-discount amount when a promo was used */}
          <div className="flex justify-between text-sm text-[var(--text-secondary)]">
            <span>Subtotal</span>
            <span>{CURRENCY}{(order.originalAmount ?? order.totalAmount).toLocaleString('en-IN')}</span>
          </div>

          {/* Promo discount row */}
          {order.promoCode && order.discountAmount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <span>🏷️</span>
                <span className="font-mono font-semibold">{order.promoCode}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  ({order.discountType === 'percentage'
                    ? `${order.discountValue}% off`
                    : `${CURRENCY}${order.discountValue} off`})
                </span>
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                −{CURRENCY}{order.discountAmount.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Delivery Charge */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Delivery</span>
            {isAdmin && editingDelivery ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                  <input
                    type="number"
                    value={deliveryInput}
                    onChange={(e) => setDeliveryInput(e.target.value)}
                    className="input w-24 py-1 px-2 text-right text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleSaveDelivery}
                  disabled={savingDelivery}
                  className="text-[var(--color-forest)] text-xs font-medium hover:underline"
                >
                  {savingDelivery ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingDelivery(false); setDeliveryInput(order.deliveryCharge?.toString() || ''); }}
                  className="text-[var(--text-secondary)] text-xs hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <span className={order.deliveryCharge ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}>
                  {order.deliveryCharge ? `${CURRENCY}${order.deliveryCharge.toLocaleString('en-IN')}` : 'Not set'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditingDelivery(true)}
                    className="text-xs text-[var(--color-forest)] hover:underline"
                  >
                    {order.deliveryCharge ? 'Edit' : 'Add'}
                  </button>
                )}
              </span>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between text-lg font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
            <span>Total</span>
            <span>{CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--text-primary)]">Delivery Details</h2>
          {canEditCustomer && !isEditingCustomer && (
            <button
              onClick={() => setIsEditingCustomer(true)}
              className="text-sm text-[var(--color-forest)] hover:underline font-medium"
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {isEditingCustomer ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Name</label>
              <input
                type="text"
                value={editCustomer.name || ''}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={editCustomer.phone || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">WhatsApp</label>
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
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Address</label>
              <textarea
                value={editCustomer.address || ''}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, address: e.target.value }))}
                className="input min-h-[70px] resize-none"
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Pincode</label>
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
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">District</label>
                <input
                  type="text"
                  value={editCustomer.district || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, district: e.target.value }))}
                  className="input"
                  placeholder="District"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">State</label>
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
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {savingCustomer ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">Name:</span> {order.customer.name || 'N/A'}
            </p>
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">Phone:</span> {order.customer.phone || 'N/A'}
            </p>
            {order.customer.whatsapp && order.customer.whatsapp !== order.customer.phone && (
              <p className="text-[var(--text-primary)]">
                <span className="text-[var(--text-secondary)]">WhatsApp:</span> {order.customer.whatsapp}
              </p>
            )}
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">Address:</span> {order.customer.address || 'N/A'}
            </p>
            {(order.customer.district || order.customer.state || order.customer.pincode) && (
              <p className="text-[var(--text-primary)]">
                <span className="text-[var(--text-secondary)]">Location:</span>{' '}
                {[order.customer.district, order.customer.state, order.customer.pincode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <NavLink to="/" className="btn btn-secondary flex-1">
          Continue Shopping
        </NavLink>
        {isAdmin && (
          <button
            onClick={handleExportPDF}
            disabled={exportingOrder}
            className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {exportingOrder ? (
              <span className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
            ) : '📄'}
            {exportingOrder ? 'Generating PDF...' : 'Download PDF Bill'}
          </button>
        )}
      </div>
    </div>
  );
}
