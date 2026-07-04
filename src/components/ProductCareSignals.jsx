import ProductLineArt from './ProductLineArt';

const SIGNAL_DEFINITIONS = [
  {
    key: 'watering',
    label: 'Water',
    icon: 'water',
    getValue: (product) => product.watering || product.careGuide?.watering || 'Medium',
  },
  {
    key: 'sunlight',
    label: 'Sun',
    icon: 'sun',
    getValue: (product) => product.sunlight || product.careGuide?.sunlight || 'Medium',
  },
  {
    key: 'transit',
    label: 'Ship',
    icon: 'package',
    getValue: (product) => product.transit || 'Safe',
  },
];

export default function ProductCareSignals({ product, variant = 'page' }) {
  if (!product) return null;

  const compact = variant === 'modal';
  const cardClass = compact
    ? 'min-h-[4.5rem] p-3'
    : 'min-h-[5.5rem] p-3 md:p-4';
  const iconClass = compact ? 'h-6 w-6' : 'h-7 w-7';

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3" aria-label="Care summary">
      {SIGNAL_DEFINITIONS.map((signal) => (
        <div
          key={signal.key}
          className={`group/signal flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-center transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--text-primary)] ${cardClass}`}
        >
          <ProductLineArt
            name={signal.icon}
            className={`${iconClass} text-[var(--text-primary)] transition-transform duration-200 group-hover/signal:scale-105`}
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              {signal.label}
            </p>
            <p className="mt-0.5 text-xs font-bold text-[var(--text-primary)]">
              {signal.getValue(product)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
