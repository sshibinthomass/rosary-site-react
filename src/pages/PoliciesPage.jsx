import SEO from '../components/SEO';
import { PageBar, WhatsAppButton } from '../components/storefront';
import { buildWhatsAppLink } from '../utils/nurseryMessages';
import {
  SITE_POLICY,
  buildOrganizationSchema,
  buildPolicyFaqSchema,
  buildWebsiteSchema,
} from '../utils/siteSeo';

const policySchema = [
  buildOrganizationSchema(),
  buildWebsiteSchema(),
  buildPolicyFaqSchema(),
];

const policyWhatsAppLink = buildWhatsAppLink(
  'Hello Rosary Plant House, I have a question about one of your policies.'
);

const POLICY_CARDS = [
  {
    // The JSON-LD ShippingService @id points at #standard-shipping.
    id: 'standard-shipping',
    eyebrow: 'Shipping',
    title: 'How and when we send',
    rows: [
      { label: 'Packing', value: SITE_POLICY.shipping.packaging },
      // Page-local copy: SITE_POLICY has no pot entry.
      { label: 'Pot', value: 'Not included unless the listing says so.' },
      { label: 'Dispatch', value: SITE_POLICY.shipping.dispatchDays },
      { label: 'Cut-off', value: SITE_POLICY.shipping.dispatchTiming },
      { label: 'Courier', value: SITE_POLICY.shipping.courier },
      { label: 'Charge', value: SITE_POLICY.shipping.deliveryCharge },
      { label: 'Service area', value: SITE_POLICY.shipping.serviceArea },
    ],
  },
  {
    // The footer links to /policies#delivery.
    id: 'delivery',
    eyebrow: 'Delivery',
    title: 'How long it takes',
    rows: SITE_POLICY.shipping.deliveryEtaFromDispatch.map((fact) => ({
      label: fact.area,
      value: fact.eta,
    })),
  },
  {
    // The JSON-LD MerchantReturnPolicy @id points at #transit-damage-policy;
    // the footer links to /policies#damage, so the card carries both anchors.
    id: 'transit-damage-policy',
    anchorId: 'damage',
    eyebrow: 'Damage',
    title: 'If a plant arrives hurt',
    rows: [
      { label: 'What we do', value: SITE_POLICY.damageSupport.replacement },
      { label: 'What we need', value: SITE_POLICY.damageSupport.proof },
      { label: 'If we cannot', value: SITE_POLICY.damageSupport.refund },
      { label: 'Not covered', value: SITE_POLICY.damageSupport.exclusions },
    ],
  },
  {
    id: 'payment',
    eyebrow: 'Payment',
    title: 'What we accept',
    rows: [
      { label: 'Methods', value: SITE_POLICY.payment.methods.join(', ') },
      { label: 'Cash on delivery', value: SITE_POLICY.payment.cod },
      // Page-local copy: SITE_POLICY has no payment-timing entry.
      { label: 'When', value: 'Only after we confirm stock and the delivery charge.' },
      {
        label: 'Support',
        // The number is the fastest way to reach us, so make it one tap.
        value: (
          <>
            {SITE_POLICY.support.whatsAppHours} on{' '}
            <a
              href={policyWhatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap font-bold text-[var(--color-accent-700)] underline underline-offset-2 hover:opacity-80 dark:text-[var(--color-accent-300)]"
            >
              {SITE_POLICY.support.phone}
            </a>
          </>
        ),
      },
    ],
  },
  {
    // Page-local copy: cancellation has no SITE_POLICY entry.
    id: 'cancellation',
    eyebrow: 'Cancellation',
    title: 'Changing your mind',
    rows: [
      { label: 'Before dispatch', value: 'Cancel any time, full refund.' },
      { label: 'After dispatch', value: 'Not possible — live plants are already travelling.' },
      { label: 'Returns', value: 'We do not take live plants back, for their sake and yours.' },
    ],
  },
  {
    // Page-local copy: privacy has no SITE_POLICY entry.
    id: 'privacy',
    eyebrow: 'Privacy',
    title: 'What we keep',
    rows: [
      { label: 'We store', value: 'Name, phone, address, order history.' },
      { label: 'We use it for', value: 'Packing and delivering your order.' },
      { label: 'We never', value: 'Sell or share it with anyone.' },
      { label: 'Deleting it', value: 'Ask on WhatsApp and we remove it.' },
    ],
  },
];

function PolicyCard({ id, anchorId, eyebrow, title, rows }) {
  return (
    <section id={id} className="rounded-[28px] bg-[var(--bg-secondary)] p-5">
      {anchorId && <span id={anchorId} className="block" aria-hidden="true" />}
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
        {eyebrow}
      </p>
      <h2 className="mb-3 font-display text-xl text-[var(--text-primary)]">{title}</h2>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-[11px]">
            <dt className="w-[106px] shrink-0 text-[13px] text-[var(--text-secondary)]">{row.label}</dt>
            <dd className="flex-1 text-right text-[13px] font-semibold leading-[1.5] text-[var(--text-primary)]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function PoliciesPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl pb-8">
      <SEO
        title="Shipping, Returns and Plant Delivery Policies"
        description="Shipping, dispatch, payment, replacement, refund, and WhatsApp support policies for live plants ordered from Rosary Plant House, Coonoor."
        canonicalUrl="https://rosaryplanthouse.com/policies"
        schemaData={policySchema}
      />

      <PageBar title="Policies" asHeading={false} />

      <h1 className="font-display text-[27px] leading-[1.08] text-[var(--text-primary)]">
        The terms, plainly
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        Nothing here is buried and nothing changes after you pay.
      </p>

      <div className="mt-5 space-y-3">
        {POLICY_CARDS.map((card) => (
          <PolicyCard key={card.id} {...card} />
        ))}

        <div className="rounded-[28px] bg-[var(--color-accent-200)] p-5">
          <p className="mb-1.5 font-display text-lg text-[var(--color-accent-900)]">Something unclear?</p>
          <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-accent-800)]">
            Ask before you order rather than after. We will put it in writing on WhatsApp.
          </p>
          <WhatsAppButton href={policyWhatsAppLink} tone="accent">
            Ask about a policy
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}
