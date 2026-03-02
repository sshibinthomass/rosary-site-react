import React from 'react';
import { useNavigate } from 'react-router-dom';

const cards = [
  {
    id: 'orders',
    title: 'Orders',
    description: 'View, filter and manage all customer orders.',
    icon: '📋',
    path: '/admin/orders',
  },
  {
    id: 'users',
    title: 'Users',
    description: 'Manage registered customers and their access.',
    icon: '👥',
    path: '/admin/users',
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Add, edit and organize all plants.',
    icon: '🌿',
    path: '/admin/products',
  },
  {
    id: 'limited',
    title: 'Limited',
    description: 'Configure limited-stock special plants.',
    icon: '⚡',
    path: '/admin/limited',
  },
  {
    id: 'export',
    title: 'Export',
    description: 'Generate sharable catalogs and exports.',
    icon: '📤',
    path: '/admin/export',
  },
];

export default function AdminHome() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-forest)]">
          Admin
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Choose what you want to manage today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => navigate(card.path)}
            className="card group flex flex-col items-start p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] text-lg">
                  <span>{card.icon}</span>
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {card.title}
                </h2>
              </div>
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--color-forest)]">
                Open →
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {card.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

