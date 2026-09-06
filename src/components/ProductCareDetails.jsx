import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Icon from './Icon';
import {
  buildProductCareSections,
  getProductLongDescription,
} from '../utils/productSeo';
import { getCareSectionBlurb } from '../utils/careInference';
import { getStorefrontProductTitle } from '../utils/productPresentation';

/**
 * The long care content, collapsed into the "Read more" stack the design shows.
 * Every catalogue care field, troubleshooting entry and FAQ stays reachable —
 * one row per section, opened on tap.
 */

const markdownComponents = {
  p: ({ children }) => <p style={{ margin: '0.4rem 0' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '0.4rem 0', paddingLeft: '1.25rem', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '0.4rem 0', paddingLeft: '1.25rem', listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '0.15rem 0' }}>{children}</li>,
  strong: ({ children }) => <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{children}</strong>,
  h1: ({ children }) => <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem' }}>{children}</h4>,
  h2: ({ children }) => <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem' }}>{children}</h4>,
  h3: ({ children }) => <h5 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.4rem 0 0.2rem' }}>{children}</h5>,
};

/** The design's plain-English titles, mapped onto the catalogue section ids. */
const READ_MORE_TITLES = Object.freeze({
  'plant-profile': 'About this plant',
  'placement-light': 'Placement and light',
  'watering-seasons': 'Watering by season',
  'soil-climate': 'Soil and drainage',
  'maintenance-propagation': 'Maintenance and propagation',
  'seasonal-care': 'Seasonal care',
  'india-notes': 'Growing in India',
  'common-problems': 'Common problems',
  'recovery-tips': 'Recovery tips',
});

function CleanMarkdown({ text }) {
  if (!text) return null;
  const cleanText = String(text).replace(/Ã‚/g, '');
  return <ReactMarkdown components={markdownComponents}>{cleanText}</ReactMarkdown>;
}

function firstSentence(value) {
  const sentence = String(value ?? '').split('.')[0];
  return sentence ? `${sentence.trim()}.` : '';
}

function getFaqs(product) {
  return Array.isArray(product?.faqs)
    ? product.faqs.filter((faq) => faq?.question && faq?.answer)
    : [];
}

/**
 * One row per care section, plus the FAQ row. The long description rides along
 * with "About this plant" so nothing the catalogue carries is dropped.
 */
function buildReadMoreRows(product) {
  const sections = buildProductCareSections(product);
  const longDescription = getProductLongDescription(product);
  const rows = sections.map((section) => ({
    id: section.id,
    title: READ_MORE_TITLES[section.id] || section.title,
    blurb: getCareSectionBlurb(section),
    section,
    description: section.id === 'plant-profile' ? longDescription : '',
  }));

  if (longDescription && !rows.some((row) => row.id === 'plant-profile')) {
    rows.unshift({
      id: 'plant-profile',
      title: READ_MORE_TITLES['plant-profile'],
      blurb: firstSentence(longDescription),
      section: { id: 'plant-profile', items: [] },
      description: longDescription,
    });
  }

  const faqs = getFaqs(product);
  if (faqs.length > 0) {
    rows.push({
      id: 'questions',
      title: 'Questions',
      blurb: `${faqs.length} ${faqs.length === 1 ? 'answer' : 'answers'} about this plant`,
      faqs,
    });
  }

  return rows;
}

function CareItems({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.key} className="rounded-2xl bg-[var(--bg-tertiary)] px-3.5 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--text-secondary)]">
            {item.label}
          </dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-[var(--text-primary)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProblemItems({ problems }) {
  if (!Array.isArray(problems) || problems.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {problems.map((problem) => (
        <div key={problem.key} className="rounded-2xl bg-[var(--bg-tertiary)] px-3.5 py-3">
          <h4 className="font-display text-[15px] text-[var(--text-primary)]">{problem.label}</h4>
          {problem.reason && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">Reason: </span>
              {problem.reason}
            </p>
          )}
          {problem.solution && (
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">Solution: </span>
              {problem.solution}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FaqItems({ faqs }) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {faqs.map((faq) => (
        <div key={faq.question} className="rounded-2xl bg-[var(--bg-tertiary)] px-3.5 py-3">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">{faq.question}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}

function ReadMoreRow({ row }) {
  const [open, setOpen] = useState(false);
  const panelId = `care-panel-${row.id}`;

  return (
    <div className="overflow-hidden rounded-[24px] bg-[var(--bg-secondary)]">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base leading-tight text-[var(--text-primary)]">
            {row.title}
          </span>
          {row.blurb && (
            <span className="mt-1 block text-xs leading-relaxed text-[var(--text-secondary)]">
              {row.blurb}
            </span>
          )}
        </span>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2 px-4 pb-4">
          {row.description && (
            <div className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <CleanMarkdown text={row.description} />
            </div>
          )}
          <CareItems items={row.section?.items} />
          <ProblemItems problems={row.section?.problems} />
          <FaqItems faqs={row.faqs} />
        </div>
      )}
    </div>
  );
}

export default function ProductCareDetails({ product }) {
  if (!product) return null;

  const rows = buildReadMoreRows(product);
  if (rows.length === 0) return null;

  return (
    <section aria-label={`${getStorefrontProductTitle(product)} care details`}>
      <h3 className="font-display text-[21px] text-[var(--text-primary)]">Read more</h3>
      <div className="mt-2.5 flex flex-col gap-2">
        {rows.map((row) => (
          <ReadMoreRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}
