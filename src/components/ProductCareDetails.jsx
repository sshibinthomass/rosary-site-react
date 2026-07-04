import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  buildProductCareSections,
  getProductDisplayName,
  getProductLongDescription,
} from '../utils/productSeo';
import ProductLineArt from './ProductLineArt';

const markdownComponents = {
  p: ({ children }) => <p style={{ margin: '0.35rem 0' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '0.35rem 0', paddingLeft: '1.25rem', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0.35rem 0', paddingLeft: '1.25rem', listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '0.15rem 0' }}>{children}</li>,
  strong: ({ children }) => <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>,
  h1: ({ children }) => <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem' }}>{children}</h4>,
  h2: ({ children }) => <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem' }}>{children}</h4>,
  h3: ({ children }) => <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.4rem 0 0.2rem' }}>{children}</h5>,
};

function CleanMarkdown({ text }) {
  if (!text) return null;
  const cleanText = String(text).replace(/Ã‚/g, '');
  return <ReactMarkdown components={markdownComponents}>{cleanText}</ReactMarkdown>;
}

function QuickAnswer({ text }) {
  if (!text) return null;
  return (
    <section className="border-t border-[var(--border-color)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Quick answer</h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{text}</p>
    </section>
  );
}

function AboutPlant({ text }) {
  if (!text) return null;
  return (
    <section className="border-t border-[var(--border-color)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">About this plant</h3>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
        <CleanMarkdown text={text} />
      </div>
    </section>
  );
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || '';
}

function buildCareFocusItems(product) {
  const care = product?.careGuide || {};
  return [
    {
      id: 'light',
      label: 'Light',
      icon: 'sun',
      heading: 'Light setup',
      value: firstText(care.sunlight, product?.sunlight),
      notes: [care.bestPlacement, care.directSunTolerance, care.indoorSuitability].filter(Boolean),
    },
    {
      id: 'water',
      label: 'Water',
      icon: 'water',
      heading: 'Water rhythm',
      value: firstText(care.watering, product?.watering),
      notes: [care.summerWatering, care.monsoonWatering, care.winterWatering].filter(Boolean),
    },
    {
      id: 'placement',
      label: 'Place',
      icon: 'placement',
      heading: 'Best spot',
      value: firstText(care.bestPlacement, care.balconySuitability, care.indoorSuitability),
      notes: [care.soil, care.potDrainage, care.temperature, care.humidity].filter(Boolean),
    },
    {
      id: 'season',
      label: 'Season',
      icon: 'season',
      heading: 'Season care',
      value: firstText(care.summerCare, care.monsoonCare, care.winterCare),
      notes: [care.southIndiaNote, care.northIndiaNote].filter(Boolean),
    },
  ].filter((item) => item.value || item.notes.length > 0);
}

function CareFocusExplorer({ product, wide }) {
  const items = buildCareFocusItems(product);
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId) || items[0];
  const buttonClass = wide
    ? 'min-h-[4.25rem] px-3 py-2'
    : 'min-h-[3.75rem] px-2.5 py-2';

  return (
    <section className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] ${wide ? 'p-4' : 'p-3'}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black bg-[var(--bg-primary)] text-black dark:border-white dark:text-white">
          <ProductLineArt name="rosette" className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Care focus</h3>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {activeItem.heading}
          </p>
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${wide ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`} role="tablist" aria-label="Care focus">
        {items.map((item) => {
          const selected = item.id === activeItem.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(item.id)}
              className={`${buttonClass} rounded-lg border text-left transition-all duration-200 ${
                selected
                  ? 'border-[var(--text-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ProductLineArt name={item.icon} className="h-5 w-5 text-black dark:text-white" />
              <span className="mt-1 block text-xs font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>

      <article className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
        <div className="flex items-start gap-3">
          <ProductLineArt name={activeItem.icon} className="mt-0.5 h-7 w-7 shrink-0 text-black dark:text-white" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{activeItem.heading}</h4>
            {activeItem.value && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{activeItem.value}</p>
            )}
            {activeItem.notes.length > 0 && (
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                {activeItem.notes.slice(0, wide ? 4 : 2).map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

const WIDE_ITEM_KEYS = new Set([
  'shortDescription',
  'summerCare',
  'monsoonCare',
  'winterCare',
  'southIndiaNote',
  'northIndiaNote',
  'recoveryTips',
]);

const FULL_WIDTH_SECTION_IDS = new Set([
  'india-notes',
  'common-problems',
  'recovery-tips',
]);

const INTERACTIVE_ITEM_SECTION_IDS = new Set([
  'watering-seasons',
  'soil-climate',
  'maintenance-propagation',
  'seasonal-care',
  'india-notes',
]);

const SECTION_ICON_BY_ID = {
  'watering-seasons': 'water',
  'soil-climate': 'soil',
  'maintenance-propagation': 'leaf',
  'seasonal-care': 'season',
  'india-notes': 'placement',
  'common-problems': 'leaf',
  'recovery-tips': 'roots',
};

const ITEM_ICON_BY_KEY = {
  watering: 'water',
  summerWatering: 'sun',
  monsoonWatering: 'season',
  winterWatering: 'season',
  soil: 'soil',
  potDrainage: 'roots',
  temperature: 'sun',
  humidity: 'leaf',
  fertilizer: 'soil',
  pruning: 'leaf',
  repotting: 'roots',
  propagation: 'rosette',
  summerCare: 'sun',
  monsoonCare: 'water',
  winterCare: 'season',
  southIndiaNote: 'placement',
  northIndiaNote: 'season',
  recoveryTips: 'roots',
};

const PROBLEM_ICON_BY_KEY = {
  yellowLeaves: 'leaf',
  leafDrop: 'leaf',
  softStem: 'roots',
  wrinkledLeaves: 'water',
  leggyGrowth: 'sun',
  sunburn: 'sun',
  pests: 'leaf',
  rootRot: 'roots',
};

function shouldSpanFull(item, index, items) {
  return WIDE_ITEM_KEYS.has(item.key) || (items.length % 2 === 1 && index === items.length - 1);
}

function getItemIcon(section, item) {
  return ITEM_ICON_BY_KEY[item?.key] || SECTION_ICON_BY_ID[section?.id] || 'leaf';
}

function getOptionGridClass(count, wide) {
  if (!wide) return 'grid-cols-2';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
  if (count === 4) return 'grid-cols-2 sm:grid-cols-4';
  return 'grid-cols-2';
}

function CareOptionButton({ selected, label, icon, onClick, wide }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`${wide ? 'min-h-[4.25rem] px-3 py-2.5' : 'min-h-[3.75rem] px-2.5 py-2'} rounded-lg border text-left transition-all duration-200 ${
        selected
          ? 'border-[var(--text-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <ProductLineArt name={icon} className="h-5 w-5 text-black dark:text-white" />
      <span className="mt-1.5 block text-xs font-bold leading-tight">{label}</span>
    </button>
  );
}

function CareItems({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map((item, index) => (
        <div
          key={item.key}
          className={`min-h-[5rem] rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 ${
            shouldSpanFull(item, index, items) ? 'sm:col-span-2' : ''
          }`}
        >
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-[var(--text-primary)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function InteractiveCareItems({ section, wide }) {
  const items = Array.isArray(section.items) ? section.items : [];
  const [activeKey, setActiveKey] = useState(items[0]?.key || '');

  if (items.length < 2) return <CareItems items={items} />;

  const activeItem = items.find((item) => item.key === activeKey) || items[0];
  const activeIcon = getItemIcon(section, activeItem);
  const buttonGridClass = getOptionGridClass(items.length, wide);

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-2 ${buttonGridClass}`}
        role="tablist"
        aria-label={`${section.title} options`}
      >
        {items.map((item) => {
          const selected = item.key === activeItem.key;
          return (
            <CareOptionButton
              key={item.key}
              selected={selected}
              label={item.label}
              icon={getItemIcon(section, item)}
              onClick={() => setActiveKey(item.key)}
              wide={wide}
            />
          );
        })}
      </div>

      <article className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black bg-[var(--bg-primary)] text-black dark:border-white dark:text-white">
            <ProductLineArt name={activeIcon} className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              {activeItem.label}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-primary)]">
              {activeItem.value}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function ProblemItems({ problems, wide }) {
  if (!Array.isArray(problems) || problems.length === 0) return null;
  return (
    <div className={`grid grid-cols-1 gap-2.5 ${wide ? 'lg:grid-cols-2' : ''}`}>
      {problems.map((problem) => (
        <div
          key={problem.key}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"
        >
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{problem.label}</h4>
          {problem.reason && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Reason: </span>
              {problem.reason}
            </p>
          )}
          {problem.solution && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Solution: </span>
              {problem.solution}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function InteractiveProblemItems({ problems, wide }) {
  const items = Array.isArray(problems) ? problems : [];
  const [activeKey, setActiveKey] = useState(items[0]?.key || '');

  if (items.length < 2) return <ProblemItems problems={items} wide={wide} />;

  const activeProblem = items.find((problem) => problem.key === activeKey) || items[0];
  const activeIcon = PROBLEM_ICON_BY_KEY[activeProblem.key] || 'leaf';

  return (
    <div className="space-y-3">
      <div
        className={`grid grid-cols-2 gap-2 ${wide ? 'sm:grid-cols-4' : ''}`}
        role="tablist"
        aria-label="Common problem options"
      >
        {items.map((problem) => {
          const selected = problem.key === activeProblem.key;
          return (
            <CareOptionButton
              key={problem.key}
              selected={selected}
              label={problem.label}
              icon={PROBLEM_ICON_BY_KEY[problem.key] || 'leaf'}
              onClick={() => setActiveKey(problem.key)}
              wide={wide}
            />
          );
        })}
      </div>

      <article className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black bg-[var(--bg-primary)] text-black dark:border-white dark:text-white">
            <ProductLineArt name={activeIcon} className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{activeProblem.label}</h4>
            <div className={`mt-2 grid gap-2 ${wide ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              {activeProblem.reason && (
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Reason</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{activeProblem.reason}</p>
                </div>
              )}
              {activeProblem.solution && (
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Solution</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{activeProblem.solution}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function CareSection({ section, defaultOpen, wide }) {
  const sectionClass = wide
    ? `group/section rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 ${
      FULL_WIDTH_SECTION_IDS.has(section.id) ? 'lg:col-span-2' : ''
    }`
    : 'group/section border-t border-[var(--border-color)] pt-3';

  return (
    <details className={sectionClass} open={defaultOpen}>
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 select-none py-1.5 text-sm font-semibold text-[var(--text-primary)]">
        <span>{section.title}</span>
        <span className="text-xs text-[var(--text-secondary)] transition-transform duration-200 group-open/section:rotate-45">+</span>
      </summary>
      <div className="pt-3">
        {INTERACTIVE_ITEM_SECTION_IDS.has(section.id)
          ? <InteractiveCareItems section={section} wide={wide} />
          : <CareItems items={section.items} />}
        {section.id === 'common-problems'
          ? <InteractiveProblemItems problems={section.problems} wide={wide} />
          : <ProblemItems problems={section.problems} wide={wide} />}
      </div>
    </details>
  );
}

function FAQSection({ product }) {
  const faqs = Array.isArray(product?.faqs)
    ? product.faqs.filter((faq) => faq?.question && faq?.answer)
    : [];
  if (faqs.length === 0) return null;

  return (
    <section className="border-t border-[var(--border-color)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
        Plant questions
      </h3>
      <div className="divide-y divide-[var(--border-color)]">
        {faqs.map((faq) => (
          <details key={faq.question} className="group/faq py-2">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-semibold text-[var(--text-primary)]">
              <span>{faq.question}</span>
              <span className="text-xs text-[var(--text-secondary)] transition-transform duration-200 group-open/faq:rotate-45">+</span>
            </summary>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function ProductCareDetails({ product, variant = 'compact' }) {
  if (!product) return null;

  const wide = variant === 'wide';
  const quickAnswer = product.careGuide?.quickAnswer;
  const longDescription = getProductLongDescription(product);
  const careSections = buildProductCareSections(product);
  const hasDetails = quickAnswer || longDescription || careSections.length > 0 || product.faqs?.length > 0;

  if (!hasDetails) return null;

  return (
    <div className="space-y-4" aria-label={`${getProductDisplayName(product)} care details`}>
      <CareFocusExplorer product={product} wide={wide} />
      <div className={wide ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4' : 'space-y-4'}>
        <QuickAnswer text={quickAnswer} />
        <AboutPlant text={longDescription} />
      </div>
      <div className={wide ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
        {careSections.map((section) => (
          <CareSection
            key={section.id}
            section={section}
            defaultOpen
            wide={wide}
          />
        ))}
      </div>
      <FAQSection product={product} />
    </div>
  );
}
