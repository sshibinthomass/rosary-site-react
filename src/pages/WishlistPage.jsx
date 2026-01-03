import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../config/constants';
import { NavLink } from 'react-router-dom';

export default function WishlistPage() {
  const { user } = useAuth();
  const { wishlist, removeFromWishlist, addToCart, isInCart } = useCart();

  if (!user) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">💚</span>
        <h2 className="text-xl font-semibold text-[var(--color-forest)] mt-4">Your Wishlist</h2>
        <p className="text-[var(--color-forest)]/60 mt-2">Sign in to view your saved plants</p>
        <NavLink to="/account" className="btn btn-primary mt-4">
          Sign In
        </NavLink>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">💚</span>
        <h2 className="text-xl font-semibold text-[var(--color-forest)] mt-4">Your wishlist is empty</h2>
        <p className="text-[var(--color-forest)]/60 mt-2">Save plants you love for later!</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Browse Plants
        </NavLink>
      </div>
    );
  }

  const handleMoveToCart = async (item) => {
    const product = {
      id: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    };
    await addToCart(product);
    await removeFromWishlist(item.productId);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-semibold text-[var(--color-forest)] mb-4">
        Your Wishlist ({wishlist.length})
      </h1>

      {/* Wishlist Items */}
      <div className="space-y-3">
        {wishlist.map((item) => {
          const inCart = isInCart(item.productId);
          
          return (
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
                <p className="text-sm text-[var(--color-forest)]/60">
                  {CURRENCY}{item.price?.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-[var(--color-forest)]/40 badge badge-forest mt-1 inline-block">
                  {item.category}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleMoveToCart(item)}
                  disabled={inCart}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${inCart 
                      ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)]'
                      : 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)]'
                    }
                  `}
                >
                  {inCart ? 'In Cart' : 'Add to Cart'}
                </button>
                <button
                  onClick={() => removeFromWishlist(item.productId)}
                  className="text-red-500 hover:text-red-600 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
