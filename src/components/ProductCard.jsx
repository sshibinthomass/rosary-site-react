import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { getProductDisplayName, getProductPath } from '../utils/productSeo';
import { buildRestockAlertMessage, buildWhatsAppLink } from '../utils/nurseryMessages';
import Icon from './Icon';
import { InCartControls, QuantityStepper } from './storefront';

const CARE_TILES = [
  { key: 'watering', label: 'Water', icon: 'droplet', tone: 'text-[var(--color-sage-700)] dark:text-[var(--color-sage-300)]', fallback: 'Med' },
  { key: 'sunlight', label: 'Sun', icon: 'sun', tone: 'text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]', fallback: 'Med' },
  { key: 'transit', label: 'Ship', icon: 'package', tone: 'text-[var(--text-secondary)]', fallback: 'Safe' },
];

export default function ProductCard({ product, index }) {
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [heartAnim, setHeartAnim] = useState(false);
  const {
    addToCart,
    addToWishlist,
    removeFromCart,
    removeFromWishlist,
    isInCart,
    isInWishlist,
    updateQuantity,
    cart,
  } = useCart();
  const { error } = useToast();

  // Normalize product fields (handle both old and new schema)
  const seoName = getProductDisplayName(product);
  const name = getStorefrontProductTitle(product);
  const productPath = getProductPath({ ...product, title: seoName });
  const productLinkState = { backgroundLocation: location, product };
  const price = product.salesPrice || product.price;
  const originalPrice = product.originalPrice;
  const inStock = product.available !== false && (product.qtyAvailable !== 'NA' || product.inStock);
  const hasDiscount = originalPrice && originalPrice > price;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    try {
      await addToCart({ ...product, id: product.id, name, price }, quantity);
    } catch {
      error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist({ ...product, id: product.id, name, price });
      }
    } catch {
      error('Failed to update wishlist');
    }
  };

  const inCart = isInCart(product.id);
  const inWishlist = isInWishlist(product.id);
  const cartLine = cart.find((item) => item.productId === product.id);
  const cartQuantity = cartLine?.quantity || 1;
  const cartLineTotal = cartLine ? (cartLine.price || price) * cartQuantity : 0;

  const handleCartQuantity = async (nextQuantity) => {
    try {
      await updateQuantity(product.id, nextQuantity);
    } catch {
      error('Failed to update the cart');
    }
  };

  const handleRemoveFromCart = async () => {
    try {
      await removeFromCart(product.id);
    } catch {
      error('Failed to remove from cart');
    }
  };

  const plantId = product.id;
  const category = product.category || 'Plant';
  const primaryImage = resolveImageUrl(
    Array.isArray(product.imageUrls) && product.imageUrls.length
      ? product.imageUrls[0]
      : product.imageUrl
  );
  const restockHref = buildWhatsAppLink(buildRestockAlertMessage({ id: plantId, title: name }));

  return (
    <div className="card-soft group relative flex flex-col">
      {/* Image */}
      <div className="relative w-full overflow-hidden bg-[var(--bg-sunken)]">
        <img
          src={primaryImage || '/placeholder-plant.jpg'}
          alt={`${name} - ${category} from Rosary Plant House`}
          className={`washed aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105 ${inStock ? '' : 'opacity-60'}`}
          loading={index < 3 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : undefined}
        />

        <Link
          to={productPath}
          state={productLinkState}
          className="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-terracotta)]"
          aria-label={`View ${name}`}
        />

        {/* Sale and stock markers */}
        {hasDiscount && inStock && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-[var(--color-accent-200)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-accent-700)]">
            Save {CURRENCY}{(originalPrice - price).toLocaleString('en-IN')}
          </span>
        )}
        {!inStock && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Off the bench
          </span>
        )}
        {product.isRestocked && inStock && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-[var(--color-sage-200)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-sage-800)]">
            Back on the bench
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`
            absolute bottom-3.5 right-3.5 z-20 flex h-[42px] w-[42px] items-center justify-center rounded-full
            shadow-[var(--shadow-soft)] transition-all duration-200
            ${heartAnim ? 'animate-heart-pop' : ''}
            ${inWishlist
              ? 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)]'
              : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:text-[var(--color-accent-700)]'
            }
          `}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Icon name="heart" filled={inWishlist} className="h-[19px] w-[19px]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-5 pt-4">
        {/* Identity and price */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={productPath}
              state={productLinkState}
              className="font-display text-[20px] leading-tight text-[var(--text-primary)] transition-colors hover:text-[var(--color-accent-700)] dark:hover:text-[var(--color-accent-300)]"
            >
              {name}
            </Link>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              {category} &middot; #{plantId}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            {hasDiscount && (
              <span className="text-[13px] text-[var(--text-secondary)] line-through">
                {CURRENCY}{originalPrice?.toLocaleString('en-IN')}
              </span>
            )}
            <span className="rounded-full bg-[var(--color-terracotta)] px-3.5 py-1.5 font-display text-[17px] text-[#f5ead8] dark:text-[#201e1d]">
              {CURRENCY}{price?.toLocaleString('en-IN')}
            </span>
          </span>
        </div>

        {/* Care signals */}
        <div className="flex gap-2">
          {CARE_TILES.map((tile) => (
            <div
              key={tile.key}
              className="flex flex-1 items-center gap-2.5 rounded-2xl bg-[var(--bg-secondary)] px-2.5 py-2.5"
            >
              <Icon name={tile.icon} className={`h-[15px] w-[15px] shrink-0 ${tile.tone}`} />
              <span className="min-w-0">
                <span data-label={tile.label} className="tile-val block text-[13px] font-bold leading-tight text-[var(--text-primary)]">
                  {product[tile.key] || tile.fallback}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Purchase controls */}
        <div className="mt-auto flex items-center gap-2.5">
          {!inStock ? (
            <a
              href={restockHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sage w-full gap-2"
            >
              <Icon name="bell" className="h-4 w-4" />
              Tell me when it is back
            </a>
          ) : inCart ? (
            <InCartControls
              className="h-[46px]"
              quantity={cartQuantity}
              total={cartLineTotal}
              onDecrease={() => handleCartQuantity(cartQuantity - 1)}
              onIncrease={() => handleCartQuantity(cartQuantity + 1)}
              onRemove={handleRemoveFromCart}
              removeLabel={`Remove ${name} from cart`}
            />
          ) : (
            <>
              <QuantityStepper
                value={quantity}
                onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
                onIncrease={() => setQuantity(quantity + 1)}
              />
              <button
                onClick={handleAddToCart}
                className="btn btn-ink h-[46px] flex-1"
              >
                Add to cart
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
