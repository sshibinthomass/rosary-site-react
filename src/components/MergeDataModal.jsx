import { useCart } from '../context/CartContext';

export default function MergeDataModal() {
  const { 
    showMergeDialog, 
    pendingCloudData, 
    handleKeepLocal, 
    handleKeepCloud, 
    handleMergeBoth,
    getLocalCart,
    getLocalWishlist
  } = useCart();

  if (!showMergeDialog) return null;

  const localCart = getLocalCart();
  const localWishlist = getLocalWishlist();
  const cloudCart = pendingCloudData.cart;
  const cloudWishlist = pendingCloudData.wishlist;

  const localCount = localCart.length + localWishlist.length;
  const cloudCount = cloudCart.length + cloudWishlist.length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-cream-dark)] rounded-full flex items-center justify-center">
            <span className="text-3xl">🛒</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-forest)]">
            Welcome Back!
          </h2>
          <p className="text-[var(--color-forest)]/60 mt-2">
            You have items in both your browser and your account. What would you like to do?
          </p>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--color-cream-dark)] rounded-xl p-4 text-center">
            <span className="text-2xl">🌐</span>
            <p className="text-sm font-medium text-[var(--color-forest)] mt-2">Browser Cart</p>
            <p className="text-2xl font-bold text-[var(--color-forest)]">{localCart.length}</p>
            <p className="text-xs text-[var(--color-forest)]/50">items</p>
            {localWishlist.length > 0 && (
              <p className="text-xs text-[var(--color-forest)]/50 mt-1">
                + {localWishlist.length} wishlist
              </p>
            )}
          </div>
          <div className="bg-[var(--color-cream-dark)] rounded-xl p-4 text-center">
            <span className="text-2xl">☁️</span>
            <p className="text-sm font-medium text-[var(--color-forest)] mt-2">Account Cart</p>
            <p className="text-2xl font-bold text-[var(--color-forest)]">{cloudCart.length}</p>
            <p className="text-xs text-[var(--color-forest)]/50">items</p>
            {cloudWishlist.length > 0 && (
              <p className="text-xs text-[var(--color-forest)]/50 mt-1">
                + {cloudWishlist.length} wishlist
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleMergeBoth}
            className="w-full py-3 bg-[var(--color-forest)] text-white rounded-xl font-medium hover:bg-[var(--color-forest-light)] transition-colors"
          >
            🔀 Merge Both ({localCount + cloudCount} items)
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleKeepLocal}
              className="py-3 bg-[var(--color-cream-dark)] text-[var(--color-forest)] rounded-xl font-medium hover:bg-[var(--color-cream)] transition-colors"
            >
              🌐 Keep Browser
            </button>
            <button
              onClick={handleKeepCloud}
              className="py-3 bg-[var(--color-cream-dark)] text-[var(--color-forest)] rounded-xl font-medium hover:bg-[var(--color-cream)] transition-colors"
            >
              ☁️ Keep Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
