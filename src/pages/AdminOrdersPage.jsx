import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllOrders, updateOrderStatus, deleteOrder, updateDeliveryCharge, updateOrderItems } from '../services/orderService';
import { getProductById } from '../services/productService';
import { CURRENCY } from '../config/constants';
import { useToast } from '../context/ToastContext';
import OrderItemEditor from '../components/OrderItemEditor';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const { error, success } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showTitle, setShowTitle] = useState(false);
  const [productNames, setProductNames] = useState({});
  const [editingDelivery, setEditingDelivery] = useState(null); // orderId being edited
  const [deliveryInput, setDeliveryInput] = useState('');
  const [editingItemsFor, setEditingItemsFor] = useState(null); // orderId being item-edited
  const [savingItems, setSavingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
      // Fetch product names for all items
      const allProductIds = new Set();
      data.forEach(o => o.items?.forEach(item => allProductIds.add(item.productId)));
      const names = {};
      await Promise.all(
        Array.from(allProductIds).map(async (pid) => {
          try {
            const product = await getProductById(pid);
            if (product) {
              names[pid] = {
                title: product.title || product.name,
                commonName: product.commonName || product.name
              };
            }
          } catch (e) { /* skip */ }
        })
      );
      setProductNames(names);
    } catch (err) {
      console.error('Error loading orders:', err);
      error('Failed to load orders');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const isOldPending = (order) => {
    if (order.status !== 'pending' || !order.createdAt) return false;
    const created = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 5;
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this cancelled order?')) return;
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      success('Order deleted');
    } catch (err) {
      error('Failed to delete order');
    }
  };

  const getItemName = (item) => {
    const names = productNames[item.productId];
    if (!names) return item.name;
    return showTitle ? names.title : names.commonName;
  };

  const handleSaveDelivery = async (orderId) => {
    try {
      const charge = parseFloat(deliveryInput) || 0;
      await updateDeliveryCharge(orderId, charge);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, deliveryCharge: charge } : o));
      setEditingDelivery(null);
      success('Delivery charge updated!');
    } catch (err) {
      error('Failed to update delivery charge');
    }
  };

  const handleSaveOrderItems = async (orderId, newItems) => {
    setSavingItems(true);
    try {
      const result = await updateOrderItems(orderId, newItems);
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, items: newItems, totalAmount: result.totalAmount, totalItems: result.totalItems } : o
      ));
      setEditingItemsFor(null);
      success('Order items updated!');
    } catch (err) {
      error('Failed to update items');
    } finally {
      setSavingItems(false);
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Orders</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTitle(prev => !prev)}
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
          <NavLink to="/admin" className="btn btn-secondary text-sm">
            ← Back
          </NavLink>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-forest)]">{orders.filter(o => o.status !== 'cancelled').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total Orders</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {orders.filter(o => o.status === 'pending').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Pending</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {orders.filter(o => o.status === 'confirmed').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Confirmed</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Delivered</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all', ...ORDER_STATUSES].map((status) => {
          const count = status === 'all'
            ? orders.filter(o => o.status !== 'cancelled').length
            : orders.filter(o => o.status === status).length;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap flex items-center gap-1.5
                ${isActive
                  ? 'bg-[var(--color-forest)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {status === 'all' ? 'All' : status}
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search by Order ID, name, phone, address..."
          className="input text-sm w-full"
        />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl">📋</span>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-4">No orders yet</h2>
          <p className="text-[var(--text-secondary)] mt-2">Orders will appear here when customers checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders
            .filter(o => {
              if (filterStatus === 'all') return o.status !== 'cancelled';
              return o.status === filterStatus;
            })
            .filter(o => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                (o.orderId || '').toLowerCase().includes(q) ||
                (o.customer?.name || '').toLowerCase().includes(q) ||
                (o.customer?.phone || '').toLowerCase().includes(q) ||
                (o.customer?.whatsapp || '').toLowerCase().includes(q) ||
                (o.customer?.address || '').toLowerCase().includes(q) ||
                (o.customer?.district || '').toLowerCase().includes(q) ||
                (o.customer?.state || '').toLowerCase().includes(q) ||
                (o.customer?.pincode || '').toLowerCase().includes(q)
              );
            })
            .map((order) => (
            <div key={order.id} className={`card overflow-hidden ${isOldPending(order) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}>
              {/* Order Header - Clickable */}
              <button
                onClick={() => toggleExpand(order.id)}
                className="w-full p-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--color-forest)]">
                      {order.orderId}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="text-sm text-[var(--text-primary)] mt-1">
                      {order.customer?.name || 'Guest'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusColor(order.status)} capitalize text-xs`}>
                      {order.status}
                    </span>
                    <p className="font-semibold text-[var(--text-primary)] mt-2">
                      {CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {order.totalItems} items{order.deliveryCharge ? ` · +${CURRENCY}${order.deliveryCharge} delivery` : ''}
                    </p>
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)] animate-fade-in">
                  {/* Customer Details */}
                  <div className="mb-4">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Customer Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-[var(--text-secondary)]">Phone:</span> {order.customer?.phone || 'N/A'}</p>
                      <p><span className="text-[var(--text-secondary)]">WhatsApp:</span> {order.customer?.whatsapp || 'N/A'}</p>
                      <p className="col-span-2">
                        <span className="text-[var(--text-secondary)]">Address:</span> {order.customer?.address || 'N/A'}
                      </p>
                      <p className="col-span-2">
                        <span className="text-[var(--text-secondary)]">Location:</span>{' '}
                        {[order.customer?.district, order.customer?.state, order.customer?.pincode].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                      {order.customer?.userId && (
                        <p className="col-span-2 text-xs">
                          <span className="text-[var(--text-secondary)]">User ID:</span>{' '}
                          <span className="font-mono">{order.customer.userId}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[var(--text-primary)]">Items</h4>
                      <button
                        onClick={() => setEditingItemsFor(editingItemsFor === order.id ? null : order.id)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${editingItemsFor === order.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                      >
                        {editingItemsFor === order.id ? '✕ Cancel' : '✏️ Edit'}
                      </button>
                    </div>
                    {editingItemsFor === order.id ? (
                      <OrderItemEditor items={order.items} onSave={(items) => handleSaveOrderItems(order.id, items)} saving={savingItems} />
                    ) : (
                    <div className="space-y-2">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[var(--text-primary)]">{getItemName(item)}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>

                  {/* Delivery & Total */}
                  <div className="mb-4 pt-3 border-t border-[var(--border-color)] space-y-2 text-sm">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Subtotal</span>
                      <span>{CURRENCY}{order.totalAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Delivery</span>
                      {editingDelivery === order.id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                            <input
                              type="number"
                              value={deliveryInput}
                              onChange={(e) => setDeliveryInput(e.target.value)}
                              className="input w-20 py-1 px-2 text-right text-sm"
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <button onClick={() => handleSaveDelivery(order.id)} className="text-[var(--color-forest)] text-xs font-medium hover:underline">Save</button>
                          <button onClick={() => setEditingDelivery(null)} className="text-[var(--text-secondary)] text-xs hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className={order.deliveryCharge ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}>
                            {order.deliveryCharge ? `${CURRENCY}${order.deliveryCharge.toLocaleString('en-IN')}` : 'Not set'}
                          </span>
                          <button
                            onClick={() => { setEditingDelivery(order.id); setDeliveryInput(order.deliveryCharge?.toString() || ''); }}
                            className="text-xs text-[var(--color-forest)] hover:underline"
                          >
                            {order.deliveryCharge ? 'Edit' : 'Add'}
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                      <span>Total</span>
                      <span>{CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Update Status */}
                  <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Update Status</h4>
                    <div className="flex gap-2 flex-wrap">
                      {ORDER_STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={async () => {
                            try {
                              await updateOrderStatus(order.id, status);
                              setOrders(prev => prev.map(o => 
                                o.id === order.id ? { ...o, status } : o
                              ));
                              success(`Order status updated to ${status}`);
                            } catch (err) {
                              error('Failed to update status');
                            }
                          }}
                          disabled={order.status === status}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                            ${order.status === status
                              ? 'bg-[var(--color-forest)] text-white cursor-default'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]'
                            }
                          `}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delete Cancelled Order */}
                  {order.status === 'cancelled' && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="btn bg-red-500 text-white hover:bg-red-600 text-sm w-full"
                      >
                        🗑️ Delete This Order
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
