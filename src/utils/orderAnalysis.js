function titleCaseWords(value) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeStateName(value) {
  const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!normalized) {
    return 'Unknown';
  }

  return titleCaseWords(normalized);
}

export function calculateOrderIncome(order, incomeMode = 'final-paid') {
  const totalAmount = Number(order?.totalAmount || 0);

  if (incomeMode === 'total-only') {
    return totalAmount;
  }

  const deliveryCharge = Number(order?.deliveryCharge || 0);
  const manualDiscount = Number(order?.manualDiscount || 0);

  return totalAmount + deliveryCharge - manualDiscount;
}

export function buildStateOrderStats(orders, incomeMode = 'final-paid') {
  const statsMap = new Map();

  for (const order of orders || []) {
    const state = normalizeStateName(order?.customer?.state);
    const existing = statsMap.get(state) || {
      state,
      orderCount: 0,
      grossIncome: 0,
    };

    existing.orderCount += 1;
    existing.grossIncome += calculateOrderIncome(order, incomeMode);

    statsMap.set(state, existing);
  }

  return Array.from(statsMap.values()).sort(
    (a, b) => b.grossIncome - a.grossIncome || b.orderCount - a.orderCount || a.state.localeCompare(b.state)
  );
}
