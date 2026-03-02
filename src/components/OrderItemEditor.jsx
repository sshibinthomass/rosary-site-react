import { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { CURRENCY } from '../config/constants';

/**
 * OrderItemEditor - Admin component to add/remove items from an order
 * @param {Array} items - Current order items
 * @param {Function} onSave - Callback when items are saved (receives updated items array)
 * @param {boolean} saving - Whether save is in progress
 * @param {Function} [onChange] - Optional callback whenever items change (receives updated items array)
 */
export default function OrderItemEditor({ items, onSave, saving, onChange }) {
  const [editItems, setEditItems] = useState(items || []);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const next = items || [];
    setEditItems(next);
    setHasChanges(false);
    if (onChange) {
      onChange(next);
    }
  }, [items, onChange]);

  const loadProducts = async () => {
    if (products.length > 0) return;
    setLoadingProducts(true);
    try {
      const [allProducts, limited] = await Promise.all([
        getAllProducts(),
        getLimitedPlants({ availableOnly: false })
      ]);

      const limitedWithFlag = (limited || []).map((p) => ({
        ...p,
        _source: 'limited'
      }));

      const normalWithFlag = (allProducts || []).map((p) => ({
        ...p,
        _source: 'product'
      }));

      setProducts([...normalWithFlag, ...limitedWithFlag]);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddProduct = (product) => {
    const existing = editItems.find(i => i.productId === product.id);
    let nextItems;
    if (existing) {
      nextItems = editItems.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      nextItems = [
        ...editItems,
        {
          productId: product.id,
          displayId: product.displayId || product.id,
          name: product.commonName || product.name || product.title,
          price: product.salesPrice || product.price,
          quantity: 1,
          imageUrl: product.imageUrl || null
        }
      ];
    }
    setEditItems(nextItems);
    if (onChange) {
      onChange(nextItems);
    }
    setHasChanges(true);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (productId) => {
    const nextItems = editItems.filter(i => i.productId !== productId);
    setEditItems(nextItems);
    if (onChange) {
      onChange(nextItems);
    }
    setHasChanges(true);
  };

  const handleQuantityChange = (productId, delta) => {
    const nextItems = editItems.map(i => {
      if (i.productId !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: newQty };
    });
    setEditItems(nextItems);
    if (onChange) {
      onChange(nextItems);
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(editItems);
    setHasChanges(false);
  };

  const handleCancel = () => {
    const next = items || [];
    setEditItems(next);
    if (onChange) {
      onChange(next);
    }
    setHasChanges(false);
    setShowSearch(false);
    setSearchQuery('');
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const alreadyAdded = editItems.some(i => i.productId === p.id);
    if (alreadyAdded) return false;

    const id = (p.id || '').toString().toLowerCase();         // e.g. "l7"
    const idNumeric = id.replace(/^l/, '');                    // e.g. "7" for limited ids
    const displayId = (p.displayId || '').toString().toLowerCase();
    const commonName = (p.commonName || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const name = (p.name || '').toLowerCase();

    return (
      commonName.includes(q) ||
      title.includes(q) ||
      name.includes(q) ||
      id.includes(q) ||           // matches "l7"
      idNumeric.includes(q) ||    // matches "7" for "L7"
      displayId.includes(q)
    );
  });

  const newTotal = editItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <div className="space-y-3">
      {/* Item List */}
      {editItems.map((item) => (
        <div key={item.productId} className="flex items-center gap-2 text-sm">
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-[var(--text-primary)]">
              {item.name}
              {(item.displayId || item.productId) && (
                <span className="text-[var(--text-secondary)] text-xs ml-1">
                  (ID: {item.displayId || item.productId})
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleQuantityChange(item.productId, -1)}
              className="w-6 h-6 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
            >−</button>
            <span className="w-6 text-center text-xs text-[var(--text-primary)]">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.productId, 1)}
              className="w-6 h-6 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
            >+</button>
            <button
              onClick={() => handleRemoveItem(item.productId)}
              className="w-6 h-6 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs flex items-center justify-center ml-1"
            >✕</button>
          </div>
        </div>
      ))}

      {/* Subtotal */}
      {hasChanges && (
        <div className="text-sm font-medium text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)] flex justify-between">
          <span>New Subtotal</span>
          <span>{CURRENCY}{newTotal.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Add Plant Button / Search */}
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
              filteredProducts.slice(0, 20).map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left text-sm"
                >
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[var(--text-primary)]">
                      {product.id}. {product.commonName || product.name || product.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {product._source === 'limited' ? 'Limited' : (product.title || product.category || '')}
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

      {/* Save / Cancel */}
      {hasChanges && (
        <div className="flex gap-2 pt-2">
          <button onClick={handleCancel} className="btn btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || editItems.length === 0}
            className="btn btn-primary flex-1 text-sm flex items-center justify-center gap-2"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
