import { useState } from 'react';
import Icon from '../components/Icon';
import SEO from '../components/SEO';
import { ListRow, PageBar } from '../components/storefront';
import {
  FACEBOOK_URL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  NURSERY_ADDRESS_LINES,
  NURSERY_EMAIL,
  NURSERY_HOURS,
  NURSERY_MAP_URL,
  NURSERY_PHONE_DISPLAY,
  NURSERY_PHONE_TEL,
  YOUTUBE_URL,
} from '../config/constants';
import {
  buildContactTopicMessage,
  buildOrderSupportMessage,
  buildWhatsAppLink,
} from '../utils/nurseryMessages';

const NURSERY_PHOTO = '/home/browse-every-plant-natural-900.webp';
const ALTERNATE_EMAIL = 'sshibinthomass@gmail.com';
const ORDER_CODE_PREFIX = 'RPH-';

const TOPICS = ['An existing order', 'Choosing a plant', 'A sick plant', 'Bulk or gifting'];

/**
 * The whole row is the link, so an anchor here would nest. Underline the detail
 * instead, so a phone number or handle reads as something you can tap.
 */
function LinkedDetail({ children }) {
  return <span className="underline underline-offset-2">{children}</span>;
}

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Rosary Plant House",
  "image": "https://rosaryplanthouse.com/hero-bg.jpg",
  "telephone": "+91 7904050237",
  "email": "rosaryplanthouse@gmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Samayapuram, Alwarpet",
    "addressLocality": "Coonoor, The Nilgiris",
    "addressRegion": "Tamil Nadu",
    "addressCountry": "IN"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "09:00",
    "closes": "21:00"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "telephone": "+91 7904050237",
    "availableLanguage": "English",
    "hoursAvailable": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "09:00",
      "closes": "21:00"
    }
  },
  "sameAs": [
    "https://instagram.com/rosary_plant_house",
    "https://facebook.com/rosaryplanthouse",
    "https://youtube.com/channel/UCUYHYgkyhoVXy5_h8a5ly6w"
  ]
};

export default function ContactPage() {
  const [orderCode, setOrderCode] = useState('');

  const openOrderChat = (event) => {
    event.preventDefault();
    const code = orderCode.trim().toUpperCase();
    const message = buildOrderSupportMessage(
      code ? { supportCode: `${ORDER_CODE_PREFIX}${code}` } : {}
    );
    window.open(buildWhatsAppLink(message), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl pb-8">
      <SEO
        title="Contact Us"
        description="Get in touch with Rosary Plant House. Reach us on WhatsApp at +91 79040 50237, Instagram, or visit our nursery in Coonoor, Nilgiris."
        canonicalUrl="https://rosaryplanthouse.com/contact"
        schemaData={contactSchema}
      />

      <PageBar title="Contact" asHeading={false} />

      <h1 className="font-display text-[27px] leading-[1.08] text-[var(--text-primary)]">
        Talk to the nursery
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        The same people who grow the plants answer the messages. Every day, 9 AM to 9 PM.
      </p>

      <div className="mt-5 rounded-[28px] bg-[#7a8a5e] p-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)]">
            <Icon name="whatsapp" filled className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight text-[#f9f4ed]">WhatsApp</p>
            <p className="mt-0.5 text-xs text-[var(--color-sage-100)]">
              Fastest — usually within the hour
            </p>
          </div>
        </div>
        <a
          href={buildWhatsAppLink('Hello Rosary Plant House, I have a question.')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-sage-100)] font-display text-base text-[var(--color-sage-900)] transition-opacity hover:opacity-90"
        >
          {NURSERY_PHONE_DISPLAY}
        </a>
      </div>

      <div className="mt-2.5 space-y-2.5">
        <ListRow
          icon="phone"
          title="Call us"
          subtitle={<><LinkedDetail>{NURSERY_PHONE_DISPLAY}</LinkedDetail> · {NURSERY_HOURS}</>}
          href={`tel:${NURSERY_PHONE_TEL}`}
        />
        <ListRow
          icon="mail"
          title="Email"
          subtitle={<LinkedDetail>{NURSERY_EMAIL}</LinkedDetail>}
          href={`mailto:${NURSERY_EMAIL}`}
        />
        <ListRow
          icon="instagram"
          title="Instagram"
          subtitle={<LinkedDetail>{INSTAGRAM_HANDLE}</LinkedDetail>}
          href={INSTAGRAM_URL}
        />
        <ListRow
          icon="facebook"
          title="Facebook"
          subtitle={<LinkedDetail>Rosary Plant House</LinkedDetail>}
          href={FACEBOOK_URL}
        />
        <ListRow
          icon="youtube"
          title="YouTube"
          subtitle={<LinkedDetail>Nursery videos and shorts</LinkedDetail>}
          href={YOUTUBE_URL}
        />
      </div>
      <p className="mt-2.5 px-1 text-xs text-[var(--text-secondary)]">
        You can also write to{' '}
        <a href={`mailto:${ALTERNATE_EMAIL}`} className="font-semibold underline">
          {ALTERNATE_EMAIL}
        </a>
        .
      </p>

      <h2 className="mb-3 mt-8 font-display text-[21px] text-[var(--text-primary)]">
        What are you asking about?
      </h2>
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <a
            key={topic}
            href={buildWhatsAppLink(buildContactTopicMessage(topic))}
            target="_blank"
            rel="noopener noreferrer"
            className="chip"
          >
            {topic}
          </a>
        ))}
      </div>

      <form onSubmit={openOrderChat} className="mt-3 rounded-[24px] bg-[var(--bg-secondary)] p-[18px]">
        <label htmlFor="order-code" className="block text-[13px] leading-relaxed text-[var(--text-secondary)]">
          Have your order code ready and we can pull it up straight away.
        </label>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex min-h-11 flex-1 items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-[18px]">
            <span className="text-sm tracking-[0.06em] text-[var(--text-muted)]">{ORDER_CODE_PREFIX}</span>
            <input
              id="order-code"
              value={orderCode}
              onChange={(event) => setOrderCode(event.target.value)}
              placeholder="0000"
              autoComplete="off"
              className="min-w-0 flex-1 border-none bg-transparent text-sm tracking-[0.06em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <button type="submit" className="btn btn-primary shrink-0">
            <Icon name="whatsapp" filled className="h-[17px] w-[17px]" />
            Ask
          </button>
        </div>
      </form>

      <h2 className="mb-3 mt-8 font-display text-[21px] text-[var(--text-primary)]">The nursery</h2>
      <div className="overflow-hidden rounded-[28px] bg-[var(--bg-secondary)]">
        <img
          src={NURSERY_PHOTO}
          alt="The Rosary Plant House nursery at Coonoor"
          loading="lazy"
          className="washed block h-[150px] w-full object-cover"
        />
        <div className="p-5">
          <p className="mb-1.5 text-[15px] font-bold text-[var(--text-primary)]">
            {NURSERY_ADDRESS_LINES[0]}
          </p>
          <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {NURSERY_ADDRESS_LINES[1]}
          </p>
          <a
            href={NURSERY_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Get directions
          </a>
        </div>
      </div>
    </div>
  );
}
