import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CURRENCY } from '../config/constants';

export default function ProductModal({ product, isOpen, onClose, onAddToCart, inCart }) {
  const modalRef = useRef(null);

  // Normalize product fields
  const title = product?.title || product?.name || product?.commonName;
  const commonName = product?.commonName || product?.name;
  const price = product?.salesPrice || product?.price;
  const originalPrice = product?.originalPrice;
  const inStock = product?.available !== false && (product?.qtyAvailable !== 'NA' || product?.inStock);
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

  // Use createPortal to render modal at document.body level
  // This fixes the issue where transform on parent breaks fixed positioning
  return createPortal(
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
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {/* ID Badge */}
          <div className="absolute top-3 right-14 px-2 py-1 bg-white/90 text-[var(--color-forest)] text-sm font-bold rounded-lg">
            #{product.id}
          </div>
          
          {hasDiscount && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-[var(--color-terracotta)] text-white text-sm font-bold rounded-lg">
              -{discountPercent}% OFF
            </div>
          )}
          
          {product.isRestocked && inStock && (
            <div className="absolute top-12 left-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-lg">
              Back in Stock!
            </div>
          )}
          
          {!inStock && (
            <div className="absolute bottom-3 right-3 badge bg-red-500 text-white">
              Out of Stock
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title & Common Name */}
          <p className="text-xs text-[var(--color-forest)]/50 font-medium">#{product.id}</p>
          <h2 className="text-xl font-semibold text-[var(--color-forest)]">{title}</h2>
          {commonName !== title && (
            <p className="text-sm text-[var(--color-forest)]/60 mt-0.5">{commonName}</p>
          )}
          
          {/* Price */}
          <div className="flex items-baseline gap-2 mt-3">
            <p className="text-2xl font-bold text-[var(--color-forest)]">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </p>
            {hasDiscount && (
              <p className="text-lg text-[var(--color-forest)]/40 line-through">
                {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Category & Size */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge badge-forest">{product.category}</span>
            {product.size && (
              <span className="badge bg-[var(--color-cream-dark)] text-[var(--color-forest)]">{product.size}</span>
            )}
            {product.demand === 'VeryHigh' && (
              <span className="badge bg-red-100 text-red-600">🔥 Very High Demand</span>
            )}
            {product.demand === 'High' && (
              <span className="badge bg-orange-100 text-orange-600">⭐ High Demand</span>
            )}
          </div>

          {/* Care Info Grid */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
              <span className="text-lg">💧</span>
              <p className="text-[10px] text-[var(--color-forest)]/50 mt-0.5">Watering</p>
              <p className="text-xs font-medium text-[var(--color-forest)]">{product.watering || 'N/A'}</p>
            </div>
            <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
              <span className="text-lg">☀️</span>
              <p className="text-[10px] text-[var(--color-forest)]/50 mt-0.5">Sunlight</p>
              <p className="text-xs font-medium text-[var(--color-forest)]">{product.sunlight || 'N/A'}</p>
            </div>
            <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
              <span className="text-lg">📦</span>
              <p className="text-[10px] text-[var(--color-forest)]/50 mt-0.5">Transit</p>
              <p className="text-xs font-medium text-[var(--color-forest)]">{product.transit || 'N/A'}</p>
            </div>
            <div className="text-center p-2 bg-[var(--color-cream-dark)] rounded-lg">
              <span className="text-lg">🏠</span>
              <p className="text-[10px] text-[var(--color-forest)]/50 mt-0.5">Place</p>
              <p className="text-xs font-medium text-[var(--color-forest)]">{product.placeAvailable || 'N/A'}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.indoor && (
              <span className="badge bg-green-50 text-green-600">🌿 Indoor</span>
            )}
            {product.hanging && (
              <span className="badge bg-purple-50 text-purple-600">🪴 Hanging</span>
            )}
            {product.mother && (
              <span className="badge bg-pink-50 text-pink-600">👶 Mother Plant</span>
            )}
            {product.combo && (
              <span className="badge bg-blue-50 text-blue-600">📦 Combo</span>
            )}
          </div>

          {/* Stock Info */}
          <div className="mt-4 p-3 bg-[var(--color-cream-dark)] rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-forest)]/60">Availability:</span>
              <span className={`font-medium ${
                product.qtyAvailable === 'Available' ? 'text-green-600' :
                product.qtyAvailable === 'Low' ? 'text-orange-500' :
                'text-red-500'
              }`}>
                {product.qtyAvailable === 'Available' ? '✅ In Stock' :
                 product.qtyAvailable === 'Low' ? '⚠️ Low Stock' :
                 '❌ Not Available'}
              </span>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={() => onAddToCart({ ...product, id: product.id, name: title, price })}
            disabled={!inStock || inCart}
            className={`
              w-full mt-4 py-3.5 rounded-xl font-medium transition-all
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
    </div>,
    document.body
  );
}
