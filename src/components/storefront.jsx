import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import Icon from './Icon';

/**
 * Shared storefront building blocks. Every customer page composes these so the
 * rounded, cream-ground design stays consistent without repeating markup.
 */

/** Small uppercase label above a heading. */
export function Eyebrow({ children, className = '' }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/** Section title with an optional trailing action on the same baseline. */
export function SectionHeading({ title, action, actionTo, onAction, description, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="font-display text-2xl text-[var(--text-primary)]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {action && actionTo && (
        <Link to={actionTo} className="shrink-0 text-sm font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]">
          {action}
        </Link>
      )}
      {action && !actionTo && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 text-sm font-semibold text-[var(--color-accent-700)] hover:underline dark:text-[var(--color-accent-300)]"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/** Round icon button used for back arrows, cart and wishlist affordances. */
export function RoundButton({
  icon,
  label,
  onClick,
  to,
  href,
  badge,
  filled = false,
  tone = 'surface',
  size = 'md',
  className = '',
}) {
  const dimension = size === 'lg' ? 'h-11 w-11' : 'h-10 w-10';
  const tones = {
    surface: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
    plain: 'text-[var(--text-primary)]',
    light: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]',
    accent: 'bg-[var(--color-terracotta)] text-[#f5ead8] dark:text-[#201e1d]',
  };

  const content = (
    <span className={`relative inline-flex ${dimension} items-center justify-center rounded-full transition-colors ${tones[tone] || tones.surface} ${className}`}>
      <Icon name={icon} filled={filled} className="h-[19px] w-[19px]" />
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--bg-primary)] bg-[var(--color-terracotta)] px-1 text-[10px] font-bold text-[#f5ead8]">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} aria-label={label} title={label}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}>
      {content}
    </button>
  );
}

/**
 * The compact page bar every inner page opens with: a back arrow, a centred
 * title and an optional trailing slot.
 *
 * The title doubles as the page's `h1` unless the page renders its own further
 * down, in which case pass `asHeading={false}` so there is exactly one.
 */
export function PageBar({ title, trailing, fallbackTo = '/', asHeading = true, className = '' }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackTo);
  };

  const TitleTag = asHeading ? 'h1' : 'span';

  return (
    <div className={`mb-4 flex items-center gap-3 ${className}`}>
      <RoundButton icon="arrow-left" label="Go back" onClick={goBack} />
      <TitleTag className="min-w-0 flex-1 truncate font-display text-lg text-[var(--text-primary)]">{title}</TitleTag>
      {trailing}
    </div>
  );
}

/** Horizontally scrolling chip rail. */
export function ChipRail({ options, value, onChange, className = '', ariaLabel }) {
  return (
    <div className={`no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1 ${className}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const id = option.id ?? option;
        const label = option.label ?? option;
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`chip shrink-0 ${selected ? 'chip-active' : ''}`}
          >
            {label}
            {option.count != null && (
              <span className={selected ? 'opacity-80' : 'text-[var(--text-muted)]'}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Full-width sage panel used for the ordering / packing explainers. */
export function DeepPanel({ eyebrow, title, children, className = '' }) {
  return (
    <section className={`panel-deep px-5 py-6 ${className}`}>
      {eyebrow && (
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--panel-deep-muted)]">
          {eyebrow}
        </p>
      )}
      {title && <h3 className="mb-4 font-display text-[25px] text-[var(--panel-deep-text)]">{title}</h3>}
      {children}
    </section>
  );
}

/** Numbered step used inside DeepPanel and the About page. */
export function NumberedStep({ index, title, children, tone = 'deep' }) {
  const badgeClass = tone === 'deep'
    ? 'bg-[var(--color-accent-400)] text-[var(--color-accent-900)]'
    : 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)]';
  const titleClass = tone === 'deep' ? 'text-[var(--panel-deep-text)]' : 'text-[var(--text-primary)]';
  const bodyClass = tone === 'deep' ? 'text-[var(--panel-deep-muted)]' : 'text-[var(--text-secondary)]';

  return (
    <div className="flex items-start gap-3.5">
      <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full font-display text-base ${badgeClass}`}>
        {index}
      </span>
      <div className="min-w-0">
        <p className={`font-display text-base ${titleClass}`}>{title}</p>
        <p className={`mt-1 text-[13px] leading-relaxed ${bodyClass}`}>{children}</p>
      </div>
    </div>
  );
}

/** A tappable row with an icon, two lines of text and a chevron. */
export function ListRow({ icon, title, subtitle, to, href, onClick, trailing, tone = 'card' }) {
  const body = (
    <div className={`flex items-center gap-3 rounded-[24px] px-4 py-3.5 transition-colors ${tone === 'card' ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]'}`}>
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--text-primary)]">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {trailing ?? <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />}
    </div>
  );

  if (to) return <Link to={to} className="block">{body}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{body}</a>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{body}</button>;
  return body;
}

/** Centred empty / dead-end state. */
export function EmptyState({ icon, title, description, tone = 'accent', children }) {
  const tones = {
    accent: 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)]',
    sage: 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)]',
    neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  };

  return (
    <div className="flex flex-col items-center px-2 pt-8 text-center">
      <span className={`mb-5 flex h-24 w-24 items-center justify-center rounded-full ${tones[tone] || tones.accent}`}>
        <Icon name={icon} className="h-11 w-11" strokeWidth={2} />
      </span>
      <h3 className="mb-2.5 font-display text-[25px] text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mb-6 max-w-[320px] text-[15px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
      )}
      {children}
    </div>
  );
}

/**
 * Sticky action bar pinned above the mobile tab bar.
 *
 * Rendered into the body: several page roots animate in, and any ancestor with
 * a transform becomes the containing block for `position: fixed`, which would
 * drop the bar back into the document flow.
 */
export function StickyBar({ children, className = '' }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`sticky-action-bar glass fixed inset-x-0 z-40 border-t border-[var(--border-color)] px-4 py-3 ${className}`}>
      <div className="mx-auto flex max-w-3xl items-center gap-3">{children}</div>
    </div>,
    document.body
  );
}

/** Pill quantity stepper. */
export function QuantityStepper({ value, onDecrease, onIncrease, min = 1, size = 'md', className = '' }) {
  const height = size === 'sm' ? 'h-9' : 'h-11';
  const button = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const disabled = value <= min;

  return (
    <div className={`flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-color)] px-1.5 ${height} ${className}`}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Decrease quantity"
        className={`flex ${button} items-center justify-center rounded-full transition-colors ${disabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
      >
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className="min-w-[22px] text-center font-display text-base text-[var(--text-primary)]">{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label="Increase quantity"
        className={`flex ${button} items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-sunken)]`}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * The buy control once a plant is already in the cart: the line quantity stays
 * adjustable and removable without a trip to the cart page.
 */
export function InCartControls({ quantity, total, onDecrease, onIncrease, onRemove, removeLabel = 'Remove from cart', className = '' }) {
  return (
    <div className={`flex w-full items-center gap-2 rounded-full bg-[var(--color-sage-200)] px-1.5 ${className}`}>
      <QuantityStepper
        size="sm"
        value={quantity}
        min={0}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        className="border-transparent bg-[var(--bg-secondary)]"
      />
      <span className="min-w-0 flex-1 truncate text-center font-display text-[15px] text-[var(--color-sage-800)]">
        In cart &middot; {CURRENCY}{total.toLocaleString('en-IN')}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--color-sage-800)] transition-colors hover:text-[var(--color-accent-700)]"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** A card that leads with a washed photograph and overlays a title. */
export function PhotoBanner({ src, alt, eyebrow, title, titleAs = 'h2', description, height = 'h-[230px]', className = '', children }) {
  const TitleTag = titleAs;

  return (
    <div className={`relative overflow-hidden rounded-[28px] ${height} ${className}`}>
      <img src={src} alt={alt} className="washed h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(39,46,27,0.82)] via-[rgba(39,46,27,0.15)] to-transparent" />
      <div className="absolute inset-x-5 bottom-5">
        {eyebrow && (
          <span className="mb-2 inline-block rounded-full bg-[var(--color-sage-100)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--color-sage-800)]">
            {eyebrow}
          </span>
        )}
        {title && <TitleTag className="font-display text-[27px] leading-tight text-[#f9f4ed]">{title}</TitleTag>}
        {description && <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-sage-200)]">{description}</p>}
        {children}
      </div>
    </div>
  );
}

/** A WhatsApp call-to-action styled for the deep sage panels. */
export function WhatsAppButton({ href, children, tone = 'light', className = '' }) {
  const tones = {
    light: 'bg-[var(--color-sage-100)] text-[var(--color-sage-900)]',
    sage: 'bg-[#7a8a5e] text-[#f9f4ed]',
    accent: 'bg-[var(--color-accent-700)] text-[var(--color-accent-100)]',
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full px-5 font-display text-[15px] transition-opacity hover:opacity-90 ${tones[tone] || tones.light} ${className}`}
    >
      <Icon name="whatsapp" filled className="h-[17px] w-[17px]" />
      {children}
    </a>
  );
}
