import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { initiateWhatsAppCheckout } from '../services/whatsappCheckout';
import { CURRENCY } from '../config/constants';
import { NavLink } from 'react-router-dom';

export default function CartPage() {
  const { user } = useAuth();
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const [checkoutInfo, setCheckoutInfo] = useState({ name: '', address: '' });
  const [showCheckout, setShowCheckout] = useState(false);

  if (!user) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">🛒</span>
        <h2 className="text-xl font-semibold text-[var(--color-forest)] mt-4">Your Cart</h2>
        <p className="text-[var(--color-forest)]/60 mt-2">Sign in to view your cart</p>
        <NavLink to="/account" className="btn btn-primary mt-4">
          Sign In
        </NavLink>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">🛒</span>
        <h2 className="text-xl font-semibold text-[var(--color-forest)] mt-4">Your cart is empty</h2>
        <p className="text-[var(--color-forest)]/60 mt-2">Add some beautiful plants!</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Browse Plants
        </NavLink>
      </div>
    );
  }

  const handleCheckout = () => {
    const userInfo = {
      name: checkoutInfo.name || user.displayName || 'Customer',
      address: checkoutInfo.address
    };
    initiateWhatsAppCheckout(cart, cartTotal, userInfo);
    clearCart();
    setShowCheckout(false);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-semibold text-[var(--color-forest)] mb-4">
        Your Cart ({cart.length})
      </h1>

      {/* Cart Items */}
      <div className="space-y-3 mb-6">
        {cart.map((item) => (
          <div key={item.productId} className="card p-3 flex gap-3">
            {/* Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--color-cream-dark)] flex-shrink-0">
              <img
                src={item.imageUrl || '/placeholder-plant.jpg'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--color-forest)] truncate">{item.name}</h3>
              <p className="text-sm text-[var(--color-forest)]/60">{CURRENCY}{item.price?.toLocaleString('en-IN')}</p>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-[var(--color-cream-dark)] flex items-center justify-center font-medium text-[var(--color-forest)] hover:bg-[var(--color-cream)] transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-[var(--color-cream-dark)] flex items-center justify-center font-medium text-[var(--color-forest)] hover:bg-[var(--color-cream)] transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => removeFromCart(item.productId)}
              className="self-start text-red-500 hover:text-red-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[var(--color-forest)]/70">Total</span>
          <span className="text-2xl font-bold text-[var(--color-forest)]">
            {CURRENCY}{cartTotal.toLocaleString('en-IN')}
          </span>
        </div>

        {!showCheckout ? (
          <button
            onClick={() => setShowCheckout(true)}
            className="btn btn-accent w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order via WhatsApp
          </button>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <input
              type="text"
              placeholder="Your Name"
              value={checkoutInfo.name}
              onChange={(e) => setCheckoutInfo(prev => ({ ...prev, name: e.target.value }))}
              className="input"
            />
            <textarea
              placeholder="Delivery Address (optional)"
              value={checkoutInfo.address}
              onChange={(e) => setCheckoutInfo(prev => ({ ...prev, address: e.target.value }))}
              className="input min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCheckout(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                className="btn btn-accent flex-1"
              >
                Send Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
