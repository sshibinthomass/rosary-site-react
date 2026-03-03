import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllOrders } from '../services/orderService';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminPlantAnalysis() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState(['all']);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders for plant analysis', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const toggleStatus = (value) => {
    // Handle "All" as special case
    if (value === 'all') {
      setSelectedStatuses(['all']);
      return;
    }

    setSelectedStatuses((prev) => {
      const withoutAll = prev.filter((s) => s !== 'all');
      if (withoutAll.includes(value)) {
        const next = withoutAll.filter((s) => s !== value);
        return next.length === 0 ? ['all'] : next;
      }
      return [...withoutAll, value];
    });
  };

  const activeStatuses = useMemo(() => {
    if (selectedStatuses.includes('all')) {
      return null; // null means "no filter", include all
    }
    return selectedStatuses;
  }, [selectedStatuses]);

  const plantStats = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const statsMap = new Map();

    for (const order of orders) {
      if (activeStatuses && !activeStatuses.includes(order.status)) {
        continue;
      }

      const items = order.items || [];
      for (const item of items) {
        const key = item.productId || item.name || 'Unknown';
        const existing = statsMap.get(key) || {
          productId: item.productId || null,
          name: item.name || 'Unknown plant',
          totalQuantity: 0,
          orderCount: 0,
        };

        existing.totalQuantity += item.quantity || 0;
        existing.orderCount += 1;

        statsMap.set(key, existing);
      }
    }

    const result = Array.from(statsMap.values());
    result.sort((a, b) => b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name));
    return result;
  }, [orders, activeStatuses]);

  const totalQuantityAll = plantStats.reduce((sum, p) => sum + p.totalQuantity, 0);

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-forest)]">Plant analysis</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            View how many of each plant has been sold, filtered by order status.
          </p>
        </div>
        <NavLink to="/admin" className="btn btn-secondary text-sm">
          ← Back
        </NavLink>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Order status</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Multi-select to include multiple statuses in the analysis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => {
              const isActive = selectedStatuses.includes(status.value);
              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => toggleStatus(status.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-[var(--color-forest)] text-white border-[var(--color-forest)] shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Plants counted
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {plantStats.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Total quantity
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {totalQuantityAll}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            Loading plant analysis...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : plantStats.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            No plants found for the selected statuses.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Plant</th>
                  <th className="px-4 py-2 font-medium text-right">Total Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {plantStats.map((plant) => (
                  <tr key={plant.productId || plant.name}>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--text-primary)]">
                          {plant.name}
                        </span>
                        {plant.productId && (
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                            ID: {plant.productId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--text-primary)]">
                      {plant.totalQuantity}
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                      {plant.orderCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

