import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CURRENCY } from '../config/constants';
import { getAllUserItemEntries } from '../services/userItemAnalysisService';
import { resolveImageUrl } from '../utils/imageCompressor';
import { buildUserItemStats } from '../utils/userItemAnalysis';

const ANALYSIS_CONFIG = {
  wishlist: {
    title: 'Wishlist analysis',
    description: 'See which plants individual users have saved for later.',
    loadingText: 'Loading wishlist analysis...',
    emptyText: 'No wishlist items found for users.',
    quantityMode: 'entry',
    quantityLabel: 'Wishlist saves',
    usersWithItemsLabel: 'Users with wishlist',
    tableQuantityLabel: 'Saves',
    valueLabel: 'Saved value',
  },
  cart: {
    title: 'Cart analysis',
    description: 'See which plants are currently in individual user carts.',
    loadingText: 'Loading cart analysis...',
    emptyText: 'No cart items found for users.',
    quantityMode: 'quantity',
    quantityLabel: 'Total quantity',
    usersWithItemsLabel: 'Users with cart items',
    tableQuantityLabel: 'Total qty',
    valueLabel: 'Cart value',
  },
};

function getUserName(user) {
  return user.displayName || user.email || user.uid || 'Unknown user';
}

function UserList({ users }) {
  const visibleUsers = users.slice(0, 3);
  const remainingCount = users.length - visibleUsers.length;

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {visibleUsers.map((user) => (
        <NavLink
          key={user.uid || user.email}
          to={`/admin/users?userId=${encodeURIComponent(user.uid)}`}
          className="max-w-[11rem] truncate rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title={user.email || user.displayName || user.uid}
        >
          {getUserName(user)}
          {user.quantity > 1 ? ` x${user.quantity}` : ''}
        </NavLink>
      ))}
      {remainingCount > 0 && (
        <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

export default function AdminUserItemAnalysis({ type = 'wishlist', embedded = false }) {
  const config = ANALYSIS_CONFIG[type] || ANALYSIS_CONFIG.wishlist;
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getAllUserItemEntries(type);
        if (!active) return;
        setUsers(data.users);
        setEntries(data.entries);
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

  const itemStats = useMemo(() => {
    return buildUserItemStats(entries, { quantityMode: config.quantityMode });
  }, [entries, config.quantityMode]);

  const usersWithItems = useMemo(() => {
    return new Set(entries.map((entry) => entry.user?.uid).filter(Boolean)).size;
  }, [entries]);

  const totalQuantity = itemStats.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalValue = itemStats.reduce((sum, item) => sum + item.totalValue, 0);

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
            Current user data
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Live {type} items saved under individual user accounts.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Users scanned
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{users.length}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {config.usersWithItemsLabel}
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{usersWithItems}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              Plants counted
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{itemStats.length}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {config.quantityLabel}
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">{totalQuantity}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {config.valueLabel}
            </p>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {CURRENCY}{totalValue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            {config.loadingText}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : itemStats.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-secondary)] text-sm">
            {config.emptyText}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Plant</th>
                  <th className="px-4 py-2 font-medium text-right">Users</th>
                  <th className="px-4 py-2 font-medium text-right">{config.tableQuantityLabel}</th>
                  <th className="px-4 py-2 font-medium text-right">{config.valueLabel}</th>
                  <th className="px-4 py-2 font-medium text-right">Individual users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {itemStats.map((item) => (
                  <tr key={item.productId || item.name}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImageUrl(item.imageUrl) || '/placeholder-plant.jpg'}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-[var(--bg-tertiary)] flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
                            {item.productId ? `ID: ${item.productId}` : 'No product ID'}
                            {item.category ? ` / ${item.category}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--text-primary)]">
                      {item.userCount}
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--text-primary)]">
                      {item.totalQuantity}
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--text-primary)]">
                      {CURRENCY}{item.totalValue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <UserList users={item.users} />
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
