import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CURRENCY } from '../config/constants';
import ProductModal from '../components/ProductModal';
import SEO from '../components/SEO';
import Icon, { GoogleMark } from '../components/Icon';
import { EmptyState, PageBar } from '../components/storefront';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getProductById, getProductsPage } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { getProductDisplayName, getProductPath } from '../utils/productSeo';
import { buildRestockAlertMessage, buildWhatsAppLink } from '../utils/nurseryMessages';

const isLimitedId = (productId) => typeof productId === 'string' && /^L/i.test(productId);

const priceLabel = (value) => `${CURRENCY}${Number(value || 0).toLocaleString('en-IN')}`;

/** One saved plant: photo, identity, live price and the add / alert action. */
function WishlistRow({ item, product, onOpen, onAddToCart, onRemove, inCart, outOfStock }) {
  const livePrice = product?.salesPrice ?? product?.price;
  const price = livePrice ?? item.price;
  const savedPrice = item.price;
  const priceDropped = !outOfStock
    && Number.isFinite(Number(livePrice))
    && Number.isFinite(Number(savedPrice))
    && Number(livePrice) < Number(savedPrice);
  const title = product ? getStorefrontProductTitle(product) : item.name;
  const category = product?.category || item.category || 'Plant';
  const image = resolveImageUrl(product?.imageUrl || item.imageUrl);
  const restockHref = buildWhatsAppLink(buildRestockAlertMessage({ id: item.productId, title }));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item);
        }
      }}
      className="flex cursor-pointer items-center gap-[13px] rounded-[24px] bg-[var(--bg-secondary)] p-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      <div className="relative shrink-0">
        <div className="h-[82px] w-[82px] overflow-hidden rounded-[18px] bg-[var(--bg-sunken)]">
          <img
            src={image || '/placeholder-plant.jpg'}
            alt={title}
            loading="lazy"
            className={`washed h-full w-full object-cover ${outOfStock ? 'opacity-60' : ''}`}
          />
        </div>
        {outOfStock && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--bg-secondary)] px-2 py-[3px] text-[9px] font-bold text-[var(--text-secondary)]">
            Back soon
          </span>
        )}
        {priceDropped && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--color-accent-200)] px-2 py-[3px] text-[9px] font-bold text-[var(--color-accent-700)]">
            Price dropped
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base leading-tight text-[var(--text-primary)]">{title}</p>
        <p className="mt-[3px] truncate text-[11px] text-[var(--text-muted)]">
          {category} &middot; #{item.productId}
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="font-display text-[17px] text-[var(--text-primary)]">{priceLabel(price)}</span>
          {outOfStock ? (
            <a
              href={restockHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex min-h-8 shrink-0 items-center gap-[7px] rounded-full border border-[var(--border-color)] px-3.5 text-xs font-bold text-[var(--text-primary)]"
            >
              <Icon name="bell" className="h-[14px] w-[14px]" />
              Alert me
            </a>
          ) : (
            <button
              type="button"
              disabled={inCart}
              onClick={(event) => {
                event.stopPropagation();
                onAddToCart(item);
              }}
              className={`inline-flex min-h-8 shrink-0 items-center rounded-full px-4 text-xs font-bold transition-opacity ${
                inCart
                  ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)]'
                  : 'bg-[var(--color-terracotta)] text-[#f5ead8] hover:opacity-90 dark:text-[#201e1d]'
              }`}
            >
              {inCart ? 'In cart' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(item.productId);
        }}
        aria-label={`Remove ${title} from your wishlist`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-200)] text-[var(--color-accent-700)] transition-opacity hover:opacity-80"
      >
        <Icon name="heart" filled className="h-[17px] w-[17px]" />
      </button>
    </div>
  );
}

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, clearWishlist, addToCart, isInCart } = useCart();
  const { user, signInWithGoogle } = useAuth();
  const { success, error } = useToast();
  const location = useLocation();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productStockMap, setProductStockMap] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [addingAll, setAddingAll] = useState(false);

  useEffect(() => {
    if (wishlist.length === 0) return;
    const fetchStockData = async () => {
      const map = {};
      await Promise.all(
        wishlist.map(async (item) => {
          try {
            const product = isLimitedId(item.productId)
              ? await getLimitedById(item.productId)
              : await getProductById(item.productId);
            if (product) map[item.productId] = product;
          } catch {
            // A missing plant simply keeps the saved snapshot on screen.
          }
        })
      );
      setProductStockMap(map);
    };
    fetchStockData();
  }, [wishlist]);

  // The empty state suggests real plants rather than a hard-coded rail.
  useEffect(() => {
    if (wishlist.length > 0) return;
    let cancelled = false;
    getProductsPage(null, 6)
      .then((result) => {
        if (cancelled) return;
        const inStock = (result?.products || []).filter(
          (product) => product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock)
        );
        setSuggestions(inStock.slice(0, 3));
      })
      .catch(() => {
        // Suggestions are a bonus — the empty state stands on its own without them.
      });
    return () => {
      cancelled = true;
    };
  }, [wishlist.length]);

  const isItemOutOfStock = useCallback((item) => {
    const product = productStockMap[item.productId];
    if (!product) return false;
    return product.available === false || (product.qtyAvailable === 'NA' && !product.inStock);
  }, [productStockMap]);

  const handleMoveToCart = async (item, quantity = 1) => {
    const product = {
      id: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category
    };
    await addToCart(product, quantity);
  };

  const handleAddAll = async () => {
    const pending = wishlist.filter((item) => !isItemOutOfStock(item) && !isInCart(item.productId));
    if (pending.length === 0) {
      success('Everything in stock here is already in your cart.');
      return;
    }
    setAddingAll(true);
    let added = 0;
    for (const item of pending) {
      try {
        const product = productStockMap[item.productId];
        await handleMoveToCart({ ...item, price: product?.salesPrice ?? product?.price ?? item.price });
        added += 1;
      } catch {
        // Keep going — the summary below reports what actually landed in the cart.
      }
    }
    setAddingAll(false);
    if (added === 0) error('Could not add these plants to your cart.');
    else success(`${added} ${added === 1 ? 'plant' : 'plants'} added to your cart.`);
  };

  const handleItemClick = async (item) => {
    try {
      const fullProduct = isLimitedId(item.productId)
        ? await getLimitedById(item.productId)
        : await getProductById(item.productId);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      } else {
        // Fallback to item data if full product not found
        setSelectedProduct({ id: item.productId, ...item });
      }
    } catch {
      // Fallback to item data on error
      setSelectedProduct({ id: item.productId, ...item });
    }
  };

  const handleAddToCart = async (product) => {
    await addToCart(product);
  };

  const savedCount = wishlist.length;

  return (
    <div className="animate-fade-in">
      <SEO title="Your Wishlist" description="Plants you've saved for later. Browse and add to cart from your wishlist." noindex />

      <PageBar
        title="Wishlist"
        fallbackTo="/shop"
        trailing={savedCount > 0 ? (
          <button
            type="button"
            onClick={handleAddAll}
            disabled={addingAll}
            className="shrink-0 text-xs font-bold text-[var(--color-accent-700)] transition-opacity hover:opacity-80 disabled:opacity-50 dark:text-[var(--color-accent-300)]"
          >
            {addingAll ? 'Adding...' : 'Add all'}
          </button>
        ) : undefined}
      />

      {savedCount === 0 ? (
        <>
          <EmptyState
            icon="heart"
            title="Nothing saved yet"
            description="Tap the heart on any plant to keep it here. We will tell you when a sold-out one is back."
          >
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-terracotta)] px-6 font-display text-base text-[#f5ead8] dark:text-[#201e1d]"
            >
              Browse the bench
            </Link>
          </EmptyState>

          {suggestions.length > 0 && (
            <section className="mt-9">
              <p className="eyebrow mb-3">Easy to start with</p>
              <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={getProductPath({ ...product, title: getProductDisplayName(product) })}
                    state={{ backgroundLocation: location, product }}
                    className="w-[126px] shrink-0"
                  >
                    <img
                      src={resolveImageUrl(product.imageUrl) || '/placeholder-plant.jpg'}
                      alt={getStorefrontProductTitle(product)}
                      loading="lazy"
                      className="washed h-[126px] w-[126px] rounded-[20px] object-cover"
                    />
                    <p className="mt-2 font-display text-sm leading-tight text-[var(--text-primary)]">
                      {getStorefrontProductTitle(product)}
                    </p>
                    <p className="mt-[3px] text-[13px] font-bold text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
                      {priceLabel(product.salesPrice || product.price)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {savedCount} {savedCount === 1 ? 'plant' : 'plants'} saved. We will tell you when a sold-out
            one is back on the bench.
          </p>

          <div className="flex flex-col gap-2.5">
            {wishlist.map((item) => (
              <WishlistRow
                key={item.productId}
                item={item}
                product={productStockMap[item.productId]}
                onOpen={handleItemClick}
                onAddToCart={handleMoveToCart}
                onRemove={removeFromWishlist}
                inCart={isInCart(item.productId)}
                outOfStock={isItemOutOfStock(item)}
              />
            ))}
          </div>

          {!user && (
            <section>
              <h2 className="mb-3 font-display text-xl text-[var(--text-primary)]">Guest wishlist</h2>
              <div className="rounded-[24px] bg-[var(--bg-secondary)] px-5 py-[18px]">
                <p className="mb-3.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Saved on this phone only. Sign in and it follows you to any device, with restock alerts
                  attached.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                      success('Welcome back!');
                    } catch {
                      error('Failed to sign in. Please try again.');
                    }
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-[11px] rounded-full border border-[var(--border-color)] bg-white text-sm font-semibold text-[#201e1d] transition-opacity hover:opacity-90"
                >
                  <GoogleMark className="h-[18px] w-[18px]" />
                  Continue with Google
                </button>
              </div>
            </section>
          )}

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={clearWishlist}
              className="text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--color-accent-700)]"
            >
              Clear wishlist
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        inCart={selectedProduct ? isInCart(selectedProduct.id) : false}
      />
    </div>
  );
}
