import React, { useMemo } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import AdminBusinessAnalysis from './AdminBusinessAnalysis';
import AdminOrderAnalysis from './AdminOrderAnalysis';
import AdminPlantAnalysis from './AdminPlantAnalysis';
import AdminUserItemAnalysis from './AdminUserItemAnalysis';
import {
  ANALYSIS_TABS,
  DEFAULT_ANALYSIS_TAB,
  normalizeAnalysisTab,
} from '../utils/adminAnalysisTabs';

const ANALYSIS_PANELS = {
  plants: AdminPlantAnalysis,
  orders: AdminOrderAnalysis,
  wishlist: (props) => <AdminUserItemAnalysis {...props} type="wishlist" />,
  cart: (props) => <AdminUserItemAnalysis {...props} type="cart" />,
  revenue: (props) => <AdminBusinessAnalysis {...props} type="revenue" />,
  'product-demand': (props) => <AdminBusinessAnalysis {...props} type="product-demand" />,
  users: (props) => <AdminBusinessAnalysis {...props} type="users" />,
  location: (props) => <AdminBusinessAnalysis {...props} type="location" />,
  'stock-sales': (props) => <AdminBusinessAnalysis {...props} type="stock-sales" />,
  'order-status': (props) => <AdminBusinessAnalysis {...props} type="order-status" />,
  'customer-value': (props) => <AdminBusinessAnalysis {...props} type="customer-value" />,
};

export default function AdminAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = normalizeAnalysisTab(searchParams.get('tab'));

  const activeTabMeta = useMemo(() => {
    return ANALYSIS_TABS.find((tab) => tab.id === activeTab) || ANALYSIS_TABS[0];
  }, [activeTab]);

  const ActivePanel = ANALYSIS_PANELS[activeTab];

  const handleTabChange = (tabId) => {
    if (tabId === DEFAULT_ANALYSIS_TAB) {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: tabId });
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-forest)]">Analysis</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Switch between sales, customer, stock, cart, wishlist, and order insights without leaving the page.
          </p>
        </div>
        <NavLink to="/admin" className="btn btn-secondary text-sm">
          &larr; Back
        </NavLink>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Analysis type</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {activeTabMeta.description}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Analysis sections"
          >
            {ANALYSIS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-[var(--color-forest)] text-white border-[var(--color-forest)] shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ActivePanel embedded />
    </div>
  );
}
