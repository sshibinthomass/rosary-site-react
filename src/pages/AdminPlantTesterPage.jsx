import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getAllProducts } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { CURRENCY } from '../config/constants';
import { resolveImageUrl } from '../utils/imageCompressor';

export default function AdminPlantTesterPage() {
  const { success, error } = useToast();

  const [items, setItems] = useState([]);
  const [quickInput, setQuickInput] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [showNameAs, setShowNameAs] = useState('common'); // 'common' | 'title'

  // Product search
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadProducts = async () => {
    if (products.length > 0) return;
    setLoadingProducts(true);
    try {
      const [allProducts, limited] = await Promise.all([
        getAllProducts(),
        getLimitedPlants({ availableOnly: false })
      ]);
      const combined = [
        ...(allProducts || []).map((p) => ({ ...p, _source: 'product' })),
        ...(limited || []).map((p) => ({ ...p, _source: 'limited' }))
      ];
      setProducts(combined);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const buildProductMap = (allProducts, limited) => {
    const map = new Map();
    (allProducts || []).forEach((p) => map.set(String(p.id).toLowerCase(), p));
    (limited || []).forEach((p) => map.set(String(p.id).toLowerCase(), p));
    return map;
  };

  const handleQuickAddItems = async () => {
    const raw = quickInput.trim();
    if (!raw) return;

    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const entries = parts.map((p) => {
      const [idPart, qtyPart] = p.split('-').map((s) => s.trim());
      let quantity = 1;
      if (qtyPart) {
        const parsed = parseInt(qtyPart, 10);
        if (!Number.isNaN(parsed) && parsed > 0) quantity = parsed;
      }
      return { inputId: idPart, quantity };
    });

    setQuickLoading(true);
    try {
      const [allProducts, limited] = await Promise.all([
        getAllProducts(),
        getLimitedPlants({ availableOnly: false })
      ]);
      const productMap = buildProductMap(allProducts, limited);

      const missing = [];
      let nextItems = [...items];

      entries.forEach(({ inputId, quantity }) => {
        const product = productMap.get(String(inputId).toLowerCase());
        if (!product) {
          if (!missing.includes(inputId)) missing.push(inputId);
          return;
        }

        const productId = product.id;
        const existingIndex = nextItems.findIndex((i) => i.productId === productId);
        if (existingIndex >= 0) {
          const existing = nextItems[existingIndex];
          nextItems = [
            ...nextItems.slice(0, existingIndex),
            { ...existing, quantity: existing.quantity + quantity },
            ...nextItems.slice(existingIndex + 1)
          ];
        } else {
          nextItems.push({
            productId,
            commonName: product.commonName || product.name || '',
            title: product.title || '',
            price: product.salesPrice || product.price || 0,
            quantity,
            imageUrl: product.imageUrl || null,
            category: product.category || '',
            _source: product._source || 'product'
          });
        }
      });

      setItems(nextItems);
      setQuickInput('');

      if (missing.length) {
        error(`IDs not found: ${missing.join(', ')}`);
      } else {
        success('Plants added');
      }
    } catch (err) {
      console.error('Failed to quick add items', err);
      error('Failed to add items');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleAddProduct = (product) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(items.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          commonName: product.commonName || product.name || '',
          title: product.title || '',
          price: product.salesPrice || product.price || 0,
          quantity: 1,
          imageUrl: product.imageUrl || null,
          category: product.category || '',
          _source: product._source || 'product'
        }
      ]);
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleQuantityChange = (productId, delta) => {
    setItems(items.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: newQty };
    }));
  };

  const handleRemoveItem = (productId) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const handleClearAll = () => {
    setItems([]);
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const alreadyAdded = items.some((i) => i.productId === p.id);
    if (alreadyAdded) return false;
    const id = (p.id || '').toString().toLowerCase();
    const idNumeric = id.replace(/^l/, '');
    const commonName = (p.commonName || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return (
      commonName.includes(q) || title.includes(q) || name.includes(q) ||
      id.includes(q) || idNumeric.includes(q)
    );
  });

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const getDisplayName = (item) => {
    if (showNameAs === 'title') return item.title || item.commonName || '—';
    return item.commonName || item.title || '—';
  };

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">🧪 Plant Tester</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <NavLink to="/admin" className="btn btn-secondary text-sm">
            ← Back to Admin
          </NavLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add plants */}
        <div className="lg:col-span-1 space-y-4">
          {/* Quick add by IDs */}
          <div className="card p-4 space-y-3">
            <h2 className="text-base font-medium text-[var(--text-primary)]">Add Plants</h2>
            <div className="space-y-1 text-xs">
              <label className="block text-[var(--text-secondary)] text-[11px] mb-1">
                Quick add by IDs
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddItems(); } }}
                  className="input text-xs flex-1"
                  placeholder="E.g. L7-1,1-1,4-1,5-3,6-2,18-2"
                />
                <button
                  type="button"
                  onClick={handleQuickAddItems}
                  disabled={quickLoading || !quickInput.trim()}
                  className="btn btn-secondary text-xs px-3 flex items-center justify-center gap-1"
                >
                  {quickLoading && (
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  Add
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Format: <span className="font-mono">plantId-qty, nextId-qty</span>. If no qty, defaults to 1.
              </p>
            </div>

            {/* Search add */}
            {showSearch ? (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={loadProducts}
                  placeholder="Search by name or ID..."
                  className="input rounded-none border-0 border-b border-[var(--border-color)] text-sm"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto">
                  {loadingProducts ? (
                    <p className="text-xs text-[var(--text-secondary)] p-3 text-center">Loading products...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] p-3 text-center">No products found</p>
                  ) : (
                    filteredProducts.slice(0, 20).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
                      >
                        {product.imageUrl && (
                          <img src={resolveImageUrl(product.imageUrl)} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[var(--text-primary)]">
                            {product.id}. {product.commonName || product.name || product.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {product._source === 'limited' ? 'Limited' : (product.category || '')}
                            {' · '}
                            {CURRENCY}{product.salesPrice || product.price}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 border-t border-[var(--border-color)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setShowSearch(true); loadProducts(); }}
                className="w-full py-2 rounded-lg border-2 border-dashed border-[var(--border-color)] text-sm text-[var(--color-forest)] font-medium hover:border-[var(--color-forest)] transition-colors"
              >
                + Add Plant
              </button>
            )}
          </div>

          {/* Summary card */}
          <div className="card p-4 space-y-2 text-sm">
            <h2 className="text-base font-medium text-[var(--text-primary)]">Summary</h2>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Total plants</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Total quantity</span>
              <span>{totalQuantity}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Total price</span>
              <span>{CURRENCY}{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn btn-secondary w-full mt-2 text-sm text-red-500 hover:text-red-400"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Right: Table */}
        <div className="lg:col-span-2">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-medium text-[var(--text-primary)]">Plant List</h2>
              {/* Toggle */}
              <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setShowNameAs('common')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    showNameAs === 'common'
                      ? 'bg-[var(--color-forest)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Common Name
                </button>
                <button
                  type="button"
                  onClick={() => setShowNameAs('title')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    showNameAs === 'title'
                      ? 'bg-[var(--color-forest)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Title
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">
                <p className="text-3xl mb-2">🌱</p>
                <p className="text-sm">No plants added yet</p>
                <p className="text-xs mt-1">Use the quick add or search to add plants</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="text-left py-2 px-2 text-xs font-medium text-[var(--text-secondary)]">#</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-[var(--text-secondary)]">ID</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-[var(--text-secondary)]">
                        {showNameAs === 'common' ? 'Common Name' : 'Title'}
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-medium text-[var(--text-secondary)]">Qty</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[var(--text-secondary)]">Price</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-[var(--text-secondary)]">Total</th>
                      <th className="py-2 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={item.productId}
                        className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <td className="py-2 px-2 text-xs text-[var(--text-secondary)]">{idx + 1}</td>
                        <td className="py-2 px-2 text-xs font-mono text-[var(--text-secondary)]">{item.productId}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            {item.imageUrl && (
                              <img
                                src={resolveImageUrl(item.imageUrl)}
                                alt=""
                                className="w-7 h-7 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <span className="text-[var(--text-primary)] truncate max-w-[200px]">
                              {getDisplayName(item)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleQuantityChange(item.productId, -1)}
                              className="w-5 h-5 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs flex items-center justify-center hover:bg-[var(--border-color)]"
                            >−</button>
                            <span className="w-6 text-center text-xs text-[var(--text-primary)]">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.productId, 1)}
                              className="w-5 h-5 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs flex items-center justify-center hover:bg-[var(--border-color)]"
                            >+</button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-[var(--text-secondary)]">
                          {CURRENCY}{item.price}
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-medium text-[var(--text-primary)]">
                          {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="w-5 h-5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs flex items-center justify-center"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border-color)]">
                      <td colSpan="3" className="py-2 px-2 text-xs font-medium text-[var(--text-primary)]">
                        Total ({items.length} plants)
                      </td>
                      <td className="py-2 px-2 text-center text-xs font-medium text-[var(--text-primary)]">
                        {totalQuantity}
                      </td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2 text-right text-sm font-semibold text-[var(--color-forest)]">
                        {CURRENCY}{totalPrice.toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
