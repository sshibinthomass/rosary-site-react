import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { CURRENCY } from '../config/constants';
import { NavLink } from 'react-router-dom';

const WishlistItem = ({ item, onMoveToCart, onRemove, inCart }) => {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="card p-3 flex gap-3">
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
        <img
          src={item.imageUrl || '/placeholder-plant.jpg'}
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
        <p className="text-xs text-[var(--text-secondary)] badge badge-forest mt-1 inline-block">
          {item.category}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 items-end">
        {!inCart && (
          <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg h-7 w-20">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-2 text-[var(--text-primary)] hover:bg-[var(--color-cream)] rounded-l-lg transition-colors flex-1"
            >
              -
            </button>
            <span className="text-xs font-medium w-6 text-center text-[var(--text-primary)]">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="px-2 text-[var(--text-primary)] hover:bg-[var(--color-cream)] rounded-r-lg transition-colors flex-1"
            >
              +
            </button>
          </div>
        )}

        <button
          onClick={() => onMoveToCart(item, quantity)}
          disabled={inCart}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-24
            ${inCart 
              ? 'bg-[var(--color-forest)]/10 text-[var(--text-primary)]'
              : 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)]'
            }
          `}
        >
          {inCart ? 'In Cart' : 'Add to Cart'}
        </button>
        <button
          onClick={() => onRemove(item.productId)}
          className="text-red-500 hover:text-red-600 text-xs"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, clearWishlist, addToCart, isInCart } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">💚</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Your wishlist is empty</h2>
        <p className="text-[var(--text-secondary)] mt-2">Save plants you love for later!</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Browse Plants
        </NavLink>
      </div>
    );
  }

  const handleMoveToCart = async (item, quantity = 1) => {
    const product = {
      id: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    };
    await addToCart(product, quantity);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Your Wishlist ({wishlist.length})
        </h1>
        <button
          onClick={clearWishlist}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Clear All
        </button>
      </div>

      {/* Wishlist Items */}
      <div className="space-y-3">
        {wishlist.map((item) => (
          <WishlistItem 
            key={item.productId} 
            item={item} 
            onMoveToCart={handleMoveToCart}
            onRemove={removeFromWishlist}
            inCart={isInCart(item.productId)}
          />
        ))}
      </div>
    </div>
  );
}
