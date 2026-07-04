export const DEFAULT_ANALYSIS_TAB = 'plants';

export const ANALYSIS_TABS = [
  {
    id: 'plants',
    label: 'Plant analysis',
    description: 'Filter bought and unbought plants by availability, status, and timeframe.',
  },
  {
    id: 'orders',
    label: 'Order analysis',
    description: 'See state-wise order counts and gross income.',
  },
  {
    id: 'wishlist',
    label: 'Wishlist analysis',
    description: 'See which plants are saved by individual users.',
  },
  {
    id: 'cart',
    label: 'Cart analysis',
    description: 'See which plants are sitting in individual user carts.',
  },
  {
    id: 'revenue',
    label: 'Revenue analysis',
    description: 'Track revenue, delivery charges, discounts, and monthly totals.',
  },
  {
    id: 'product-demand',
    label: 'Product demand analysis',
    description: 'Compare sold quantity, cart demand, and wishlist saves by plant.',
  },
  {
    id: 'users',
    label: 'User analysis',
    description: 'Review user order, cart, and wishlist activity.',
  },
  {
    id: 'location',
    label: 'Location analysis',
    description: 'Break down orders and revenue by state and district.',
  },
  {
    id: 'stock-sales',
    label: 'Stock/sales analysis',
    description: 'Compare stock availability with sales, cart, and wishlist demand.',
  },
  {
    id: 'order-status',
    label: 'Order status analysis',
    description: 'Review order counts and revenue across each status.',
  },
  {
    id: 'customer-value',
    label: 'Customer value analysis',
    description: 'Rank customers by spend, repeat orders, and average order value.',
  },
];

const VALID_ANALYSIS_TABS = new Set(ANALYSIS_TABS.map((tab) => tab.id));

export function normalizeAnalysisTab(tab) {
  return VALID_ANALYSIS_TABS.has(tab) ? tab : DEFAULT_ANALYSIS_TAB;
}

export function getAnalysisRoute(tab = DEFAULT_ANALYSIS_TAB) {
  const normalizedTab = normalizeAnalysisTab(tab);

  if (normalizedTab === DEFAULT_ANALYSIS_TAB) {
    return '/admin/analysis';
  }

  return `/admin/analysis?tab=${normalizedTab}`;
}
