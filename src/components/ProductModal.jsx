import { useEffect, useRef } from 'react';
import { CURRENCY } from '../config/constants';

export default function ProductModal({ product, isOpen, onClose, onAddToCart, inCart }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors"
        >
          ✕
        </button>

        {/* Image */}
        <div className="relative aspect-square bg-[var(--color-cream-dark)]">
          <img
            src={product.imageUrl || '/placeholder-plant.jpg'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          
          {/* Category Badge */}
          <div className="absolute bottom-3 left-3 badge badge-forest">
            {product.category}
          </div>
          
          {!product.inStock && (
            <div className="absolute bottom-3 right-3 badge bg-red-500 text-white">
              Out of Stock
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="text-xl font-semibold text-[var(--color-forest)]">{product.name}</h2>
          
          <p className="text-2xl font-bold text-[var(--color-forest)] mt-2">
            {CURRENCY}{product.price?.toLocaleString('en-IN')}
          </p>
          
          <p className="text-[var(--color-forest)]/70 mt-4 leading-relaxed">
            {product.description}
          </p>

          {/* Add to Cart */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={!product.inStock || inCart}
            className={`
              w-full mt-6 py-3.5 rounded-xl font-medium transition-all
              ${inCart 
                ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)]'
                : product.inStock
                  ? 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)] active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {inCart ? '✓ Added to Cart' : product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
