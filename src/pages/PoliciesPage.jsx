import SEO from '../components/SEO';
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

export default function PoliciesPage() {
  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      <SEO
        title="Shipping, Returns and Plant Delivery Policies"
        description="Shipping, dispatch, payment, replacement, refund, and WhatsApp support policies for live plants ordered from Rosary Plant House, Coonoor."
        canonicalUrl="https://rosaryplanthouse.com/policies"
        schemaData={policySchema}
      />

      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-stretch mb-8">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase text-[var(--color-terracotta)] tracking-wide">
            Order confidence
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
            Shipping, returns and plant delivery policies
          </h1>
          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
            Clear dispatch, payment, delivery, and replacement details for live plants shipped from Rosary Plant House in Coonoor.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={SITE_POLICY.support.whatsAppUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
            <a href="/faq" className="btn btn-secondary">
              Read FAQ
            </a>
          </div>
        </div>

        <aside className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Quick policy facts</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Dispatch</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">Nearest {SITE_POLICY.shipping.dispatchDays} after payment</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Service area</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{SITE_POLICY.shipping.serviceArea}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Support</dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">{SITE_POLICY.support.whatsAppHours}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section id="standard-shipping" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Shipping and dispatch</h2>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
            <p>{SITE_POLICY.shipping.dispatchTiming}</p>
            <p>{SITE_POLICY.shipping.packaging}</p>
            <p>{SITE_POLICY.shipping.courier}</p>
            <p>{SITE_POLICY.shipping.deliveryCharge}</p>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Delivery ETA from dispatch</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SITE_POLICY.shipping.deliveryEtaFromDispatch.map((fact) => (
              <div key={fact.area} className="rounded-lg bg-[var(--bg-tertiary)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{fact.area}</p>
                <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{fact.eta}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="transit-damage-policy" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Damage, replacement and refund</h2>
          <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
            <p>{SITE_POLICY.damageSupport.replacement}</p>
            <p>{SITE_POLICY.damageSupport.proof}</p>
            <p>{SITE_POLICY.damageSupport.refund}</p>
            <p>{SITE_POLICY.damageSupport.exclusions}</p>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Payment and support</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-[var(--text-primary)]">Payment methods</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">{SITE_POLICY.payment.methods.join(', ')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--text-primary)]">Cash on delivery</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">{SITE_POLICY.payment.cod}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--text-primary)]">WhatsApp support</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">{SITE_POLICY.support.whatsAppHours}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
