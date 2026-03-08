import { useState } from 'react';
import SEO from '../components/SEO';

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
  const faqs = [
    {
      category: "Terms and Conditions",
      items: [
        { q: "Do you deliver to all parts of the country?", a: "Delivery limited due to Transportation Delay. But we deliver to all major part of the Country." },
        { q: "When will the plants be dispatched?", a: "Plants will be sent only after payment. Will be dispatched on nearest Monday or Wednesday if payment is made by previous Day." },
        { q: "How will the plants be sent?", a: "Plants will be sent bare-rooted. (packed with tissue, cotton and cocopeat depending on plants)" },
        { q: "What if \"I don't receive plants safe\"?", a: "Any Damage during transportation will be replaced with customer's next order. (If plants don't survive). High Transit Risk plants are not Replaceable." },
        { q: "What if \"I don't look after the plants after I receive, will it be replaced\"?", a: "After receiving the plants it's the customer's responsibility to take care of plants so it doesn't come under our replacement policy. Note: replacement policy is applicable only for transportation damage. Any requests on the day of receiving and the following day will surely be considered." },
        { q: "How will the plants be dispatched?", a: "Plants will be dispatched by DTDC (since it's fast and we have proper customer support). On customer request Speed post or Professional will be considered (delay should be taken care of by customer)." }
      ]
    },
    {
      category: "Frequently Asked Questions",
      items: [
        { q: "Where can I find the cost of plants?", a: "Size and cost are mentioned below each plant on the catalogue page." },
        { q: "What is the minimum quantity that can be ordered?", a: "Minimum of 5 plants is recommended. (minimum delivery charges is applicable for any number of plants)" },
        { q: "How can I choose plants?", a: "Add plants to your cart individually from the catalogue. You can also filter based on requirements. After adding, proceed to checkout to place your order." },
        { q: "Are delivery charges free?", a: "No, additional delivery charges are applicable depending on the location." },
        { q: "How can I complete payment?", a: "You can complete your payment through Gpay, PayTM, PhonePe or Netbanking (WhatsApp for further details)." },
        { q: "Where can I find succulent care?", a: "You can find specific care instructions for water, sunlight, and shipping on every individual plant's page." },
        { q: "Do you provide cash on delivery?", a: "No, we haven't introduced COD yet." },
        { q: "How can we trust you?", a: "Please check out our FB page and Instagram for feedbacks before purchasing. We're always open for your queries." }
      ]
    }
  ];

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
