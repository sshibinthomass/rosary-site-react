import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalysisRoute } from '../utils/adminAnalysisTabs';

const ADMIN_ICON_PATHS = Object.freeze({
  orders: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 3.5h6" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M14.5 19.5a4.2 4.2 0 0 1 6-3.7" />
    </>
  ),
  products: (
    <>
      <path d="M5 19c8 0 14-6 14-14V4h-1C10 4 4 10 4 18v1h1Z" />
      <path d="M4 20c3.5-4.5 8-7 13-8" />
    </>
  ),
  analysis: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-9" />
    </>
  ),
  limited: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  export: (
    <>
      <path d="M12 3v11" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      <path d="M9 17h6" />
    </>
  ),
  'plant-tester': (
    <>
      <path d="M10 3h4" />
      <path d="M11 3v5.5l-5.6 8.9A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.1-3.6L13 8.5V3" />
      <path d="M8.5 15h7" />
      <path d="M9.5 18h5" />
    </>
  ),
  settings: (
    <>
      <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.3a2 2 0 0 1-1 1.7l-.4.2a2 2 0 0 1-2 0L6.1 6a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.3.2a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.3.2a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.3-.2a2 2 0 0 1 2 0l.4.2a2 2 0 0 1 1 1.7v.3a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.3a2 2 0 0 1 1-1.7l.4-.2a2 2 0 0 1 2 0l.3.2a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.3-.2a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.3-.2a2 2 0 0 0 .7-2.7l-.2-.4A2 2 0 0 0 18 6l-.3.2a2 2 0 0 1-2 0l-.4-.2a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )
});

function AdminIcon({ name, className = 'h-5 w-5' }) {
  const iconPath = ADMIN_ICON_PATHS[name];

  if (!iconPath) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={`inline-block flex-shrink-0 text-[var(--text-primary)] ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      {iconPath}
    </svg>
  );
}

const cards = [
  {
    id: 'orders',
    title: 'Orders',
    description: 'View, filter and manage all customer orders.',
    icon: 'orders',
    path: '/admin/orders',
  },
  {
    id: 'users',
    title: 'Users',
    description: 'Manage registered customers and their access.',
    icon: 'users',
    path: '/admin/users',
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Add, edit and organize all plants.',
    icon: 'products',
    path: '/admin/products',
  },
  {
    id: 'analysis',
    title: 'Analysis',
    description: 'Switch between plant-wise and state-wise order insights.',
    icon: 'analysis',
    path: getAnalysisRoute('plants'),
  },
  {
    id: 'limited',
    title: 'Limited',
    description: 'Configure limited-stock special plants.',
    icon: 'limited',
    path: '/admin/limited',
  },
  {
    id: 'export',
    title: 'Export',
    description: 'Generate sharable catalogs and exports.',
    icon: 'export',
    path: '/admin/export',
  },
  {
    id: 'plant-tester',
    title: 'Plant Tester',
    description: 'Quickly look up plants by ID and preview them in a table.',
    icon: 'plant-tester',
    path: '/admin/plant-tester',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure site-wide display and behaviour options.',
    icon: 'settings',
    path: '/admin/settings',
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
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-secondary)]">
                  <AdminIcon name={card.icon} />
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {card.title}
                </h2>
              </div>
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--color-forest)]">
                Open &rarr;
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
