import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import { CURRENCY } from '../config/constants';
import { useToast } from '../context/ToastContext';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const { error, success } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
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

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Orders</h1>
        <NavLink to="/admin" className="btn btn-secondary text-sm">
          ← Back to Dashboard
        </NavLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-forest)]">{orders.length}</p>
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
          {orders.map((order) => (
            <div key={order.id} className="card overflow-hidden">
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
                      {CURRENCY}{order.totalAmount?.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {order.totalItems} items
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
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Items</h4>
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
                            <p className="truncate text-[var(--text-primary)]">{item.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
