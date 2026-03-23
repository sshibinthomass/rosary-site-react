import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createOrder } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import OrderItemEditor from '../components/OrderItemEditor';
import { CURRENCY } from '../config/constants';
import { getAllUsers, getUserProfile } from '../services/userService';
import { getAllProducts } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';

export default function AdminCreateOrderPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    district: '',
    state: '',
    pincode: ''
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const loadUsers = async () => {
    if (users.length > 0) return;
    setLoadingUsers(true);
    try {
      const data = await getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userId.trim().toLowerCase();
    if (!q) return true;
    const name = (u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const uid = (u.uid || '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      uid.includes(q)
    );
  });

  const handleSelectUser = async (user) => {
    setSelectedUserId(user.uid);
    setUserId(`${user.displayName || 'User'} (${user.email || user.uid})`);
    setShowUserSearch(false);

    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setCustomer((prev) => ({
          ...prev,
          name: prev.name || user.displayName || '',
          phone: prev.phone || profile.phone || '',
          address: prev.address || profile.address || '',
          district: prev.district || profile.city || '',
          state: prev.state || profile.state || '',
          pincode: prev.pincode || profile.pincode || ''
        }));
      } else {
        setCustomer((prev) => ({
          ...prev,
          name: prev.name || user.displayName || ''
        }));
      }
    } catch (err) {
      console.error('Failed to load user profile for order', err);
    }
  };

  const handleQuickAddItems = async () => {
    const raw = quickInput.trim();
    if (!raw) return;

    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const entries = parts.map((p) => {
      const [idPart, qtyPart] = p.split('-').map((s) => s.trim());
      const inputId = idPart;
      let quantity = 1;
      if (qtyPart) {
        const parsed = parseInt(qtyPart, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          quantity = parsed;
        }
      }
      return { inputId, quantity };
    });

    const uniqueIds = Array.from(new Set(entries.map((e) => e.inputId)));

    setQuickLoading(true);
    try {
      const [allProducts, limited] = await Promise.all([
        getAllProducts(),
        getLimitedPlants({ availableOnly: false })
      ]);

      const productMap = new Map();
      (allProducts || []).forEach((p) => {
        const key = String(p.id).toLowerCase();
        productMap.set(key, p);
      });
      (limited || []).forEach((p) => {
        const key = String(p.id).toLowerCase();
        productMap.set(key, p);
      });

      const missing = [];
      let nextItems = [...items];

      entries.forEach(({ inputId, quantity }) => {
        const lookupKey = String(inputId).toLowerCase();
        const product = productMap.get(lookupKey);
        if (!product) {
          if (!missing.includes(inputId)) {
            missing.push(inputId);
          }
          return;
        }

        const productId = product.id;
        const name = product.commonName || product.name || product.title;
        const price = product.salesPrice || product.price || 0;
        const imageUrl = product.imageUrl || null;

        const existingIndex = nextItems.findIndex((i) => i.productId === productId);
        if (existingIndex >= 0) {
          const existing = nextItems[existingIndex];
          const updated = {
            ...existing,
            quantity: existing.quantity + quantity
          };
          nextItems = [
            ...nextItems.slice(0, existingIndex),
            updated,
            ...nextItems.slice(existingIndex + 1)
          ];
        } else {
          nextItems = [
            ...nextItems,
            {
              productId,
              name,
              price,
              quantity,
              imageUrl
            }
          ];
        }
      });

      setItems(nextItems);

      if (missing.length) {
        error(`Some IDs were not found: ${missing.join(', ')}`);
      } else {
        success('Items added from ID list');
      }
    } catch (err) {
      console.error('Failed to quick add items', err);
      error('Failed to add items from ID list');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!items.length) {
      error('Please add at least one item to the order');
      return;
    }

    try {
      setSaving(true);

      const trimmedUserId = (selectedUserId || userId).trim();

      const payload = {
        items,
        totalAmount: subtotal,
        userId: trimmedUserId || null,
        customerInfo: customer
      };

      const created = await createOrder(payload);
      success('Order created successfully');

      if (created?.id) {
        navigate(`/order/${created.id}`);
      } else {
        navigate('/admin/orders');
      }
    } catch (err) {
      console.error('Failed to create order', err);
      error('Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomerChange = (field, value) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handlePincodeChange = async (value) => {
    handleCustomerChange('pincode', value);
    if (value.length === 6 && /^\d+$/.test(value)) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await response.json();
        if (data && data[0].Status === 'Success') {
          const postOffice = data[0].PostOffice[0];
          setCustomer(prev => ({
            ...prev,
            district: postOffice.District,
            state: postOffice.State
          }));
          success('District and State updated from Pincode');
        }
      } catch (err) {
        console.error('Failed to fetch pincode details:', err);
      }
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Create Order</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <NavLink to="/admin/orders" className="btn btn-secondary text-sm">
            ← Back to Orders
          </NavLink>
        </div>
      </div>

      <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Details */}
        <div className="lg:col-span-2 card p-4 space-y-4">
          <h2 className="text-base font-medium text-[var(--text-primary)]">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-[var(--text-secondary)] text-xs mb-1">Name</label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => handleCustomerChange('name', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div className="relative">
              <label className="block text-[var(--text-secondary)] text-xs mb-1">User ID (optional)</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setSelectedUserId('');
                  setShowUserSearch(true);
                  if (!users.length) {
                    loadUsers();
                  }
                }}
                onFocus={() => {
                  setShowUserSearch(true);
                  loadUsers();
                }}
                className="input text-sm w-full"
                placeholder="Search by name, email or ID..."
              />
              {showUserSearch && (
                <div className="absolute z-20 mt-1 w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <p className="text-xs text-[var(--text-secondary)] p-3 text-center">
                      Loading users...
                    </p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] p-3 text-center">
                      No users found
                    </p>
                  ) : (
                    filteredUsers.slice(0, 20).map((user) => (
                      <button
                        key={user.uid}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left text-xs"
                      >
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            className="w-7 h-7 rounded-full border border-[var(--border-color)] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[var(--color-forest)] text-white flex items-center justify-center text-[10px] flex-shrink-0">
                            {user.displayName?.[0] || user.email?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[var(--text-primary)]">
                            {user.displayName || 'No Name'}
                          </p>
                          <p className="truncate text-[var(--text-secondary)]">
                            {user.email}
                          </p>
                          <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                            {user.uid}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => setShowUserSearch(false)}
                    className="w-full text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] text-xs mb-1">Phone</label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => handleCustomerChange('phone', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] text-xs mb-1">WhatsApp</label>
              <input
                type="tel"
                value={customer.whatsapp}
                onChange={(e) => handleCustomerChange('whatsapp', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[var(--text-secondary)] text-xs mb-1">Address</label>
              <textarea
                value={customer.address}
                onChange={(e) => handleCustomerChange('address', e.target.value)}
                className="input text-sm w-full min-h-[60px]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] text-xs mb-1">District</label>
              <input
                type="text"
                value={customer.district}
                onChange={(e) => handleCustomerChange('district', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] text-xs mb-1">State</label>
              <input
                type="text"
                value={customer.state}
                onChange={(e) => handleCustomerChange('state', e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] text-xs mb-1">Pincode</label>
              <input
                type="text"
                value={customer.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className="input text-sm w-full"
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Order Items & Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4 space-y-3">
            <h2 className="text-base font-medium text-[var(--text-primary)]">Items</h2>
            <div className="space-y-1 text-xs mb-2">
              <label className="block text-[var(--text-secondary)] text-[11px] mb-1">
                Quick add by IDs (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
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
                Format: <span className="font-mono">plantId-qty, nextId-qty</span>. If no qty, it defaults to 1.
              </p>
            </div>
            <OrderItemEditor
              items={items}
              onSave={setItems}
              onChange={setItems}
              saving={saving}
            />
          </div>

          <div className="card p-4 space-y-3 text-sm">
            <h2 className="text-base font-medium text-[var(--text-primary)]">Summary</h2>
            {(() => {
              const totalPlants = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              return (
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Total Plants</span>
                  <span className="font-semibold text-[var(--text-primary)]">{totalPlants}</span>
                </div>
              );
            })()}
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Subtotal</span>
              <span>{CURRENCY}{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Delivery charge can be added or updated later from the order details page.
            </p>
            <button
              type="submit"
              disabled={saving || !items.length}
              className="btn btn-primary w-full mt-2 flex items-center justify-center gap-2 text-sm"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Create Order
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

