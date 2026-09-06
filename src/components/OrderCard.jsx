import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../utils/imageCompressor';
import { ACTIVE_STATUSES } from '../utils/orderStatus';
import { buildOrderSupportMessage, buildWhatsAppLink } from '../utils/nurseryMessages';

/**
 * The order summary shared by the account page and the orders list, so the
 * two screens can never drift apart.
 */
const STATUS_LABELS = Object.freeze({
  confirmed: 'Confirmed',
  shipped: 'In transit',
  delivered: 'Delivered'
});

function orderDate(order) {
  const created = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
  return Number.isNaN(created.getTime()) ? null : created;
}

function formatShortDate(order) {
  const created = orderDate(order);
  return created ? created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'recently';
}

/** Plain-language line under the progress bar, in the nursery's own voice. */
function dispatchLine(order) {
  const place = order.customer?.district || order.customer?.state;
  if (order.status === 'shipped') {
    return `On the way${place ? ` to ${place}` : ''}. We send the tracking details on WhatsApp as soon as the courier scans it.`;
  }
  if (order.status === 'confirmed') {
    return 'Packed on the bench and waiting for the next dispatch day. We message you when it leaves the nursery.';
  }
  if (order.status === 'delivered') {
    return 'Delivered. Give it a week to settle in before you repot.';
  }
  return 'We will message you on WhatsApp with the next update.';
}

/** A single order, matching the account and orders screen. */
export default function OrderCard({ order, onOrderAgain, reorderBusy }) {
  const active = ACTIVE_STATUSES.includes(order.status);
  const delivered = order.status === 'delivered';
  const items = order.items || [];
  const thumbs = items.slice(0, 3);
  const extra = items.length - thumbs.length;
  const plants = order.totalItems || items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const filledSegments = order.status === 'shipped' ? 2 : 1;
  const supportHref = buildWhatsAppLink(buildOrderSupportMessage({ orderId: order.orderId }));

  return (
    <div className="rounded-[28px] bg-[var(--bg-secondary)] p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
            {order.orderId}
          </p>
          <p className="mt-[3px] text-[13px] text-[var(--text-secondary)]">
            {plants} {plants === 1 ? 'plant' : 'plants'} &middot; {formatShortDate(order)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-[5px] text-[11px] font-bold ${
          active
            ? 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)]'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
        }`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {thumbs.length > 0 && (
        <div className="mt-3.5 flex gap-2">
          {thumbs.map((item, index) => (
            <img
              key={`${order.id}-${item.productId ?? index}`}
              src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
              alt={item.name || 'Plant'}
              loading="lazy"
              className="washed h-[54px] w-[54px] rounded-[14px] object-cover"
            />
          ))}
          {extra > 0 && (
            <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)]">
              +{extra}
            </span>
          )}
        </div>
      )}

      {active && (
        <div className="mt-3.5 flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((segment) => (
            <span
              key={segment}
              className={`h-1 flex-1 rounded-full ${
                segment < filledSegments ? 'bg-[#7a8a5e]' : 'bg-[var(--color-neutral-300)]'
              }`}
            />
          ))}
        </div>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">{dispatchLine(order)}</p>

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        {active ? (
          <>
            <Link
              to={`/order/${order.id}`}
              className="inline-flex min-h-9 items-center rounded-full bg-[var(--color-terracotta)] px-4 text-[13px] font-bold text-[#f5ead8] dark:text-[#201e1d]"
            >
              Track
            </Link>
            <a
              href={supportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--border-color)] px-4 text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Ask about it
            </a>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onOrderAgain(order)}
              disabled={reorderBusy}
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--border-color)] px-4 text-[13px] font-semibold text-[var(--text-primary)] disabled:opacity-50"
            >
              Order again
            </button>
            {delivered && (
              <Link
                to="/reviews"
                className="inline-flex min-h-9 items-center rounded-full border border-[var(--border-color)] px-4 text-[13px] font-semibold text-[var(--text-primary)]"
              >
                Leave a review
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
