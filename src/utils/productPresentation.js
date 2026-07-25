function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function getStorefrontProductTitle(product = {}) {
  const title = compactText(product.title)
    || compactText(product.commonName)
    || compactText(product.name)
    || 'Plant';
  const size = compactText(product.size);

  return size && !title.toLocaleLowerCase('en-IN').includes(size.toLocaleLowerCase('en-IN'))
    ? `${title} – ${size}`
    : title;
}

export function withStorefrontProductTitle(product = {}) {
  return {
    ...product,
    name: getStorefrontProductTitle(product),
  };
}
