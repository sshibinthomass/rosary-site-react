import { calculateOrderIncome, normalizeStateName } from './orderAnalysis.js';
import { normalizeOrderDate } from './plantAnalysis.js';

function round2(value) {
  return Math.round(value * 100) / 100;
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function quantityValue(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function isActiveOrder(order) {
  return order?.status !== 'cancelled';
}

function getActiveOrders(orders) {
  return (orders || []).filter(isActiveOrder);
}

function getProductId(item) {
  return String(item?.productId || item?.id || item?.name || 'Unknown');
}

function getProductName(item) {
  return item?.name || item?.title || item?.commonName || 'Unknown plant';
}

function getUserName(user) {
  return user?.displayName || user?.email || user?.uid || 'Unknown user';
}

function getCustomerKey(order) {
  const customer = order?.customer || {};
  return customer.userId || customer.email || customer.phone || customer.name || 'Unknown customer';
}

function getCustomerLabel(order, userMap = new Map()) {
  const customer = order?.customer || {};
  const user = customer.userId ? userMap.get(customer.userId) : null;
  return user?.displayName || customer.name || user?.email || customer.phone || 'Unknown customer';
}

function getUserKeyFromEntry(entry) {
  return entry?.user?.uid || entry?.user?.email || getUserName(entry?.user);
}

function getEntryQuantity(entry) {
  return quantityValue(entry?.item?.quantity);
}

function createProductRecord(productId, name = 'Unknown plant') {
  return {
    productId,
    name,
    soldQuantity: 0,
    cartQuantity: 0,
    wishlistSaves: 0,
  };
}

function addProductMetric(map, productId, name, field, amount) {
  const existing = map.get(productId) || createProductRecord(productId, name);
  if (existing.name === 'Unknown plant' && name) {
    existing.name = name;
  }
  existing[field] += amount;
  map.set(productId, existing);
}

function buildProductMetrics({ orders = [], cartEntries = [], wishlistEntries = [] }) {
  const map = new Map();

  for (const order of getActiveOrders(orders)) {
    for (const item of order.items || []) {
      addProductMetric(
        map,
        getProductId(item),
        getProductName(item),
        'soldQuantity',
        quantityValue(item.quantity)
      );
    }
  }

  for (const entry of cartEntries || []) {
    const item = entry.item || {};
    addProductMetric(
      map,
      getProductId(item),
      getProductName(item),
      'cartQuantity',
      getEntryQuantity(entry)
    );
  }

  for (const entry of wishlistEntries || []) {
    const item = entry.item || {};
    addProductMetric(
      map,
      getProductId(item),
      getProductName(item),
      'wishlistSaves',
      1
    );
  }

  return map;
}

export function buildRevenueAnalysis(orders = []) {
  const activeOrders = getActiveOrders(orders);
  const periodMap = new Map();

  let totalRevenue = 0;
  let deliveryCharges = 0;
  let discounts = 0;

  for (const order of activeOrders) {
    const revenue = calculateOrderIncome(order);
    const date = normalizeOrderDate(order.createdAt);
    const period = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'Unknown';
    const existing = periodMap.get(period) || {
      period,
      orderCount: 0,
      revenue: 0,
      averageOrderValue: 0,
    };

    totalRevenue += revenue;
    deliveryCharges += numberValue(order.deliveryCharge);
    discounts += numberValue(order.manualDiscount) + numberValue(order.discountAmount);
    existing.orderCount += 1;
    existing.revenue += revenue;
    existing.averageOrderValue = round2(existing.revenue / existing.orderCount);
    periodMap.set(period, existing);
  }

  return {
    summary: {
      totalRevenue,
      orderCount: activeOrders.length,
      averageOrderValue: activeOrders.length ? round2(totalRevenue / activeOrders.length) : 0,
      deliveryCharges,
      discounts,
    },
    rows: Array.from(periodMap.values()).sort((a, b) => b.period.localeCompare(a.period)),
  };
}

export function buildProductDemandAnalysis({ orders = [], cartEntries = [], wishlistEntries = [] } = {}) {
  const rows = Array.from(buildProductMetrics({ orders, cartEntries, wishlistEntries }).values())
    .map((row) => ({
      ...row,
      demandScore: row.soldQuantity * 3 + row.cartQuantity * 2 + row.wishlistSaves,
    }))
    .sort((a, b) => b.demandScore - a.demandScore || a.name.localeCompare(b.name));

  return {
    summary: {
      products: rows.length,
      totalSold: rows.reduce((sum, row) => sum + row.soldQuantity, 0),
      totalCartQuantity: rows.reduce((sum, row) => sum + row.cartQuantity, 0),
      totalWishlistSaves: rows.reduce((sum, row) => sum + row.wishlistSaves, 0),
    },
    rows,
  };
}

export function buildUserAnalysis({ users = [], orders = [], cartEntries = [], wishlistEntries = [] } = {}) {
  const rowMap = new Map(users.map((user) => [
    user.uid,
    {
      uid: user.uid,
      user: getUserName(user),
      email: user.email || '',
      orderCount: 0,
      totalValue: 0,
      cartItems: 0,
      wishlistItems: 0,
    },
  ]));

  for (const order of getActiveOrders(orders)) {
    const uid = order?.customer?.userId;
    if (!uid) continue;

    const row = rowMap.get(uid) || {
      uid,
      user: order.customer?.name || uid,
      email: '',
      orderCount: 0,
      totalValue: 0,
      cartItems: 0,
      wishlistItems: 0,
    };

    row.orderCount += 1;
    row.totalValue += calculateOrderIncome(order);
    rowMap.set(uid, row);
  }

  for (const entry of cartEntries || []) {
    const uid = getUserKeyFromEntry(entry);
    const row = rowMap.get(uid);
    if (row) {
      row.cartItems += 1;
    }
  }

  for (const entry of wishlistEntries || []) {
    const uid = getUserKeyFromEntry(entry);
    const row = rowMap.get(uid);
    if (row) {
      row.wishlistItems += 1;
    }
  }

  const rows = Array.from(rowMap.values()).sort(
    (a, b) => b.orderCount - a.orderCount
      || b.totalValue - a.totalValue
      || b.wishlistItems - a.wishlistItems
      || b.cartItems - a.cartItems
      || a.user.localeCompare(b.user)
  );

  return {
    summary: {
      totalUsers: users.length,
      orderingUsers: rows.filter((row) => row.orderCount > 0).length,
      usersWithCart: rows.filter((row) => row.cartItems > 0).length,
      usersWithWishlist: rows.filter((row) => row.wishlistItems > 0).length,
    },
    rows,
  };
}

export function buildLocationAnalysis(orders = []) {
  const locationMap = new Map();

  for (const order of getActiveOrders(orders)) {
    const customer = order.customer || {};
    const state = normalizeStateName(customer.state);
    const district = customer.district || 'Unknown';
    const location = `${state} / ${district}`;
    const existing = locationMap.get(location) || {
      location,
      state,
      district,
      orderCount: 0,
      revenue: 0,
    };

    existing.orderCount += 1;
    existing.revenue += calculateOrderIncome(order);
    locationMap.set(location, existing);
  }

  const rows = Array.from(locationMap.values()).sort(
    (a, b) => b.orderCount - a.orderCount || b.revenue - a.revenue || a.location.localeCompare(b.location)
  );

  return {
    summary: {
      locations: rows.length,
      states: new Set(rows.map((row) => row.state)).size,
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    },
    rows,
  };
}

function getProductAvailability(product) {
  return product?.available !== false;
}

function getStockStatus(product, metrics) {
  const available = getProductAvailability(product);
  const activeDemand = metrics.cartQuantity + metrics.wishlistSaves;
  const stockNumber = Number(product?.qtyAvailable);

  if (!available && activeDemand > 0) {
    return 'Unavailable with demand';
  }

  if (available && Number.isFinite(stockNumber) && stockNumber <= 0 && metrics.cartQuantity > 0) {
    return 'Out of stock with cart demand';
  }

  if (available && Number.isFinite(stockNumber) && stockNumber < metrics.soldQuantity) {
    return 'Stock below sold quantity';
  }

  return available ? 'Available' : 'Unavailable';
}

function getStockRiskRank(status) {
  if (status === 'Unavailable with demand') return 1;
  if (status === 'Out of stock with cart demand') return 2;
  if (status === 'Stock below sold quantity') return 3;
  if (status === 'Unavailable') return 4;
  return 5;
}

export function buildStockSalesAnalysis({ products = [], orders = [], cartEntries = [], wishlistEntries = [] } = {}) {
  const metrics = buildProductMetrics({ orders, cartEntries, wishlistEntries });
  const productMap = new Map(products.map((product) => [String(product.id), product]));

  for (const [productId, metric] of metrics) {
    if (!productMap.has(productId)) {
      productMap.set(productId, { id: productId, name: metric.name, available: true });
    }
  }

  const rows = Array.from(productMap.values()).map((product) => {
    const productId = String(product.id);
    const metric = metrics.get(productId) || createProductRecord(productId, getProductName(product));
    const available = getProductAvailability(product);
    const activeDemand = metric.cartQuantity + metric.wishlistSaves;
    const stockStatus = getStockStatus(product, metric);

    return {
      productId,
      name: getProductName(product),
      category: product.category || '',
      available,
      stockStatus,
      soldQuantity: metric.soldQuantity,
      cartQuantity: metric.cartQuantity,
      wishlistSaves: metric.wishlistSaves,
      activeDemand,
      qtyAvailable: product.qtyAvailable ?? '',
      riskRank: getStockRiskRank(stockStatus),
    };
  }).sort((a, b) => a.riskRank - b.riskRank
    || b.activeDemand - a.activeDemand
    || b.soldQuantity - a.soldQuantity
    || a.name.localeCompare(b.name));

  return {
    summary: {
      products: rows.length,
      unavailableWithDemand: rows.filter((row) => row.stockStatus === 'Unavailable with demand').length,
      outOfStockWithCartDemand: rows.filter((row) => row.stockStatus === 'Out of stock with cart demand').length,
      stockBelowSoldQuantity: rows.filter((row) => row.stockStatus === 'Stock below sold quantity').length,
    },
    rows,
  };
}

export function buildOrderStatusAnalysis(orders = []) {
  const statusMap = new Map();

  for (const order of orders || []) {
    const status = order.status || 'unknown';
    const existing = statusMap.get(status) || {
      status,
      orderCount: 0,
      revenue: 0,
      percentage: 0,
    };

    existing.orderCount += 1;
    existing.revenue += calculateOrderIncome(order);
    statusMap.set(status, existing);
  }

  const totalOrders = (orders || []).length;
  const statusOrder = new Map([
    ['pending', 1],
    ['confirmed', 2],
    ['shipped', 3],
    ['delivered', 4],
    ['cancelled', 5],
    ['unknown', 6],
  ]);

  const rows = Array.from(statusMap.values())
    .map((row) => ({
      ...row,
      percentage: totalOrders ? round2((row.orderCount / totalOrders) * 100) : 0,
    }))
    .sort((a, b) => b.orderCount - a.orderCount
      || (statusOrder.get(a.status) || 99) - (statusOrder.get(b.status) || 99)
      || a.status.localeCompare(b.status));

  return {
    summary: {
      totalOrders,
      statuses: rows.length,
      cancelledOrders: statusMap.get('cancelled')?.orderCount || 0,
    },
    rows,
  };
}

export function buildCustomerValueAnalysis({ users = [], orders = [] } = {}) {
  const userMap = new Map(users.map((user) => [user.uid, user]));
  const customerMap = new Map();

  for (const order of getActiveOrders(orders)) {
    const key = getCustomerKey(order);
    const existing = customerMap.get(key) || {
      customer: getCustomerLabel(order, userMap),
      customerKey: key,
      orderCount: 0,
      totalValue: 0,
      averageOrderValue: 0,
    };

    existing.orderCount += 1;
    existing.totalValue += calculateOrderIncome(order);
    existing.averageOrderValue = round2(existing.totalValue / existing.orderCount);
    customerMap.set(key, existing);
  }

  const rows = Array.from(customerMap.values()).sort(
    (a, b) => b.totalValue - a.totalValue || b.orderCount - a.orderCount || a.customer.localeCompare(b.customer)
  );

  return {
    summary: {
      customers: rows.length,
      repeatCustomers: rows.filter((row) => row.orderCount > 1).length,
      totalValue: rows.reduce((sum, row) => sum + row.totalValue, 0),
    },
    rows,
  };
}
