import { useEffect, useState, useCallback } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { resolveImageUrl } from '../utils/imageCompressor';
import { CURRENCY } from '../config/constants';
import SEO from '../components/SEO';
import ProductCareDetails from '../components/ProductCareDetails';
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  extractProductIdFromParam,
  getProductCanonicalUrl,
  getProductLongDescription,
  getProductMetaDescription,
  getProductMetaTitle,
  getProductRobots,
} from '../utils/productSeo';

export default function ProductPage() {
  const { productId } = useParams();
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useCart();
  const { error } = useToast();
  const { settings } = useSettings();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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

  const title = product?.title || product?.name || product?.commonName;
  const price = product?.salesPrice || product?.price;
  const originalPrice = product?.originalPrice;
  const inStock = product?.available !== false && (product?.qtyAvailable !== 'NA' || product?.inStock);
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
  const inCart = product ? isInCart(product.id) : false;
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

  if (loading) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-[var(--bg-tertiary)] rounded-2xl skeleton-shimmer" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-[var(--bg-tertiary)] rounded-lg skeleton-shimmer" />
            <div className="h-6 w-1/3 bg-[var(--bg-tertiary)] rounded-lg skeleton-shimmer" />
            <div className="h-24 bg-[var(--bg-tertiary)] rounded-lg skeleton-shimmer" />
            <div className="h-12 w-full bg-[var(--bg-tertiary)] rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="animate-fade-in text-center py-20">
        <span className="text-5xl">🌵</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Plant Not Found</h2>
        <p className="text-[var(--text-secondary)] mt-2">This plant doesn't exist or has been removed.</p>
        <NavLink to="/" className="btn btn-primary mt-6 inline-block">Browse Plants</NavLink>
      </div>
    );
  }

  const totalPrice = (price * quantity).toLocaleString('en-IN');

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
    <div className="animate-fade-in max-w-7xl mx-auto">
      <SEO
        title={getProductMetaTitle(product)}
        description={getProductMetaDescription(product) || descPlain.slice(0, 160)}
        image={imageList[0]}
        type="product"
        canonicalUrl={canonicalUrl}
        robots={getProductRobots(product)}
        productData={{ ...product, seo: { ...(product.seo || {}), canonicalUrl }, name: title, price }}
        schemaData={schemaData}
      />

      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-[var(--text-secondary)] font-medium mb-6 gap-1.5">
        <NavLink to="/" className="hover:text-[var(--color-forest)] transition-colors">Home</NavLink>
        <span>/</span>
        {product.category && (
          <>
            <NavLink to={`/category/${encodeURIComponent(product.category)}`} className="hover:text-[var(--color-forest)] transition-colors">
              {product.category}
            </NavLink>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--text-primary)] truncate max-w-[200px]">{title}</span>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)] gap-6 lg:gap-10">
        {/* LEFT: Images */}
        <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square bg-[var(--bg-tertiary)] rounded-2xl overflow-hidden group">
            <img
              src={imageList[activeImageIndex]}
              alt={`${title} - ${product.category || 'Plant'} from Rosary Plant House`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Discount badge */}
            {hasDiscount && (
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-[var(--color-terracotta)] text-white text-xs font-bold rounded-lg shadow-sm">
                -{discountPercent}% OFF
              </div>
            )}

            {/* ID badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-white text-gray-800 text-xs font-bold rounded-lg shadow-md">
              #{product.id}
            </div>

            {/* Out of stock overlay */}
            {!inStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                <div className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg transform rotate-[-10deg]">
                  Out of Stock
                </div>
              </div>
            )}

            {/* Image nav arrows */}
            {imageList.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIndex((i) => (i - 1 + imageList.length) % imageList.length)}
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                >
                  <span className="text-xl font-bold">‹</span>
                </button>
                <button
                  onClick={() => setActiveImageIndex((i) => (i + 1) % imageList.length)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/80 hover:text-white hover:bg-black/20 transition-colors"
                >
                  <span className="text-xl font-bold">›</span>
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {imageList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {imageList.map((src, idx) => (
                <button
                  key={src + idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    idx === activeImageIndex
                      ? 'border-[var(--color-forest)] ring-2 ring-[var(--color-forest)]'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt={`${title} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Details */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight">
              {title}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">#{product.id}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[var(--text-primary)]">
              {CURRENCY}{totalPrice}
            </span>
            {hasDiscount && (
              <span className="text-base text-[var(--text-secondary)] line-through">
                {CURRENCY}{(originalPrice * quantity).toLocaleString('en-IN')}
              </span>
            )}
            <span className="text-xs text-[var(--text-secondary)]">(incl. taxes)</span>
          </div>

          {/* Size */}
          {product.size && (
            <div className="flex gap-2">
              <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs py-1.5 px-3 rounded-full">{product.size}</span>
            </div>
          )}

          {/* Category & Tags */}
          <div className="flex flex-wrap gap-2 text-xs">
            {product.category && (
              <span className="px-3 py-1 bg-[var(--color-forest)]/10 text-[var(--color-forest)] rounded-full font-semibold">{product.category}</span>
            )}
            {product.indoor && <span className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full border border-green-100 dark:border-green-800 font-medium">🏠 Indoor</span>}
            {product.hanging && <span className="px-3 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-800 font-medium">🎋 Hanging</span>}
            {product.mother && <span className="px-3 py-1 bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 rounded-full border border-pink-100 dark:border-pink-800 font-medium">🌱 Mother Plant</span>}
            {product.combo && <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800 font-medium">🎁 Combo</span>}
            {product.isRestocked && inStock && <span className="px-3 py-1 bg-green-500 text-white rounded-full font-medium">Back in Stock!</span>}
          </div>

          {/* Out of Stock Banner */}
          {!inStock && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <span className="text-lg">🚫</span>
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">Out of Stock</p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">This plant is currently unavailable. Check back later!</p>
              </div>
            </div>
          )}

          <div className="hidden">
            <div className="flex flex-col items-center p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-1">
              <span className="text-xl">💧</span>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Water</p>
              <p className="text-xs font-bold text-[var(--text-primary)]">{product.watering || 'Med'}</p>
            </div>
            <div className="flex flex-col items-center p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-1">
              <span className="text-xl">☀️</span>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Sun</p>
              <p className="text-xs font-bold text-[var(--text-primary)]">{product.sunlight || 'Med'}</p>
            </div>
            <div className="flex flex-col items-center p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--bg-tertiary)] gap-1">
              <span className="text-xl">📦</span>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Ship</p>
              <p className="text-xs font-bold text-[var(--text-primary)]">{product.transit || 'Safe'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-color)]">
            {/* Quantity */}
            {inStock && !inCart && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold text-[var(--text-primary)]">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(99, q + 1))}
                  className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  +
                </button>
              </div>
            )}

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!inStock || inCart}
              className={`
                flex-1 h-12 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
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
                <span>{addedFeedback ? 'Added! ✓' : 'Add to Cart'}</span>
              )}
            </button>

            {/* Wishlist */}
            <button
              onClick={handleToggleWishlist}
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-md shrink-0
                ${inWish
                  ? 'bg-red-500 text-white'
                  : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30'
                }
              `}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={inWish ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {settings.showPlantDescription && (
        <section className="mt-8 lg:mt-10">
          <ProductCareDetails product={product} variant="wide" />
        </section>
      )}
    </div>
  );
}
