import { useState } from 'react';
import SEO from '../components/SEO';
import { buildCustomerFaqSections } from '../utils/siteSeo';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)] mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <span>{question}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      <div 
        className={`px-4 text-[var(--text-secondary)] text-sm transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 py-4 border-t border-[var(--border-color)]' : 'max-h-0 overflow-hidden'
        }`}
      >
        {answer}
      </div>
    </div>
  );
};

export default function FAQPage() {
  const faqs = buildCustomerFaqSections();

  // Generate FAQ Schema dynamically
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.flatMap(category => 
      category.items.map(item => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    )
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-8 pb-20">
      <SEO 
        title="Help & FAQ" 
        description="Find answers to all your questions about ordering, shipping, and caring for succulents, cacti, and indoor plants from Rosary Plant House." 
        canonicalUrl="https://rosaryplanthouse.com/faq"
        schemaData={faqSchema}
      />
      <div className="text-center">
        <span className="text-4xl">🤔</span>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">Help & FAQ</h1>
        <p className="text-[var(--text-secondary)] mt-1">Common questions and our policies</p>
      </div>

      {faqs.map((section, idx) => (
        <section key={idx} className="animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-[var(--color-terracotta)] rounded-full"></span>
            {section.category}
          </h2>
          <div>
            {section.items.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
