import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { CURRENCY } from '../config/constants';
import { getProducts } from '../services/productService';
import { resolveImageUrl } from '../utils/imageCompressor';
import { getStorefrontProductTitle } from '../utils/productPresentation';
import { getProductPath, getProductPublicCategory } from '../utils/productSeo';
import { buildRestockAlertMessage, buildWhatsAppLink } from '../utils/nurseryMessages';
import {
  buildCareIntensity,
  buildPlacementVerdicts,
  buildPlantFacts,
  buildWateringYear,
} from '../utils/careInference';

/**
 * The scannable care presentation on the plant page: the "how needy is it"
 * bars, the watering year, the placement verdicts and the comfort/size tiles.
 * Everything is derived from the catalogue prose by `careInference`.
 */

const BAR_TONES = {
  sage: 'bg-[var(--color-sage-700)]',
  accent: 'bg-[var(--color-accent-700)]',
};

const ICON_TONES = {
  sage: 'text-[var(--color-sage-700)]',
  accent: 'text-[var(--color-accent-700)]',
};

const VERDICT_TONES = {
  yes: 'bg-[var(--color-sage-200)] text-[var(--color-sage-800)]',
  maybe: 'bg-[var(--color-accent-200)] text-[var(--color-accent-700)]',
  no: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]',
};

function SectionTitle({ children }) {
  return <h3 className="font-display text-[21px] text-[var(--text-primary)]">{children}</h3>;
}

/** The accent card that answers "what does this plant want?" in one breath. */
export function QuickAnswerCard({ text }) {
  if (!text) return null;
  return (
    <div className="rounded-[28px] bg-[var(--color-accent-200)] p-5">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent-700)]">
        Quick answer
      </p>
      <p className="text-[15px] leading-relaxed text-[var(--color-accent-900)]">{text}</p>
    </div>
  );
}

function CareIntensity({ product }) {
  const rows = buildCareIntensity(product);
  if (rows.length === 0) return null;

  return (
    <section aria-label="How needy is it">
      <SectionTitle>How needy is it?</SectionTitle>
      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
        Three bars each. One is easy, three is demanding.
      </p>
      <div className="mt-1.5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 py-3">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <Icon name={row.icon} className={`h-[17px] w-[17px] ${ICON_TONES[row.tone] || ICON_TONES.sage}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  {row.label}
                </span>
                <span className="font-display text-[15px] text-[var(--text-primary)]">{row.value}</span>
              </div>
              <div className="mt-1 flex gap-1" role="img" aria-label={`${row.label}: ${row.level} of 3`}>
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`h-[7px] flex-1 rounded-full ${
                      step <= row.level
                        ? BAR_TONES[row.tone] || BAR_TONES.sage
                        : 'bg-[var(--color-neutral-300)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WateringYear({ product }) {
  const { seasons, summary } = buildWateringYear(product);
  if (seasons.length === 0) return null;

  return (
    <section aria-label="Watering through the year">
      <SectionTitle>Watering through the year</SectionTitle>
      <div className="mt-2.5 flex gap-2">
        {seasons.map((season) => (
          <div
            key={season.id}
            className="flex flex-1 flex-col items-center gap-1 rounded-[24px] bg-[var(--color-sage-200)] px-2.5 py-4 text-center"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--color-sage-700)]">
              {season.label}
            </span>
            <span className="font-display text-[22px] leading-none text-[var(--color-sage-900)]">
              {season.value}
            </span>
            <span className="text-[10px] text-[var(--color-sage-800)]">{season.note}</span>
          </div>
        ))}
      </div>
      {summary && <p className="mt-2.5 text-xs text-[var(--text-secondary)]">{summary}</p>}
    </section>
  );
}

function PlacementVerdicts({ product }) {
  const rows = buildPlacementVerdicts(product);
  if (rows.length === 0) return null;

  return (
    <section aria-label="Will it live at your place">
      <SectionTitle>Will it live at your place?</SectionTitle>
      <div className="mt-2.5 flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-3 rounded-[24px] bg-[var(--bg-secondary)] px-4 py-3.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
              <Icon name={row.icon} className="h-[19px] w-[19px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight text-[var(--text-primary)]">{row.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{row.note}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                VERDICT_TONES[row.tone] || VERDICT_TONES.maybe
              }`}
            >
              {row.verdict}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlantFacts({ product }) {
  const facts = buildPlantFacts(product);
  if (facts.length === 0) return null;

  return (
    <div className="flex gap-2">
      {facts.map((fact) => (
        <div key={fact.id} className="flex-1 rounded-[20px] bg-[var(--bg-secondary)] px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
            {fact.label}
          </p>
          <p className="mt-1 font-display text-[17px] text-[var(--text-primary)]">{fact.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * An outlined pill row of related destinations. The design promotes "Related
 * plants" and "Care guides" above the long read-more stack so alternatives are
 * visible while someone is still deciding.
 */
export function RelatedPillRow({ title, links, onNavigate }) {
  if (!Array.isArray(links) || links.length === 0) return null;

  return (
    <section aria-label={title}>
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            onClick={onNavigate}
            className="inline-flex rounded-full border border-[var(--border-color)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--color-terracotta)] hover:text-[var(--color-accent-700)] dark:hover:text-[var(--color-accent-300)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** The sage card that replaces the buy bar when a plant is off the bench. */
export function SoldOutPanel({ product, title, className = '' }) {
  const restockHref = buildWhatsAppLink(
    buildRestockAlertMessage({ id: product?.id, title: title || getStorefrontProductTitle(product) })
  );

  return (
    <div className={`rounded-[28px] bg-[var(--color-sage-200)] p-5 ${className}`}>
      <p className="font-display text-[18px] text-[var(--color-sage-900)]">Sold out for now</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-sage-800)]">
        This one takes a few months to grow on. We usually have it back within 6&ndash;8 weeks, and you
        will be first to know.
      </p>
      <a
        href={restockHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#7a8a5e] px-5 font-display text-[15px] text-[#f9f4ed] transition-opacity hover:opacity-90"
      >
        <Icon name="bell" className="h-[17px] w-[17px]" />
        Tell me when it is back
      </a>
      <p className="mt-2.5 text-center text-xs text-[var(--color-sage-800)]">
        One WhatsApp message. No follow-ups.
      </p>
    </div>
  );
}

function isOnTheBench(product) {
  return product?.available !== false && (product?.qtyAvailable !== 'NA' || product?.inStock);
}

/** "On the bench right now" — in-stock alternatives from the same category. */
export function OnTheBenchRail({ product, onNavigate }) {
  const category = product ? getProductPublicCategory(product) : null;
  const currentId = String(product?.id ?? '');
  const [alternatives, setAlternatives] = useState([]);

  useEffect(() => {
    if (!category) return undefined;
    let active = true;

    getProducts(category)
      .then((list) => {
        if (!active) return;
        setAlternatives(
          (Array.isArray(list) ? list : [])
            .filter((candidate) => String(candidate?.id ?? '') !== currentId)
            .filter(isOnTheBench)
            .slice(0, 6)
        );
      })
      .catch(() => {
        if (active) setAlternatives([]);
      });

    return () => {
      active = false;
    };
  }, [category, currentId]);

  if (alternatives.length === 0) return null;

  return (
    <section aria-label="Other plants on the bench">
      <SectionTitle>On the bench right now</SectionTitle>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        These are ready to travel while this one grows on.
      </p>
      <div className="no-scrollbar -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
        {alternatives.map((alternative) => {
          const name = getStorefrontProductTitle(alternative);
          const price = alternative.salesPrice || alternative.price;
          return (
            <Link
              key={alternative.id}
              to={getProductPath(alternative)}
              onClick={onNavigate}
              className="w-[126px] shrink-0"
            >
              <img
                src={
                  resolveImageUrl(
                    Array.isArray(alternative.imageUrls) && alternative.imageUrls.length
                      ? alternative.imageUrls[0]
                      : alternative.imageUrl
                  ) || '/placeholder-plant.jpg'
                }
                alt={name}
                loading="lazy"
                className="washed h-[126px] w-[126px] rounded-[20px] object-cover"
              />
              <p className="mt-2 font-display text-sm leading-tight text-[var(--text-primary)]">{name}</p>
              {price != null && (
                <p className="mt-0.5 text-[13px] font-bold text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
                  {CURRENCY}
                  {price.toLocaleString('en-IN')}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductCareSignals({ product, showQuickAnswer = true, className = '' }) {
  if (!product) return null;

  return (
    <div className={`flex flex-col gap-7 ${className}`} aria-label="Care summary">
      {showQuickAnswer && <QuickAnswerCard text={product.careGuide?.quickAnswer} />}
      <CareIntensity product={product} />
      <WateringYear product={product} />
      <PlacementVerdicts product={product} />
      <PlantFacts product={product} />
    </div>
  );
}
