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

export default function ProductModal({ product, isOpen, onClose, onAddToCart, inCart, inWishlist, onToggleWishlist }) {
  const modalRef = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Normalize product fields
  const title = product?.title || product?.name || product?.commonName;
  const commonName = product?.commonName || product?.name;
  const price = product?.salesPrice || product?.price;
  const originalPrice = product?.originalPrice;
  const inStock = product?.available !== false && (product?.qtyAvailable !== 'NA' || product?.inStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const plantId = product?.displayId || product?.serialNo || product?.serial || product?.index || product?.id;

  // Reset quantity when product changes
  useEffect(() => {
    setQuantity(1);
    setAddedFeedback(false);
    setActiveImageIndex(0);
  }, [product?.id]);

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

  const imageList = Array.isArray(product?.imageUrls) && product.imageUrls.length > 0
    ? product.imageUrls
    : [product?.imageUrl || '/placeholder-plant.jpg'];

  const hasMultipleImages = imageList.length > 1;

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const handleAddToCart = () => {
    if (!inStock) return;
    onAddToCart({ ...product, id: product.id, name: title, price }, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const totalPrice = (price * quantity).toLocaleString('en-IN');

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
        <div className="relative w-full h-[40vh] lg:w-5/12 lg:h-auto bg-[var(--bg-tertiary)] shrink-0 flex flex-col">
          {/* Main image area */}
          <div className="relative flex-1 group">
            <img
              src={imageList[activeImageIndex]}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300"
            />
            
            {/* ID Badge */}
            <div className="absolute top-3 left-3 md:top-4 md:left-4 px-2.5 py-1.5 bg-white text-gray-800 text-xs font-bold rounded-lg shadow-md z-10">
              #{plantId}
            </div>

            {/* Category Badge */}
            {product.category && (
              <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 px-2.5 py-1.5 bg-[var(--color-forest)] text-white text-xs font-semibold rounded-lg shadow-md z-10">
                {product.category}
              </div>
            )}
            
            {/* Image navigation arrows (only when multiple images) */}
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  className="absolute inset-y-0 left-0 flex items-center px-2 md:px-3 text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                >
                  <span className="text-lg md:text-xl font-bold">‹</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  className="absolute inset-y-0 right-0 flex items-center px-2 md:px-3 text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                >
                  <span className="text-lg md:text-xl font-bold">›</span>
                </button>
              </>
            )}
            
            {/* Wishlist Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWishlist && onToggleWishlist(product); }}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`absolute top-3 right-3 md:top-4 md:right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md backdrop-blur-sm
                ${inWishlist
                  ? 'bg-rose-500 text-white scale-110'
                  : 'bg-white/80 text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-500'
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={inWishlist ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </button>

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

          {/* Thumbnails row */}
          {hasMultipleImages && (
            <div className="px-3 py-2 bg-[var(--bg-primary)]/80 border-t border-[var(--border-color)] flex gap-2 overflow-x-auto no-scrollbar">
              {imageList.map((src, idx) => (
                <button
                  key={src + idx}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border transition-all flex-shrink-0 ${
                    idx === activeImageIndex
                      ? 'border-[var(--color-forest)] ring-2 ring-[var(--color-forest)]'
                      : 'border-[var(--border-color)] hover:border-[var(--color-forest)]/70'
                  }`}
                >
                  <img
                    src={src}
                    alt={`${title} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Content Section */}
        <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg-primary)]">
          {/* Scrollable Details */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] leading-tight">
                <span className="text-sm font-normal text-[var(--text-secondary)] mr-2">#{plantId}</span>{title}
              </h2>
            </div>

            {/* Size */}
            {product.size && (
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs py-1.5 px-3">{product.size}</span>
              </div>
            )}

            {/* Care Info Grid */}
            <div className="grid grid-cols-3 md:grid-cols-2 gap-2 md:gap-3">
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
               {product.indoor && <span className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full border border-green-100 dark:border-green-800 font-medium">🏠 Indoor</span>}
               {product.hanging && <span className="px-3 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-800 font-medium">🎋 Hanging</span>}
               {product.mother && <span className="px-3 py-1 bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 rounded-full border border-pink-100 dark:border-pink-800 font-medium">🌱 Mother Plant</span>}
               {product.combo && <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800 font-medium">🎁 Combo</span>}
            </div>

            {/* Description */}
            {product.description && <DescriptionBlock text={product.description} />}
          </div>

          {/* Footer (Price, Quantity & Action) - Fixed at Bottom of Right Col */}
          <div className="p-4 md:p-6 border-t border-[var(--border-color)] bg-[var(--bg-primary)] z-20 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {/* Price row */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                {CURRENCY}{totalPrice}
              </span>
              {hasDiscount && (
                <span className="text-sm text-[var(--text-secondary)] line-through">
                  {CURRENCY}{(originalPrice * quantity).toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-[10px] text-[var(--text-secondary)] font-medium ml-1">
                (incl. taxes)
              </span>
            </div>

            {/* Quantity stepper + Add to Cart row */}
            <div className="flex items-center gap-3">
              {/* Quantity Stepper — only show when not already in cart */}
              {inStock && !inCart && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="w-9 text-center text-sm font-semibold text-[var(--text-primary)]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(99, q + 1))}
                    className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Add to Cart Button — flex-1 fills remaining space */}
              <button
                onClick={handleAddToCart}
                disabled={!inStock || inCart}
                className={`
                  flex-1 h-12 md:h-14 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                  ${!inStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : inCart
                      ? 'bg-green-600/10 text-green-600 border border-green-500/30 cursor-not-allowed'
                      : addedFeedback
                        ? 'bg-green-600 text-white scale-[0.98]'
                        : 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-light)] hover:shadow-xl hover:-translate-y-0.5'
                  }
                `}
              >
                {!inStock ? 'Out of Stock' : inCart ? (
                  <>
                    <span>In Cart</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>{addedFeedback ? 'Added!' : 'Add to Cart'}</span>
                    {addedFeedback ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
