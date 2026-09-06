import { WHATSAPP_NUMBER } from '../config/constants.js';

/** Builds a wa.me link with a pre-written message. */
export function buildWhatsAppLink(message) {
  const text = String(message ?? '').trim();
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** "Tell me when it is back" on a sold-out plant. */
export function buildRestockAlertMessage({ id, title } = {}) {
  const name = String(title ?? '').trim() || 'this plant';
  const reference = id ? ` (#${id})` : '';
  return `Hello Rosary Plant House, please tell me when ${name}${reference} is back on the bench.`;
}

/** "Ask the nursery" from the search dead end and the shop helper card. */
export function buildPlantAdviceMessage({ query, spot } = {}) {
  if (query) {
    return `Hello Rosary Plant House, I was looking for "${query}" on your site. Do you grow anything like it?`;
  }
  if (spot) {
    return `Hello Rosary Plant House, my plants will live here: ${spot}. Which three would you pick for me?`;
  }
  return 'Hello Rosary Plant House, could you help me pick a few plants that will suit my place?';
}

/** "Your plant looks unwell?" from the care guides. */
export function buildPlantHelpMessage({ title } = {}) {
  const name = String(title ?? '').trim();
  return name
    ? `Hello Rosary Plant House, my ${name} does not look well. I am sending a photo.`
    : 'Hello Rosary Plant House, my plant does not look well. I am sending a photo.';
}

/** "Ask about it" / "Still stuck?" with an order or support reference. */
export function buildOrderSupportMessage({ supportCode, orderId } = {}) {
  const reference = supportCode || orderId;
  return reference
    ? `Hello Rosary Plant House, I need help with my order ${reference}.`
    : 'Hello Rosary Plant House, I need help with an order.';
}

/** Contact page topic chips. */
export function buildContactTopicMessage(topic) {
  const label = String(topic ?? '').trim();
  return label
    ? `Hello Rosary Plant House, I have a question about ${label.toLowerCase()}.`
    : 'Hello Rosary Plant House, I have a question.';
}
