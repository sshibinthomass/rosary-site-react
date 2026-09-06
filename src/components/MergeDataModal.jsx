import { useCart } from '../context/CartContext';
import Icon from './Icon';

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

  const sides = [
    {
      id: 'local',
      eyebrow: 'On this phone',
      icon: 'phone',
      cart: localCart.length,
      wishlist: localWishlist.length,
    },
    {
      id: 'cloud',
      eyebrow: 'In your account',
      icon: 'user',
      cart: cloudCart.length,
      wishlist: cloudWishlist.length,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="animate-slide-up relative w-full max-w-md rounded-t-[28px] bg-[var(--bg-secondary)] p-6 pb-8 shadow-[var(--shadow-lifted)] safe-bottom sm:rounded-[28px] sm:pb-6">
        <div className="mb-5 flex justify-center sm:hidden">
          <span className="h-1 w-11 rounded-full bg-[var(--bg-tertiary)]" />
        </div>

        <div className="mb-5 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-sage-200)] text-[var(--color-sage-800)]">
            <Icon name="bag" className="h-6 w-6" />
          </span>
          <h2 className="font-display text-[23px] text-[var(--text-primary)]">Welcome back</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            You have plants saved in this browser and in your account. Which list should we keep?
          </p>
        </div>

        {/* Comparison */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {sides.map((side) => (
            <div key={side.id} className="rounded-[24px] bg-[var(--bg-tertiary)] p-4 text-center">
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                <Icon name={side.icon} className="h-[18px] w-[18px]" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {side.eyebrow}
              </p>
              <p className="mt-1 font-display text-2xl text-[var(--text-primary)]">{side.cart}</p>
              <p className="text-xs text-[var(--text-secondary)]">in the cart</p>
              {side.wishlist > 0 && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">+ {side.wishlist} saved</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button onClick={handleMergeBoth} className="btn btn-primary btn-block w-full">
            Keep both &middot; {localCount + cloudCount} plants
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={handleKeepLocal} className="btn btn-secondary">
              This phone
            </button>
            <button onClick={handleKeepCloud} className="btn btn-secondary">
              My account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
