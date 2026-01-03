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
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors backdrop-blur-sm"
        >
          ✕
        </button>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          {/* Image */}
          <div className="relative h-[35vh] sm:h-64 sm:aspect-square bg-[var(--bg-tertiary)] shrink-0 group">
            <img
              src={product.imageUrl || '/placeholder-plant.jpg'}
              alt={title}
              className="w-full h-full object-cover"
            />
            
            {/* ID Badge */}
            <div className="absolute top-3 right-14 px-2 py-1.5 bg-white/90 text-[var(--text-primary)] text-xs font-bold rounded-lg shadow-sm backdrop-blur-sm">
              #{product.id}
            </div>
            
            {hasDiscount && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-[var(--color-terracotta)] text-white text-xs font-bold rounded-lg shadow-sm">
                -{discountPercent}% OFF
              </div>
            )}
            
            {product.isRestocked && inStock && (
              <div className="absolute top-12 left-3 px-2 py-1 bg-green-500 text-white text-[10px] font-medium rounded-lg shadow-sm">
                Restocked
              </div>
            )}
            
            {!inStock && (
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm">
                Out of Stock
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{title}</h2>
              {commonName !== title && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{commonName}</p>
              )}
            </div>

            {/* Category & Size */}
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-forest text-xs py-1">{product.category}</span>
              {product.size && (
                <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs py-1">{product.size}</span>
              )}
              {product.demand && (
                <span className="badge bg-orange-50 text-orange-700 text-xs py-1 flex items-center gap-1 border border-orange-100">
                  🔥 {product.demand} Demand
                </span>
              )}
            </div>

            {/* Care Info Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)]">
                <span className="text-lg mb-1">💧</span>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Water</p>
                <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{product.watering || 'Med'}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)]">
                <span className="text-lg mb-1">☀️</span>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Sun</p>
                <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{product.sunlight || 'Med'}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)]">
                <span className="text-lg mb-1">📦</span>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Ship</p>
                <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{product.transit || 'Safe'}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)]">
                <span className="text-lg mb-1">🏠</span>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Place</p>
                <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{product.placeAvailable || 'Any'}</p>
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 text-xs">
               {product.indoor && <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100">🏠 Indoor</span>}
               {product.hanging && <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100">🎋 Hanging</span>}
               {product.mother && <span className="px-2 py-1 bg-pink-50 text-pink-700 rounded-md border border-pink-100">🌱 Mother Plant</span>}
               {product.combo && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">🎁 Combo</span>}
            </div>
          </div>
        </div>

        {/* Footer (Price & Action) - Fixed at Bottom */}
        <div className="p-4 border-t border-[var(--border-color)] bg-white z-20 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--text-primary)]">
                  {CURRENCY}{price?.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-[var(--text-secondary)] line-through">
                    {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">Total Price</span>
            </div>
            
            <button
              onClick={() => {
                if (inStock) {
                  onAddToCart({ ...product, id: product.id, name: title, price });
                  onClose();
                }
              }}
              disabled={!inStock}
              className={`
                flex-1 max-w-[200px] h-12 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2
                ${inStock 
                  ? 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)]' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }
              `}
            >
               {inStock ? (
                 <>
                   <span>Add to Cart</span>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                   </svg>
                 </>
               ) : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
