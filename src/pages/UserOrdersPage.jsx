import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { getOrdersByUserId } from '../services/orderService';
import { CURRENCY } from '../config/constants';
import SEO from '../components/SEO';
import { EmptyState, PageBar } from '../components/storefront';
import OrderCard from '../components/OrderCard';

export default function UserOrdersPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { success, error } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorderBusy, setReorderBusy] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const userOrders = await getOrdersByUserId(user.uid);
      const filteredOrders = (userOrders || []).filter(
        order => order.status !== 'pending' && order.status !== 'cancelled'
      );
      setOrders(filteredOrders);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, loadOrders]);

  const handleOrderAgain = async (order) => {
    const items = order.items || [];
    if (items.length === 0) {
      error('This order has no plants left to re-add.');
      return;
    }
    setReorderBusy(true);
    let added = 0;
    for (const item of items) {
      try {
        await addToCart({
          id: item.productId,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl
        }, item.quantity || 1);
        added += 1;
      } catch {
        // Keep going — the summary reports what actually landed in the cart.
      }
    }
    setReorderBusy(false);
    if (added === 0) error('Could not add those plants to your cart.');
    else success(`${added} ${added === 1 ? 'plant' : 'plants'} back in your cart.`);
  };

  return (
    <div className="animate-fade-in">
      <SEO title="My Orders" description="Every order you have placed with Rosary Plant House, with its status and totals." noindex />

      <PageBar title="My orders" fallbackTo="/account" />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="animate-pulse rounded-[28px] bg-[var(--bg-secondary)] p-[18px]">
              <div className="h-3 w-1/3 rounded-full bg-[var(--bg-tertiary)]" />
              <div className="mt-2.5 h-3 w-1/4 rounded-full bg-[var(--bg-tertiary)]" />
              <div className="mt-3.5 flex gap-2">
                <span className="h-[54px] w-[54px] rounded-[14px] bg-[var(--bg-tertiary)]" />
                <span className="h-[54px] w-[54px] rounded-[14px] bg-[var(--bg-tertiary)]" />
                <span className="h-[54px] w-[54px] rounded-[14px] bg-[var(--bg-tertiary)]" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="package"
          title="No orders yet"
          description="When you place an order, it will appear here."
        >
          <Link
            to="/shop"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-terracotta)] px-6 font-display text-base text-[#f5ead8] dark:text-[#201e1d]"
          >
            Start shopping
          </Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            // Same maths as the cart and the order page, so one order reads the same everywhere.
            const total = (order.totalAmount || 0)
              + (order.deliveryCharge || 0)
              - (Number(order.manualDiscount) || 0);

            return (
              <div key={order.id}>
                <OrderCard order={order} onOrderAgain={handleOrderAgain} reorderBusy={reorderBusy} />
                <p className="mt-1.5 px-[18px] text-xs text-[var(--text-secondary)]">
                  Order total{' '}
                  <span className="font-display text-sm text-[var(--text-primary)]">
                    {CURRENCY}{total.toLocaleString('en-IN')}
                  </span>
                  {order.promoCode && order.discountAmount > 0 && (
                    <> &middot; saved {CURRENCY}{order.discountAmount.toLocaleString('en-IN')} with {order.promoCode}</>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
