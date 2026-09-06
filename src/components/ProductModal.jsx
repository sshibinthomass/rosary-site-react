import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { getProductRelatedSeoLinks } from '../utils/contentHubs';
import { useSettings } from '../context/SettingsContext';
import SEO from './SEO';
import Icon from './Icon';
import ProductCareSignals, {
  OnTheBenchRail,
  RelatedPillRow,
  SoldOutPanel,
} from './ProductCareSignals';
import ProductCareDetails from './ProductCareDetails';
import { InCartControls, QuantityStepper, RoundButton } from './storefront';
import { useCart } from '../context/CartContext';
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  getProductCanonicalUrl,
  getProductMetaDescription,
  getProductMetaTitle,
  getProductPublicCategory,
  getProductRobots,
} from '../utils/productSeo';

export default function ProductModal({ product, isOpen, onClose, onAddToCart, inCart, inWishlist, onToggleWishlist }) {
  const modalRef = useRef(null);
  const detailsRef = useRef(null);
  const touchStartX = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const { settings } = useSettings();
  const { cart, removeFromCart, updateQuantity } = useCart();
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const seoName = product?.title || product?.name || product?.commonName;
  const title = getStorefrontProductTitle(product);
  const price = product?.salesPrice || product?.price;
  const originalPrice = product?.originalPrice;
  const inStock = product?.available !== false && (product?.qtyAvailable !== 'NA' || product?.inStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const plantId = product?.id;

  // Reset quantity when product changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset modal-local controls when a different product opens. */
    setQuantity(1);
    setAddedFeedback(false);
    setActiveImageIndex(0);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Ensure we always start viewing from the top of the modal content
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
    if (detailsRef.current) {
      detailsRef.current.scrollTop = 0;
    }
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

  const imageList = (
    Array.isArray(product?.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls
      : [product?.imageUrl || '/placeholder-plant.jpg']
  ).map(resolveImageUrl);

  const hasMultipleImages = imageList.length > 1;

  const stepImage = (direction) => {
    if (!hasMultipleImages) return;
    setActiveImageIndex((prev) => (prev + direction + imageList.length) % imageList.length);
  };

  const handleNextImage = () => stepImage(1);
  const handlePrevImage = () => stepImage(-1);

  const handleTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 40) return;
    stepImage(delta < 0 ? 1 : -1);
  };

  const handleAddToCart = () => {
    if (!inStock) return;
    onAddToCart({ ...product, id: product.id, name: title, price }, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const totalPrice = (price * quantity).toLocaleString('en-IN');
  const cartLine = cart.find((item) => item.productId === plantId);
  const cartQuantity = cartLine?.quantity || 1;
  const cartLineTotal = cartLine ? (cartLine.price || price) * cartQuantity : 0;
  const canonicalUrl = getProductCanonicalUrl(product);
  const schemaData = [
    buildBreadcrumbStructuredData(product),
    buildFaqStructuredData(product),
  ].filter(Boolean);

  const careGuide = product.careGuide || {};
  const category = product.category || getProductPublicCategory(product);
  const identityLine = [careGuide.scientificName, careGuide.family, `#${plantId}`]
    .filter(Boolean)
    .join(' · ');
  const relatedLinks = getProductRelatedSeoLinks(product);

  // Use createPortal to render modal at document.body level
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex md:items-center md:justify-center md:p-4"
      onClick={onClose}
    >
      <SEO
        title={getProductMetaTitle(product)}
        description={getProductMetaDescription(product)}
        image={imageList[0]}
        type="product"
        canonicalUrl={canonicalUrl}
        robots={getProductRobots(product)}
        productData={{...product, seo: { ...(product.seo || {}), canonicalUrl }, name: seoName, price}}
        schemaData={schemaData}
      />
      {/* Backdrop */}
      <div className="absolute inset-0 hidden bg-black/60 backdrop-blur-sm animate-fade-in md:block" />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative flex h-full w-full max-w-none flex-col overflow-hidden bg-[var(--bg-primary)] animate-slide-up shadow-[var(--shadow-lifted)] md:h-[88vh] md:max-h-[860px] md:max-w-2xl md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={detailsRef} className="flex-1 overflow-y-auto">
          {/* Gallery */}
          <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <img
              src={imageList[activeImageIndex]}
              alt={`${title} - ${category || 'Plant'} from Rosary Plant House`}
              className={`washed h-[300px] w-full object-cover sm:h-[380px] ${inStock ? '' : 'opacity-60'}`}
            />

            <div className="absolute inset-x-4 top-3.5 flex items-center justify-between">
              <RoundButton icon="chevron-left" label="Close" tone="light" size="lg" onClick={onClose} />
              <RoundButton
                icon="heart"
                label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                tone="light"
                size="lg"
                filled={inWishlist}
                onClick={() => onToggleWishlist && onToggleWishlist(product)}
                className={inWishlist ? 'text-[var(--color-accent-700)]' : ''}
              />
            </div>

            {!inStock && (
              <span className="absolute bottom-10 left-4 rounded-full bg-[var(--bg-secondary)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                Off the bench
              </span>
            )}

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  aria-label="Previous photo"
                  className="absolute inset-y-0 left-0 hidden w-12 items-center justify-center text-[#f9f4ed] transition-colors hover:bg-black/15 sm:flex"
                >
                  <Icon name="chevron-left" className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  aria-label="Next photo"
                  className="absolute inset-y-0 right-0 hidden w-12 items-center justify-center text-[#f9f4ed] transition-colors hover:bg-black/15 sm:flex"
                >
                  <Icon name="chevron-right" className="h-6 w-6" />
                </button>
                <div className="absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
                  {imageList.map((src, index) => (
                    <button
                      key={src + index}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveImageIndex(index); }}
                      aria-label={`Show photo ${index + 1}`}
                      aria-current={index === activeImageIndex}
                      className={`h-[5px] rounded-full transition-all ${
                        index === activeImageIndex ? 'w-[22px] bg-[#f9f4ed]' : 'w-[5px] bg-[#f9f4ed]/55'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Body sheet */}
          <div className="relative -mt-7 rounded-t-[28px] bg-[var(--bg-primary)] px-5 pb-6 pt-6">
            {hasMultipleImages && (
              <div className="no-scrollbar mb-4 hidden gap-2 overflow-x-auto md:flex">
                {imageList.map((src, index) => (
                  <button
                    key={`thumb-${src}-${index}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveImageIndex(index); }}
                    aria-label={`Show photo ${index + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl transition-opacity ${
                      index === activeImageIndex
                        ? 'ring-2 ring-[var(--color-terracotta)]'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt={`${title} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {category && (
              <Link
                to={`/category/${encodeURIComponent(category)}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sage-100)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-sage-800)]"
              >
                {category}
                {careGuide.subcategory ? ` · ${careGuide.subcategory}` : ''}
              </Link>
            )}

            <h2 className="mt-3.5 font-display text-[27px] leading-tight text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{identityLine}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="font-display text-[30px] text-[var(--text-primary)]">
                {CURRENCY}{price?.toLocaleString('en-IN')}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-[15px] text-[var(--text-secondary)] line-through">
                    {CURRENCY}{originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="rounded-full bg-[var(--color-accent-200)] px-3 py-1.5 text-xs font-bold text-[var(--color-accent-700)]">
                    Save {CURRENCY}{(originalPrice - price).toLocaleString('en-IN')}
                  </span>
                </>
              )}
              <span className="text-xs text-[var(--text-secondary)]">(incl. taxes)</span>
            </div>

            {product.isRestocked && inStock && (
              <span className="mt-3 inline-block rounded-full bg-[var(--color-sage-200)] px-3 py-1.5 text-xs font-bold text-[var(--color-sage-800)]">
                Back on the bench
              </span>
            )}

            <div className="mt-7 flex flex-col gap-7">
              {!inStock && <SoldOutPanel product={product} title={title} />}

              <ProductCareSignals product={product} showQuickAnswer={settings.showPlantDescription} />

              {!inStock && <OnTheBenchRail product={product} onNavigate={onClose} />}

              <RelatedPillRow title="Related plants" links={relatedLinks.plants} onNavigate={onClose} />
              <RelatedPillRow title="Care guides" links={relatedLinks.careGuides} onNavigate={onClose} />

              {settings.showPlantDescription && <ProductCareDetails product={product} />}
            </div>
          </div>
        </div>

        {/* Buy bar */}
        {inStock && (
          <div className="glass z-20 shrink-0 border-t border-[var(--border-color)] px-4 py-3 safe-bottom">
            <div className="flex items-center gap-3">
              {!inCart && (
                <QuantityStepper
                  value={quantity}
                  onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                  onIncrease={() => setQuantity((q) => Math.min(99, q + 1))}
                />
              )}
              {inCart ? (
                <InCartControls
                  className="h-12"
                  quantity={cartQuantity}
                  total={cartLineTotal}
                  onDecrease={() => updateQuantity(plantId, cartQuantity - 1)}
                  onIncrease={() => updateQuantity(plantId, cartQuantity + 1)}
                  onRemove={() => removeFromCart(plantId)}
                  removeLabel={`Remove ${title} from cart`}
                />
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`btn h-12 flex-1 ${addedFeedback ? 'btn-sage' : 'btn-primary'}`}
                >
                  {addedFeedback ? 'Added!' : `Add to cart · ${CURRENCY}${totalPrice}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
