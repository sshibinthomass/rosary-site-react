import { CURRENCY } from '../config/constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product, onQuickView }) {
  const { user } = useAuth();
  const { addToCart, addToWishlist, isInCart, isInWishlist } = useCart();
  const { error } = useToast();

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!user) {
      error('Please sign in to add items to cart');
      return;
    }
    try {
      await addToCart(product);
    } catch (err) {
      error('Failed to add to cart');
    }
  };

  const handleAddToWishlist = async (e) => {
    e.stopPropagation();
    if (!user) {
      error('Please sign in to save items');
      return;
    }
    try {
      await addToWishlist(product);
    } catch (err) {
      error('Failed to add to wishlist');
    }
  };

  const inCart = isInCart(product.id);
  const inWishlist = isInWishlist(product.id);

  return (
    <div 
      className="card cursor-pointer group"
      onClick={() => onQuickView?.(product)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[var(--color-cream-dark)]">
        <img
          src={product.imageUrl || '/placeholder-plant.jpg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Stock Badge */}
        {!product.inStock && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
            Out of Stock
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-2 right-2 badge badge-forest">
          {product.category}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          className={`
            absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-md
            ${inWishlist 
              ? 'bg-[var(--color-terracotta)] text-white' 
              : 'bg-white/90 text-[var(--color-forest)] hover:bg-[var(--color-terracotta)] hover:text-white'
            }
          `}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-[var(--color-forest)] truncate">{product.name}</h3>
        <p className="text-sm text-[var(--color-forest)]/60 mt-0.5 line-clamp-2 h-10">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-semibold text-[var(--color-forest)]">
            {CURRENCY}{product.price?.toLocaleString('en-IN')}
          </span>
          
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock || inCart}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${inCart 
                ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)] cursor-default'
                : product.inStock
                  ? 'bg-[var(--color-forest)] text-white hover:shadow-md active:scale-95'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {inCart ? '✓ Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
