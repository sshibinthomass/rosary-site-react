export function normalizeOrderDate(createdAt) {
  if (!createdAt) return null;

  const value = typeof createdAt.toDate === 'function' ? createdAt.toDate() : createdAt;
  let date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getEndOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getStartOfWeek(date) {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function normalizeBoundaryDate(value, boundary) {
  if (!value) return null;
  const date = normalizeOrderDate(value);
  if (!date) return null;

  return boundary === 'end' ? getEndOfDay(date) : getStartOfDay(date);
}

export function isOrderInTimeframe(order, timeframe, now = new Date(), range = {}) {
  if (timeframe === 'overall') {
    return true;
  }

  const orderDate = normalizeOrderDate(order?.createdAt);
  if (!orderDate) {
    return false;
  }

  const current = now instanceof Date ? now : new Date(now);

  if (timeframe === 'daily') {
    return getStartOfDay(orderDate).getTime() === getStartOfDay(current).getTime();
  }

  if (timeframe === 'weekly') {
    return getStartOfWeek(orderDate).getTime() === getStartOfWeek(current).getTime();
  }

  if (timeframe === 'monthly') {
    return (
      orderDate.getFullYear() === current.getFullYear()
      && orderDate.getMonth() === current.getMonth()
    );
  }

  if (timeframe === 'custom') {
    const start = normalizeBoundaryDate(range.startDate, 'start');
    const end = normalizeBoundaryDate(range.endDate, 'end');

    if (start && orderDate < start) {
      return false;
    }

    if (end && orderDate > end) {
      return false;
    }

    return Boolean(start || end);
  }

  return true;
}

export function filterOrdersForPlantAnalysis(
  orders,
  activeStatuses,
  timeframe = 'overall',
  now = new Date(),
  range = {}
) {
  return (orders || []).filter((order) => {
    if (activeStatuses && !activeStatuses.includes(order.status)) {
      return false;
    }

    return isOrderInTimeframe(order, timeframe, now, range);
  });
}

function normalizeLookupValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getProductName(product) {
  return product?.name || product?.title || product?.commonName || 'Unknown plant';
}

function getProductImage(product) {
  const imageUrls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
  return product?.imageUrl || imageUrls[0] || '';
}

function addProductLookup(map, value, product) {
  const normalized = normalizeLookupValue(value);
  if (normalized && !map.has(normalized)) {
    map.set(normalized, product);
  }
}

function createProductLookup(products) {
  const byId = new Map();
  const byName = new Map();

  for (const product of products || []) {
    addProductLookup(byId, product?.id, product);
    addProductLookup(byName, product?.name, product);
    addProductLookup(byName, product?.title, product);
    addProductLookup(byName, product?.commonName, product);
  }

  return { byId, byName };
}

function findProductForItem(item, productLookup) {
  return productLookup.byId.get(normalizeLookupValue(item?.productId))
    || productLookup.byId.get(normalizeLookupValue(item?.id))
    || productLookup.byName.get(normalizeLookupValue(item?.name));
}

function getProductMetadata(product) {
  if (!product) return {};

  return {
    available: product.available ?? true,
    qtyAvailable: product.qtyAvailable ?? '',
  };
}

function markPurchasedProduct(item, product, purchased) {
  addProductLookup(purchased.byId, item?.productId, true);
  addProductLookup(purchased.byId, item?.id, true);
  addProductLookup(purchased.byId, product?.id, true);
  addProductLookup(purchased.byName, item?.name, true);
  addProductLookup(purchased.byName, product?.name, true);
  addProductLookup(purchased.byName, product?.title, true);
  addProductLookup(purchased.byName, product?.commonName, true);
}

function isPurchasedProduct(product, purchased) {
  return purchased.byId.has(normalizeLookupValue(product?.id))
    || purchased.byName.has(normalizeLookupValue(product?.name))
    || purchased.byName.has(normalizeLookupValue(product?.title))
    || purchased.byName.has(normalizeLookupValue(product?.commonName));
}

function createUnboughtPlantRow(product) {
  return {
    productId: product?.id || null,
    name: getProductName(product),
    imageUrl: getProductImage(product),
    totalQuantity: 0,
    orderCount: 0,
    ...getProductMetadata(product),
  };
}

function sortPlantRows(rows) {
  return rows.sort((a, b) => b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name));
}

function getPlantStatsFilters(options) {
  if (typeof options === 'string') {
    if (options === 'unbought') {
      return { purchaseFilter: 'unbought', availabilityFilter: 'all' };
    }

    if (options === 'available' || options === 'unavailable') {
      return { purchaseFilter: 'bought', availabilityFilter: options };
    }

    return { purchaseFilter: 'bought', availabilityFilter: 'all' };
  }

  return {
    purchaseFilter: options?.purchaseFilter || 'bought',
    availabilityFilter: options?.availabilityFilter || 'all',
  };
}

function filterRowsByAvailability(rows, availabilityFilter) {
  if (availabilityFilter === 'available') {
    return rows.filter((plant) => plant.available === true);
  }

  if (availabilityFilter === 'unavailable') {
    return rows.filter((plant) => plant.available === false);
  }

  return rows;
}

export function buildPlantStats(orders, products = [], options = 'all') {
  const statsMap = new Map();
  const productLookup = createProductLookup(products);
  const purchased = { byId: new Map(), byName: new Map() };
  const hasProducts = (products || []).length > 0;
  const { purchaseFilter, availabilityFilter } = getPlantStatsFilters(options);

  for (const order of orders || []) {
    for (const item of order.items || []) {
      const product = findProductForItem(item, productLookup);
      const key = item.productId || item.id || product?.id || item.name || 'Unknown';
      const productImage = getProductImage(product);
      const existing = statsMap.get(key) || {
        productId: item.productId || item.id || product?.id || null,
        name: item.name || getProductName(product),
        imageUrl: item.imageUrl || productImage || '',
        totalQuantity: 0,
        orderCount: 0,
        ...(hasProducts ? getProductMetadata(product) : {}),
      };

      if (!existing.imageUrl && item.imageUrl) {
        existing.imageUrl = item.imageUrl;
      }

      if (!existing.imageUrl && productImage) {
        existing.imageUrl = productImage;
      }

      existing.totalQuantity += item.quantity || 0;
      existing.orderCount += 1;
      markPurchasedProduct(item, product, purchased);

      statsMap.set(key, existing);
    }
  }

  const soldRows = sortPlantRows(Array.from(statsMap.values()));

  if (purchaseFilter === 'unbought') {
    return filterRowsByAvailability(
      sortPlantRows(
        (products || [])
          .filter((product) => !isPurchasedProduct(product, purchased))
          .map(createUnboughtPlantRow)
      ),
      availabilityFilter
    );
  }

  if (purchaseFilter === 'all') {
    return filterRowsByAvailability(
      sortPlantRows([
        ...soldRows,
        ...(products || [])
          .filter((product) => !isPurchasedProduct(product, purchased))
          .map(createUnboughtPlantRow),
      ]),
      availabilityFilter
    );
  }

  return filterRowsByAvailability(soldRows, availabilityFilter);
}
