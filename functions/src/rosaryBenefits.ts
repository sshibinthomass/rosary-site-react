export type PlantCategory = 'houseplant' | 'succulent' | 'cactus' | 'balcony';

export interface OrderItem { productId?: string | number; name?: string; quantity?: number }
export interface RosaryOrder { id: string; status?: string; items?: OrderItem[]; updatedAt?: unknown }
export interface ProductLink { speciesId: string; category: PlantCategory }
export interface ImportSuggestion {
  id: string;
  orderId: string;
  lineIndex: number;
  unitIndex: number;
  productId: string;
  speciesId: string;
  category: PlantCategory;
  nickname: string;
  status: 'available';
}
export interface Entitlement { expiresAt: string; creditedOrderIds: string[] }

const eligibleStatuses = new Set(['confirmed', 'processing', 'shipped', 'delivered', 'completed']);
const deliveredStatuses = new Set(['delivered', 'completed']);
const dayMs = 86_400_000;

export function buildImportSuggestions(orders: RosaryOrder[], links: Map<string, ProductLink>): ImportSuggestion[] {
  const suggestions: ImportSuggestion[] = [];
  for (const order of orders.filter((item) => eligibleStatuses.has(String(item.status)))) {
    for (const [lineIndex, item] of (order.items ?? []).entries()) {
      const productId = String(item.productId ?? '');
      const link = links.get(productId);
      if (!link) continue;
      const quantity = Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)));
      for (let unitIndex = 0; unitIndex < quantity; unitIndex += 1) {
        suggestions.push({
          id: `${order.id}_${lineIndex}_${unitIndex}`,
          orderId: order.id,
          lineIndex,
          unitIndex,
          productId,
          speciesId: link.speciesId,
          category: link.category,
          nickname: item.name?.trim() || 'Rosary plant',
          status: 'available',
        });
      }
    }
  }
  return suggestions;
}

export function buildEntitlement(order: RosaryOrder, existing: Entitlement | undefined, now: Date): Entitlement | undefined {
  if (!deliveredStatuses.has(String(order.status))) return existing;
  const current = existing ?? { expiresAt: now.toISOString(), creditedOrderIds: [] };
  if (current.creditedOrderIds.includes(order.id)) return current;
  const existingExpiry = new Date(current.expiresAt).getTime();
  const base = Math.max(now.getTime(), Number.isFinite(existingExpiry) ? existingExpiry : now.getTime());
  const cap = now.getTime() + 365 * dayMs;
  const expiresAt = new Date(Math.min(cap, base + 90 * dayMs)).toISOString();
  return { expiresAt, creditedOrderIds: [...current.creditedOrderIds, order.id] };
}
