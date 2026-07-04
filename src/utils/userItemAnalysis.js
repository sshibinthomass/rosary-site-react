function normalizeQuantity(value, fallback = 1) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
}

function getUserLabel(user) {
  return user?.displayName || user?.email || user?.uid || 'Unknown user';
}

export function buildUserItemStats(entries, options = {}) {
  const quantityMode = options.quantityMode || 'quantity';
  const statsMap = new Map();

  for (const entry of entries || []) {
    const item = entry?.item || {};
    const user = entry?.user || {};
    const key = item.productId || item.id || item.name || 'Unknown';
    const quantity = quantityMode === 'entry' ? 1 : normalizeQuantity(item.quantity);
    const price = Number(item.price || item.salesPrice || 0);
    const existing = statsMap.get(key) || {
      productId: item.productId || item.id || null,
      name: item.name || item.title || item.commonName || 'Unknown plant',
      imageUrl: item.imageUrl || '',
      category: item.category || '',
      totalQuantity: 0,
      userCount: 0,
      entryCount: 0,
      totalValue: 0,
      users: [],
      userMap: new Map(),
    };

    if (!existing.imageUrl && item.imageUrl) {
      existing.imageUrl = item.imageUrl;
    }

    if (!existing.category && item.category) {
      existing.category = item.category;
    }

    existing.totalQuantity += quantity;
    existing.entryCount += 1;
    existing.totalValue += price * quantity;

    const userKey = user.uid || user.email || getUserLabel(user);
    const existingUser = existing.userMap.get(userKey) || {
      uid: user.uid || '',
      displayName: user.displayName || '',
      email: user.email || '',
      quantity: 0,
    };

    existingUser.quantity += quantity;
    existing.userMap.set(userKey, existingUser);
    existing.userCount = existing.userMap.size;
    statsMap.set(key, existing);
  }

  return Array.from(statsMap.values())
    .map(({ userMap, ...item }) => ({
      ...item,
      users: Array.from(userMap.values()),
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name));
}
