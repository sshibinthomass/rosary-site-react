import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrdersByUserId } from '../services/orderService';
import { NavLink } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { resolveImageUrl } from '../utils/imageCompressor';

export default function UserOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const userOrders = await getOrdersByUserId(user.uid);
      const filteredOrders = (userOrders || []).filter(
        order => order.status !== 'pending' && order.status !== 'cancelled'
      );
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-6">
        <NavLink 
          to="/account" 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          ←
        </NavLink>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Orders</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 w-1/3 bg-[var(--bg-tertiary)] rounded mb-2"></div>
              <div className="h-4 w-1/4 bg-[var(--bg-tertiary)] rounded"></div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center">
          <span className="text-5xl mb-4">📦</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No orders yet</h2>
          <p className="text-[var(--text-secondary)] mb-6">When you place an order, it will appear here.</p>
          <NavLink to="/" className="btn btn-primary">
            Start Shopping
          </NavLink>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const created = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            const dateStr = created.toLocaleDateString('en-IN', { 
              day: 'numeric', month: 'long', year: 'numeric' 
            });
            const total = (order.totalAmount || 0) + (order.deliveryCharge || 0);

            return (
              <NavLink 
                key={order.id} 
                to={`/order/${order.id}`}
                className="card p-4 block hover:border-[var(--color-forest)] transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-bold text-[var(--text-primary)] text-lg">
                        {order.orderId}
                      </span>
                      <span className={`badge ${statusColors[order.status] || 'bg-gray-100 text-gray-700'} capitalize text-xs shadow-sm`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Placed on {dateStr}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Total Amount</p>
                    <p className="font-bold text-[var(--text-primary)] text-xl">
                      {CURRENCY}{total.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 flex items-center justify-between group-hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex -space-x-3 overflow-hidden px-2">
                    {order.items?.slice(0, 4).map((item, idx) => (
                      <img 
                        key={idx}
                        src={resolveImageUrl(item.imageUrl)} 
                        alt="" 
                        className="w-10 h-10 rounded-full border-2 border-[var(--bg-secondary)] object-cover bg-white"
                        title={item.name}
                      />
                    ))}
                    {order.items?.length > 4 && (
                      <div className="w-10 h-10 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-primary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-forest)]">
                    <span>{order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}</span>
                    <span>›</span>
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
