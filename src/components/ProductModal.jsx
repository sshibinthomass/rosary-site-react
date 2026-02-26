import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { CURRENCY } from '../config/constants';

function DescriptionBlock({ text }) {
  const [expanded, setExpanded] = useState(false);
  const words = text.split(/\s+/);
  const needsTruncation = words.length > 20;
  const preview = needsTruncation ? words.slice(0, 20).join(' ') + '...' : text;

  return (
    <div className="border-t border-[var(--border-color)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">About this plant</h3>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed prose prose-sm max-w-none prose-headings:text-[var(--text-primary)] prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1 prose-p:my-1 prose-li:my-0 prose-strong:text-[var(--text-primary)]">
        {expanded || !needsTruncation ? (
          <ReactMarkdown>{text}</ReactMarkdown>
        ) : (
          <p>{preview}</p>
        )}
      </div>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-medium text-[var(--color-forest)] hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

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
      className="fixed inset-0 z-[9999] flex md:items-center md:justify-center md:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in hidden md:block" />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className="relative w-full h-full md:h-auto max-w-none md:max-w-5xl bg-[var(--bg-primary)] rounded-none md:rounded-2xl md:max-h-[85vh] flex flex-col lg:flex-row overflow-hidden animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (Absolute to Container) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 md:w-8 md:h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/40 transition-colors backdrop-blur-sm md:bg-white/10 md:text-white md:hover:bg-white/20"
        >
          ✕
        </button>

        {/* LEFT: Image Section */}
        <div className="relative w-full h-[40vh] lg:w-5/12 lg:h-auto bg-[var(--bg-tertiary)] shrink-0 group">
          <img
            src={product.imageUrl || '/placeholder-plant.jpg'}
            alt={title}
            className="w-full h-full object-cover"
          />
          
          {/* ID Badge */}
          <div className="absolute top-3 left-3 md:top-4 md:left-4 px-2 py-1.5 bg-white/90 text-[var(--text-primary)] text-xs font-bold rounded-lg shadow-sm backdrop-blur-sm z-10">
            #{product.id}
          </div>
          
          {hasDiscount && (
            <div className="absolute top-3 left-3 md:top-4 md:right-4 md:left-auto px-2 py-1 bg-[var(--color-terracotta)] text-white text-xs font-bold rounded-lg shadow-sm z-10 w-auto h-auto min-w-[max-content]">
              -{discountPercent}% OFF
            </div>
          )}
          
          {product.isRestocked && inStock && (
            <div className="absolute top-12 left-3 md:top-14 md:left-4 px-2 py-1 bg-green-500 text-white text-[10px] font-medium rounded-lg shadow-sm z-10">
              Restocked
            </div>
          )}
          
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
               <div className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg transform rotate-[-10deg]">
                 Out of Stock
               </div>
            </div>
          )}
        </div>

        {/* RIGHT: Content Section */}
        <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg-primary)]">
          {/* Scrollable Details */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] leading-tight">{title}</h2>
            </div>

            {/* Category & Size */}
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-forest text-xs py-1.5 px-3">{product.category}</span>
              {product.size && (
                <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs py-1.5 px-3">{product.size}</span>
              )}
              {product.demand && (
                <span className="badge bg-orange-50 text-orange-700 text-xs py-1.5 px-3 flex items-center gap-1 border border-orange-100">
                  🔥 {product.demand} Demand
                </span>
              )}
            </div>

            {/* Care Info Grid */}
            <div className="grid grid-cols-4 md:grid-cols-2 gap-3">
              <div className="flex flex-col md:flex-row md:items-center items-center justify-center md:justify-start p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-3">
                <span className="text-xl">💧</span>
                <div className="text-center md:text-left">
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Water</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{product.watering || 'Med'}</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center items-center justify-center md:justify-start p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-3">
                <span className="text-xl">☀️</span>
                <div className="text-center md:text-left">
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Sun</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{product.sunlight || 'Med'}</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center items-center justify-center md:justify-start p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-3">
                <span className="text-xl">📦</span>
                <div className="text-center md:text-left">
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Ship</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{product.transit || 'Safe'}</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center items-center justify-center md:justify-start p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-3 hidden">
                <span className="text-xl">🏠</span>
                <div className="text-center md:text-left">
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Place</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{product.placeAvailable || 'Any'}</p>
                </div>
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 text-xs">
               {product.indoor && <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 font-medium">🏠 Indoor</span>}
               {product.hanging && <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 font-medium">🎋 Hanging</span>}
               {product.mother && <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full border border-pink-100 font-medium">🌱 Mother Plant</span>}
               {product.combo && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-medium">🎁 Combo</span>}
            </div>

            {/* Description */}
            {product.description && <DescriptionBlock text={product.description} />}
          </div>

          {/* Footer (Price & Action) - Fixed at Bottom of Right Col */}
          <div className="p-4 md:p-6 border-t border-[var(--border-color)] bg-[var(--bg-primary)] z-20 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                    {CURRENCY}{price?.toLocaleString('en-IN')}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-[var(--text-secondary)] line-through">
                      {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] md:text-xs text-[var(--text-secondary)] font-medium">Total Price (incl. taxes)</span>
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
                  flex-1 max-w-[200px] h-12 md:h-14 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2
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
      </div>
    </div>,
    document.body
  );
}
