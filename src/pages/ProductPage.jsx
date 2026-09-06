import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { resolveImageUrl } from '../utils/imageCompressor';
import { CURRENCY } from '../config/constants';
import SEO from '../components/SEO';
import Icon from '../components/Icon';
import ProductCareDetails from '../components/ProductCareDetails';
import ProductCareSignals, {
  OnTheBenchRail,
  SoldOutPanel,
} from '../components/ProductCareSignals';
import ProductRelatedLinks from '../components/ProductRelatedLinks';
import { EmptyState, InCartControls, QuantityStepper, RoundButton, StickyBar } from '../components/storefront';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  extractProductIdFromParam,
  getProductCanonicalUrl,
  getProductDisplayName,
  getProductLongDescription,
  getProductMetaDescription,
  getProductMetaTitle,
  getProductPublicCategory,
  getProductRobots,
  getProductVariantSummary,
} from '../utils/productSeo';

export default function ProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const {
    addToCart,
    cart,
    isInCart,
    addToWishlist,
    removeFromCart,
    removeFromWishlist,
    isInWishlist,
    updateQuantity,
  } = useCart();
  const { error } = useToast();
  const { settings } = useSettings();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setQuantity(1);
    setActiveImageIndex(0);

    const fetchProduct = async () => {
      try {
        // Extract just the ID regardless of the trailing SEO slug (e.g "L12-rare-cactus" -> "L12", "55-aloe" -> "55")
        const cleanId = extractProductIdFromParam(productId);

        const isLimited = typeof cleanId === 'string' && /^L/i.test(cleanId);
        const data = isLimited
          ? await getLimitedById(cleanId)
          : await getProductById(cleanId);
        setProduct(data);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const seoName = product ? getProductDisplayName(product) : '';
  const title = product ? getStorefrontProductTitle(product) : '';
  const price = product?.salesPrice || product?.price;
  const originalPrice = product?.originalPrice;
  const inStock = product?.available !== false && (product?.qtyAvailable !== 'NA' || product?.inStock);
  const publicCategory = product ? getProductPublicCategory(product) : 'Plants';
  const hasDiscount = originalPrice && originalPrice > price;
  const inCart = product ? isInCart(product.id) : false;
  const cartLine = product ? cart.find((item) => item.productId === product.id) : null;
  const cartQuantity = cartLine?.quantity || 1;
  const cartLineTotal = cartLine ? (cartLine.price || price) * cartQuantity : 0;
  const inWish = product ? isInWishlist(product.id) : false;

  const imageList = product ? (
    Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls
      : [product.imageUrl || '/placeholder-plant.jpg']
  ).map(resolveImageUrl) : [];

  const handleAddToCart = useCallback(() => {
    if (!inStock || !product) return;
    addToCart({ ...product, id: product.id, name: title, price }, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  }, [product, title, price, quantity, inStock, addToCart]);

  const handleToggleWishlist = useCallback(async () => {
    if (!product) return;
    try {
      if (inWish) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist({ ...product, id: product.id, name: title, price });
      }
    } catch {
      error('Failed to update wishlist');
    }
  }, [product, title, price, inWish, addToWishlist, removeFromWishlist, error]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/shop');
  }, [navigate]);

  const stepImage = useCallback((direction) => {
    setActiveImageIndex((current) => {
      const count = imageList.length;
      if (count < 2) return current;
      return (current + direction + count) % count;
    });
  }, [imageList.length]);

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

  if (loading) {
    return (
      <div className="animate-fade-in mx-auto max-w-3xl">
        <div className="-mx-4 -mt-5 md:-mt-8">
          <div className="h-[320px] w-full bg-[var(--bg-tertiary)] skeleton-shimmer sm:h-[420px]" />
          <div className="-mt-7 space-y-4 rounded-t-[28px] bg-[var(--bg-primary)] px-5 pt-6">
            <div className="h-6 w-40 rounded-full bg-[var(--bg-tertiary)] skeleton-shimmer" />
            <div className="h-9 w-3/4 rounded-2xl bg-[var(--bg-tertiary)] skeleton-shimmer" />
            <div className="h-5 w-1/2 rounded-full bg-[var(--bg-tertiary)] skeleton-shimmer" />
            <div className="h-28 rounded-[28px] bg-[var(--bg-tertiary)] skeleton-shimmer" />
            <div className="h-40 rounded-[28px] bg-[var(--bg-tertiary)] skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon="sprout"
          title="Plant Not Found"
          description="This plant doesn't exist or has been removed."
        >
          <Link to="/shop" className="btn btn-primary">Browse Plants</Link>
        </EmptyState>
      </div>
    );
  }

  const totalPrice = (price * quantity).toLocaleString('en-IN');
  const careGuide = product.careGuide || {};
  const identityLine = [careGuide.scientificName, careGuide.family, `#${product.id}`]
    .filter(Boolean)
    .join(' · ');

  // Strip markdown for plain-text description preview
  const descriptionSource = getProductLongDescription(product) || product.careGuide?.quickAnswer || '';
  const descPlain = descriptionSource
    ? descriptionSource.replace(/#{1,6}\s*/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim()
    : '';
  const canonicalUrl = getProductCanonicalUrl(product);
  const schemaData = [
    buildBreadcrumbStructuredData(product),
    buildFaqStructuredData(product),
  ].filter(Boolean);

  return (
    <>
    <div className="animate-fade-in mx-auto max-w-3xl pb-28">
      <SEO
        title={getProductMetaTitle(product)}
        description={getProductMetaDescription(product) || descPlain.slice(0, 160)}
        image={imageList[0]}
        type="product"
        canonicalUrl={canonicalUrl}
        robots={getProductRobots(product)}
        productData={{ ...product, seo: { ...(product.seo || {}), canonicalUrl }, name: seoName, price }}
        schemaData={schemaData}
      />

      <div className="-mx-4 -mt-5 md:-mt-8">
        {/* Gallery */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageList[activeImageIndex]}
            alt={`${title} - ${publicCategory} from Rosary Plant House`}
            className={`washed h-[320px] w-full object-cover sm:h-[420px] ${inStock ? '' : 'opacity-60'}`}
            fetchPriority="high"
          />

          <div className="absolute inset-x-4 top-3.5 flex items-center justify-between">
            <RoundButton icon="chevron-left" label="Go back" tone="light" size="lg" onClick={goBack} />
            <RoundButton
              icon="heart"
              label={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
              tone="light"
              size="lg"
              filled={inWish}
              onClick={handleToggleWishlist}
              className={inWish ? 'text-[var(--color-accent-700)]' : ''}
            />
          </div>

          {!inStock && (
            <span className="absolute bottom-10 left-4 rounded-full bg-[var(--bg-secondary)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Off the bench
            </span>
          )}

          {imageList.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => stepImage(-1)}
                aria-label="Previous photo"
                className="absolute inset-y-0 left-0 hidden w-12 items-center justify-center text-[#f9f4ed] transition-colors hover:bg-black/15 sm:flex"
              >
                <Icon name="chevron-left" className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => stepImage(1)}
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
                    onClick={() => setActiveImageIndex(index)}
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
        <div className="relative -mt-7 rounded-t-[28px] bg-[var(--bg-primary)] px-5 pt-6">
          {imageList.length > 1 && (
            <div className="no-scrollbar mb-4 hidden gap-2 overflow-x-auto md:flex">
              {imageList.map((src, index) => (
                <button
                  key={`thumb-${src}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
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

          <Link
            to={`/category/${encodeURIComponent(publicCategory)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sage-100)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-sage-800)]"
          >
            {publicCategory}
            {careGuide.subcategory ? ` · ${careGuide.subcategory}` : ''}
          </Link>

          <h1 className="mt-3.5 font-display text-[30px] leading-tight text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{identityLine}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{getProductVariantSummary(product)}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-display text-[32px] text-[var(--text-primary)]">
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

            {!inStock && <OnTheBenchRail product={product} />}

            {/* Alternatives sit above the long read, while someone is still deciding. */}
            <ProductRelatedLinks product={product} />

            {settings.showPlantDescription && <ProductCareDetails product={product} />}
          </div>
        </div>
      </div>
    </div>

      {inStock && (
        <StickyBar>
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
              onDecrease={() => updateQuantity(product.id, cartQuantity - 1)}
              onIncrease={() => updateQuantity(product.id, cartQuantity + 1)}
              onRemove={() => removeFromCart(product.id)}
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
        </StickyBar>
      )}
    </>
  );
}
