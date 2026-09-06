import { useState } from 'react';
import Icon from '../components/Icon';
import SEO from '../components/SEO';
import { ChipRail, DeepPanel, PageBar, WhatsAppButton } from '../components/storefront';
import { buildWhatsAppLink } from '../utils/nurseryMessages';
import { buildCustomerFaqSections } from '../utils/siteSeo';

const ALL_CATEGORIES = 'All';

const faqWhatsAppLink = buildWhatsAppLink(
  'Hello Rosary Plant House, I have a question before I order.'
);

function FaqCard({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-[24px] bg-[var(--bg-secondary)]">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className={`flex w-full items-start justify-between gap-3 px-[18px] pt-4 text-left ${isOpen ? 'pb-2.5' : 'pb-4'}`}
      >
        <span className="text-[15px] font-bold leading-[1.35] text-[var(--text-primary)]">{question}</span>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          className="mt-1 h-4 w-4 shrink-0 text-[var(--text-secondary)]"
        />
      </button>
      {/* Rendered only when open so a long answer is never clipped. */}
      {isOpen && (
        <p className="px-[18px] pb-4 text-sm leading-[1.65] text-[var(--text-secondary)]">{answer}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const faqs = buildCustomerFaqSections();
  const [category, setCategory] = useState(ALL_CATEGORIES);

  // Built from every question so the JSON-LD stays complete under any filter.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.flatMap(section =>
      section.items.map(item => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    )
  };

  const chipOptions = [
    { id: ALL_CATEGORIES, label: ALL_CATEGORIES },
    ...faqs.map((section) => ({
      id: section.category,
      label: section.category,
      count: section.items.length,
    })),
  ];

  const visibleFaqs = category === ALL_CATEGORIES
    ? faqs
    : faqs.filter((section) => section.category === category);

  return (
    <div className="animate-fade-in mx-auto max-w-2xl pb-8">
      <SEO
        title="Help & FAQ"
        description="Find answers to all your questions about ordering, shipping, and caring for succulents, cacti, and indoor plants from Rosary Plant House."
        canonicalUrl="https://rosaryplanthouse.com/faq"
        schemaData={faqSchema}
      />

      <PageBar title="Questions" asHeading={false} />

      <h1 className="font-display text-[27px] leading-[1.08] text-[var(--text-primary)]">
        Everything people ask before ordering
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        If yours is not here, message us. We answer between 9 AM and 9 PM.
      </p>

      <ChipRail
        className="mt-4"
        options={chipOptions}
        value={category}
        onChange={setCategory}
        ariaLabel="Filter questions by category"
      />

      <div className="mt-6 space-y-7">
        {visibleFaqs.map((section) => (
          <section key={section.category}>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
              {section.category}
            </p>
            <div className="space-y-2.5">
              {section.items.map((item) => (
                <FaqCard key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <DeepPanel title="Still wondering?" className="mt-8">
        <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-[var(--panel-deep-muted)]">
          Ask us anything before you order. We would rather answer ten questions than send you a
          plant that will not suit your balcony.
        </p>
        <WhatsAppButton href={faqWhatsAppLink}>Message the nursery</WhatsAppButton>
      </DeepPanel>
    </div>
  );
}
