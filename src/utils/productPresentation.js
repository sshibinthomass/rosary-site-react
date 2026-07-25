function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function getStorefrontProductTitle(product = {}) {
  const safeProduct = product || {};
  const title = compactText(safeProduct.title)
    || compactText(safeProduct.commonName)
    || compactText(safeProduct.name)
    || 'Plant';
  const size = compactText(safeProduct.size);

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
