import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { getAllOrders } from '../services/orderService';
import { filterOrdersForPlantAnalysis } from '../utils/plantAnalysis';
import { buildStateOrderStats } from '../utils/orderAnalysis';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TIMEFRAME_OPTIONS = [
  {
    value: 'overall',
    label: 'Overall',
    summary: 'All matching orders',
    emptyState: 'No orders found for the selected statuses.',
  },
  {
    value: 'monthly',
    label: 'Monthly',
    summary: 'Current month',
    emptyState: 'No orders found for the selected statuses in the current month.',
  },
  {
    value: 'weekly',
    label: 'Weekly',
    summary: 'Current week',
    emptyState: 'No orders found for the selected statuses in the current week.',
  },
  {
    value: 'daily',
    label: 'Daily',
    summary: 'Today',
    emptyState: 'No orders found for the selected statuses today.',
  },
  {
    value: 'custom',
    label: 'Datewise',
    summary: 'Choose a date range',
    emptyState: 'Choose a start date or end date to see state-wise order analysis.',
  },
];

const INCOME_MODE_OPTIONS = [
  {
    value: 'final-paid',
    label: 'Final paid amount',
    summary: 'Total amount + delivery charge - manual discount',
  },
  {
    value: 'total-only',
    label: 'Total amount only',
    summary: 'Only the stored order total amount',
  },
];

function formatSelectedDate(dateString) {
  if (!dateString) return '';

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export default function AdminOrderAnalysis({ embedded = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState(['all']);
  const [selectedTimeframe, setSelectedTimeframe] = useState('overall');
  const [selectedIncomeMode, setSelectedIncomeMode] = useState('final-paid');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllOrders();
        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders for order analysis', err);
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const toggleStatus = (value) => {
    if (value === 'all') {
      setSelectedStatuses(['all']);
      return;
    }

    setSelectedStatuses((prev) => {
      const withoutAll = prev.filter((status) => status !== 'all');
      if (withoutAll.includes(value)) {
        const next = withoutAll.filter((status) => status !== value);
        return next.length === 0 ? ['all'] : next;
      }

      return [...withoutAll, value];
    });
  };

  const activeStatuses = useMemo(() => {
    if (selectedStatuses.includes('all')) {
      return null;
    }

    return selectedStatuses;
  }, [selectedStatuses]);

  const selectedTimeframeOption = useMemo(() => {
    return TIMEFRAME_OPTIONS.find((option) => option.value === selectedTimeframe) || TIMEFRAME_OPTIONS[0];
  }, [selectedTimeframe]);

  const selectedIncomeModeOption = useMemo(() => {
    return INCOME_MODE_OPTIONS.find((option) => option.value === selectedIncomeMode) || INCOME_MODE_OPTIONS[0];
  }, [selectedIncomeMode]);

  const isInvalidCustomRange = useMemo(() => {
    return (
      selectedTimeframe === 'custom'
      && Boolean(customStartDate)
      && Boolean(customEndDate)
      && customStartDate > customEndDate
    );
  }, [selectedTimeframe, customStartDate, customEndDate]);

  const selectedRangeSummary = useMemo(() => {
    if (selectedTimeframe !== 'custom') {
      return selectedTimeframeOption.summary;
    }

    if (customStartDate && customEndDate) {
      if (customStartDate === customEndDate) {
        return formatSelectedDate(customStartDate);
      }

      return `${formatSelectedDate(customStartDate)} to ${formatSelectedDate(customEndDate)}`;
    }

    if (customStartDate) {
      return `From ${formatSelectedDate(customStartDate)}`;
    }

    if (customEndDate) {
      return `Up to ${formatSelectedDate(customEndDate)}`;
    }

    return selectedTimeframeOption.summary;
  }, [selectedTimeframe, selectedTimeframeOption.summary, customStartDate, customEndDate]);

  const emptyStateMessage = useMemo(() => {
    if (selectedTimeframe !== 'custom') {
      return selectedTimeframeOption.emptyState;
    }

    if (isInvalidCustomRange) {
      return 'End date should be on or after the start date.';
    }

    if (!customStartDate && !customEndDate) {
      return selectedTimeframeOption.emptyState;
    }

    return 'No orders found for the selected statuses in this date range.';
  }, [
    selectedTimeframe,
    selectedTimeframeOption.emptyState,
    isInvalidCustomRange,
    customStartDate,
    customEndDate,
  ]);

  const filteredOrders = useMemo(() => {
    if (isInvalidCustomRange) {
      return [];
    }

    return filterOrdersForPlantAnalysis(
      orders,
      activeStatuses,
      selectedTimeframe,
      new Date(),
      {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    );
  }, [
    orders,
    activeStatuses,
    selectedTimeframe,
    customStartDate,
    customEndDate,
    isInvalidCustomRange,
  ]);

  const stateStats = useMemo(() => {
    return buildStateOrderStats(filteredOrders, selectedIncomeMode);
  }, [filteredOrders, selectedIncomeMode]);

  const totalGrossIncome = stateStats.reduce((sum, state) => sum + state.grossIncome, 0);

  return (
    <div className={embedded ? '' : 'animate-fade-in pb-20'}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-forest)]">Order analysis</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              View state-wise order counts and gross income, filtered by status and timeframe.
            </p>
          </div>
          <NavLink to="/admin" className="btn btn-secondary text-sm">
            &larr; Back
          </NavLink>
        </div>
      )}

      <div className="card p-4 mb-4">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Timeframe</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Switch between preset periods or use datewise filtering for a custom range.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIMEFRAME_OPTIONS.map((option) => {
              const isActive = selectedTimeframe === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedTimeframe(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-[var(--color-forest)] text-white border-[var(--color-forest)] shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {selectedTimeframe === 'custom' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1">
                Start date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)] mb-1">
                End date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="input text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Income mode</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Default is final paid amount, but you can switch to the raw order total only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {INCOME_MODE_OPTIONS.map((option) => {
              const isActive = selectedIncomeMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedIncomeMode(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-[var(--color-forest)] text-white border-[var(--color-forest)] shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid gap-4 lg:grid-cols-2 mb-4">
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Current period
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {selectedRangeSummary}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Income basis
            </p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {selectedIncomeModeOption.summary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              States counted
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {stateStats.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Orders matched
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {filteredOrders.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Gross income
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {CURRENCY}{totalGrossIncome.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            Loading order analysis...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : stateStats.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            {emptyStateMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium text-right">Orders</th>
                  <th className="px-4 py-2 font-medium text-right">Gross income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {stateStats.map((state) => (
                  <tr key={state.state}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--text-primary)]">
                        {state.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                      {state.orderCount}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                      {CURRENCY}{state.grossIncome.toLocaleString('en-IN')}
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
