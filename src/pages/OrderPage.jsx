import { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { getOrderById } from '../services/orderService';
import { CURRENCY } from '../config/constants';

export default function OrderPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      {/* Items */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">Items ({order.totalItems})</h2>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex gap-3 pb-3 border-b border-[var(--border-color)] last:border-0 last:pb-0">
              {item.imageUrl && (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--text-primary)] truncate">
                  {index + 1}. {item.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="flex justify-between text-lg font-semibold text-[var(--text-primary)]">
            <span>Total</span>
            <span>{CURRENCY}{order.totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">+ Delivery charges (as applicable)</p>
        </div>
      </div>

      {/* Customer Details */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">Delivery Details</h2>
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
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <NavLink to="/" className="btn btn-secondary flex-1">
          Continue Shopping
        </NavLink>
      </div>
    </div>
  );
}
