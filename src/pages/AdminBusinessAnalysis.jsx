import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { getBusinessAnalysisData } from '../services/businessAnalysisService';
import {
  buildCustomerValueAnalysis,
  buildLocationAnalysis,
  buildOrderStatusAnalysis,
  buildProductDemandAnalysis,
  buildRevenueAnalysis,
  buildStockSalesAnalysis,
  buildUserAnalysis,
} from '../utils/businessAnalysis';

const ANALYSIS_CONFIG = {
  revenue: {
    title: 'Revenue analysis',
    description: 'Revenue, delivery charges, discounts, and monthly totals from non-cancelled orders.',
    emptyText: 'No revenue found yet.',
    build: (data) => buildRevenueAnalysis(data.orders),
    summary: [
      ['Total revenue', 'totalRevenue', 'currency'],
      ['Orders counted', 'orderCount', 'number'],
      ['Average order value', 'averageOrderValue', 'currency'],
      ['Delivery charges', 'deliveryCharges', 'currency'],
      ['Discounts', 'discounts', 'currency'],
    ],
    columns: [
      ['Period', 'period'],
      ['Orders', 'orderCount', 'number', 'right'],
      ['Revenue', 'revenue', 'currency', 'right'],
      ['Average order', 'averageOrderValue', 'currency', 'right'],
    ],
  },
  'product-demand': {
    title: 'Product demand analysis',
    description: 'Plants ranked by sold quantity, active cart demand, and wishlist saves.',
    emptyText: 'No product demand found yet.',
    build: (data) => buildProductDemandAnalysis(data),
    summary: [
      ['Products', 'products', 'number'],
      ['Sold quantity', 'totalSold', 'number'],
      ['Cart quantity', 'totalCartQuantity', 'number'],
      ['Wishlist saves', 'totalWishlistSaves', 'number'],
    ],
    columns: [
      ['Plant', 'name'],
      ['ID', 'productId'],
      ['Sold', 'soldQuantity', 'number', 'right'],
      ['Cart qty', 'cartQuantity', 'number', 'right'],
      ['Wishlist', 'wishlistSaves', 'number', 'right'],
      ['Demand score', 'demandScore', 'number', 'right'],
    ],
  },
  users: {
    title: 'User analysis',
    description: 'User order, cart, and wishlist activity in one view.',
    emptyText: 'No users found.',
    build: (data) => buildUserAnalysis(data),
    summary: [
      ['Total users', 'totalUsers', 'number'],
      ['Ordering users', 'orderingUsers', 'number'],
      ['Users with cart', 'usersWithCart', 'number'],
      ['Users with wishlist', 'usersWithWishlist', 'number'],
    ],
    columns: [
      ['User', 'user'],
      ['Email', 'email'],
      ['Orders', 'orderCount', 'number', 'right'],
      ['Value', 'totalValue', 'currency', 'right'],
      ['Cart items', 'cartItems', 'number', 'right'],
      ['Wishlist items', 'wishlistItems', 'number', 'right'],
    ],
  },
  location: {
    title: 'Location analysis',
    description: 'Orders and revenue by state and district.',
    emptyText: 'No location data found.',
    build: (data) => buildLocationAnalysis(data.orders),
    summary: [
      ['Locations', 'locations', 'number'],
      ['States', 'states', 'number'],
      ['Revenue', 'revenue', 'currency'],
    ],
    columns: [
      ['Location', 'location'],
      ['State', 'state'],
      ['District', 'district'],
      ['Orders', 'orderCount', 'number', 'right'],
      ['Revenue', 'revenue', 'currency', 'right'],
    ],
  },
  'stock-sales': {
    title: 'Stock/sales analysis',
    description: 'Stock risk compared with sold quantity, carts, and wishlists.',
    emptyText: 'No stock or sales data found.',
    build: (data) => buildStockSalesAnalysis(data),
    summary: [
      ['Products', 'products', 'number'],
      ['Unavailable demand', 'unavailableWithDemand', 'number'],
      ['Out-of-stock cart demand', 'outOfStockWithCartDemand', 'number'],
      ['Stock below sold', 'stockBelowSoldQuantity', 'number'],
    ],
    columns: [
      ['Plant', 'name'],
      ['ID', 'productId'],
      ['Stock status', 'stockStatus'],
      ['Available', 'available', 'boolean'],
      ['Qty available', 'qtyAvailable'],
      ['Sold', 'soldQuantity', 'number', 'right'],
      ['Active demand', 'activeDemand', 'number', 'right'],
    ],
  },
  'order-status': {
    title: 'Order status analysis',
    description: 'Order counts, revenue, and percentage share by status.',
    emptyText: 'No orders found.',
    build: (data) => buildOrderStatusAnalysis(data.orders),
    summary: [
      ['Total orders', 'totalOrders', 'number'],
      ['Statuses', 'statuses', 'number'],
      ['Cancelled orders', 'cancelledOrders', 'number'],
    ],
    columns: [
      ['Status', 'status'],
      ['Orders', 'orderCount', 'number', 'right'],
      ['Revenue', 'revenue', 'currency', 'right'],
      ['Share', 'percentage', 'percent', 'right'],
    ],
  },
  'customer-value': {
    title: 'Customer value analysis',
    description: 'Customers ranked by total spend, repeat orders, and average order value.',
    emptyText: 'No customer value data found.',
    build: (data) => buildCustomerValueAnalysis(data),
    summary: [
      ['Customers', 'customers', 'number'],
      ['Repeat customers', 'repeatCustomers', 'number'],
      ['Total value', 'totalValue', 'currency'],
    ],
    columns: [
      ['Customer', 'customer'],
      ['Customer key', 'customerKey'],
      ['Orders', 'orderCount', 'number', 'right'],
      ['Total value', 'totalValue', 'currency', 'right'],
      ['Average order', 'averageOrderValue', 'currency', 'right'],
    ],
  },
};

function formatCell(value, type) {
  if (type === 'currency') {
    return `${CURRENCY}${Number(value || 0).toLocaleString('en-IN')}`;
  }

  if (type === 'percent') {
    return `${Number(value || 0).toLocaleString('en-IN')}%`;
  }

  if (type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (type === 'number') {
    return Number(value || 0).toLocaleString('en-IN');
  }

  return value || '-';
}

function SummaryCard({ label, value, type }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-base font-semibold text-[var(--text-primary)]">
        {formatCell(value, type)}
      </p>
    </div>
  );
}

export default function AdminBusinessAnalysis({ type = 'revenue', embedded = false }) {
  const config = ANALYSIS_CONFIG[type] || ANALYSIS_CONFIG.revenue;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const loadedData = await getBusinessAnalysisData();
        if (active) {
          setData(loadedData);
        }
      } catch (err) {
        console.error(`Failed to load ${type} analysis`, err);
        if (active) {
          setError(`Failed to load ${config.title.toLowerCase()}. Please try again.`);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [type, config.title]);

  const analysis = useMemo(() => {
    if (!data) {
      return { summary: {}, rows: [] };
    }

    return config.build(data);
  }, [config, data]);

  return (
    <div className={embedded ? '' : 'animate-fade-in pb-20'}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-forest)]">{config.title}</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{config.description}</p>
          </div>
          <NavLink to="/admin" className="btn btn-secondary text-sm">
            &larr; Back
          </NavLink>
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="mb-3">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Current analysis
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {config.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {config.summary.map(([label, key, valueType]) => (
            <SummaryCard
              key={key}
              label={label}
              value={analysis.summary[key]}
              type={valueType}
            />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            Loading {config.title.toLowerCase()}...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : analysis.rows.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            {config.emptyText}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs uppercase">
                <tr>
                  {config.columns.map((column) => {
                    const [label, key, , align] = column;

                    return (
                      <th
                        key={key}
                        className={`px-4 py-2 font-medium ${align === 'right' ? 'text-right' : ''}`}
                      >
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {analysis.rows.map((row, index) => (
                  <tr key={row.productId || row.customerKey || row.uid || row.location || row.status || row.period || index}>
                    {config.columns.map(([label, key, valueType, align]) => (
                      <td
                        key={`${label}-${key}`}
                        className={`px-4 py-3 text-[var(--text-primary)] ${align === 'right' ? 'text-right' : ''}`}
                      >
                        {formatCell(row[key], valueType)}
                      </td>
                    ))}
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
