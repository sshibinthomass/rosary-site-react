import { useEffect, useRef } from 'react';
import { CURRENCY } from '../config/constants';

export default function ProductModal({ product, isOpen, onClose, onAddToCart, inCart }) {
  const modalRef = useRef(null);

  // Normalize product fields (handle both old and new schema)
  const name = product?.commonName || product?.name;
  const price = product?.salesPrice || product?.price;
  const originalPrice = product?.originalPrice;
  const description = product?.title || product?.description;
  const inStock = product?.available !== false && (product?.qtyAvailable > 0 || product?.inStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;

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
            alt={name}
            className="w-full h-full object-cover"
          />
          
          {/* Badges */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="badge badge-forest">{product.category}</span>
            {product.size && (
              <span className="badge bg-white/90 text-[var(--color-forest)]">{product.size}</span>
            )}
          </div>
          
          {!inStock && (
            <div className="absolute bottom-3 right-3 badge bg-red-500 text-white">
              Out of Stock
            </div>
          )}
          
          {hasDiscount && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-[var(--color-terracotta)] text-white text-sm font-bold rounded-lg">
              -{discountPercent}% OFF
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="text-xl font-semibold text-[var(--color-forest)]">{name}</h2>
          
          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-[var(--color-forest)]">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </p>
            {hasDiscount && (
              <p className="text-lg text-[var(--color-forest)]/40 line-through">
                {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-[var(--color-forest)]/70 mt-3 leading-relaxed">
              {description}
            </p>
          )}

          {/* Care Info */}
          {(product.watering || product.sunlight || product.transit) && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {product.watering && (
                <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
                  <span className="text-lg">💧</span>
                  <p className="text-xs text-[var(--color-forest)]/70 mt-1">{product.watering}</p>
                </div>
              )}
              {product.sunlight && (
                <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
                  <span className="text-lg">☀️</span>
                  <p className="text-xs text-[var(--color-forest)]/70 mt-1">{product.sunlight}</p>
                </div>
              )}
              {product.placeAvailable && (
                <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
                  <span className="text-lg">🏡</span>
                  <p className="text-xs text-[var(--color-forest)]/70 mt-1">{product.placeAvailable}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.indoor && (
              <span className="badge bg-green-50 text-green-600">🌿 Indoor Plant</span>
            )}
            {product.hanging && (
              <span className="badge bg-purple-50 text-purple-600">🪴 Hanging</span>
            )}
            {product.mother && (
              <span className="badge bg-pink-50 text-pink-600">👶 Mother Plant</span>
            )}
            {product.combo && (
              <span className="badge bg-blue-50 text-blue-600">📦 Combo Pack</span>
            )}
          </div>

          {/* Stock Info */}
          {product.qtyAvailable > 0 && product.qtyAvailable <= 5 && (
            <p className="text-sm text-[var(--color-terracotta)] mt-3">
              ⚡ Only {product.qtyAvailable} left in stock!
            </p>
          )}

          {/* Add to Cart */}
          <button
            onClick={() => onAddToCart({ ...product, id: product.id, name, price })}
            disabled={!inStock || inCart}
            className={`
              w-full mt-6 py-3.5 rounded-xl font-medium transition-all
              ${inCart 
                ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)]'
                : inStock
                  ? 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)] active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {inCart ? '✓ Added to Cart' : inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
