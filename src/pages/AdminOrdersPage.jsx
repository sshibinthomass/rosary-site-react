import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllOrders, updateOrderStatus, deleteOrder, updateDeliveryCharge, updateOrderItems, updateOrderCustomer, getOrderUrl } from '../services/orderService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { CURRENCY } from '../config/constants';
import { useToast } from '../context/ToastContext';
import OrderItemEditor from '../components/OrderItemEditor';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const { error, success } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showTitle, setShowTitle] = useState(false);
  const [productNames, setProductNames] = useState({});
  const [editingDelivery, setEditingDelivery] = useState(null); // orderId being edited
  const [deliveryInput, setDeliveryInput] = useState('');
  const [editingItemsFor, setEditingItemsFor] = useState(null); // orderId being item-edited
  const [savingItems, setSavingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomerFor, setEditingCustomerFor] = useState(null); // orderId whose customer is being edited
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    district: '',
    state: '',
    pincode: ''
  });
  const [selectedOrders, setSelectedOrders] = useState([]); // ids of orders selected for printing

  useEffect(() => {
    loadOrders();
  }, []);

  // Clear any multi-selections when switching between tabs
  useEffect(() => {
    setSelectedOrders([]);
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
      // Fetch product names for all items
      const allProductIds = new Set();
      data.forEach(o => o.items?.forEach(item => allProductIds.add(item.productId)));
      const names = {};
      await Promise.all(
        Array.from(allProductIds).map(async (pid) => {
          try {
            const isLimited = typeof pid === 'string' && /^L/i.test(pid);
            const product = isLimited
              ? await getLimitedById(pid)
              : await getProductById(pid);

            if (product) {
              const title = product.title || product.name || product.commonName;
              const commonName = product.commonName || product.name || product.title || title;
              const plantId = product.displayId || product.id || pid;
              names[pid] = { title, commonName, plantId };
            }
          } catch (e) {
            // ignore individual failures
          }
        })
      );
      setProductNames(names);
    } catch (err) {
      console.error('Error loading orders:', err);
      error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const isOldPending = (order) => {
    if (order.status !== 'pending' || !order.createdAt) return false;
    const created = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 5;
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const clearSelectionForOrders = (orderIds) => {
    if (!orderIds.length) return;
    setSelectedOrders((prev) => prev.filter((id) => !orderIds.includes(id)));
  };

  const handleToggleSelectAllVisible = (visibleOrders) => {
    const visibleIds = visibleOrders.map((o) => o.id);
    if (!visibleIds.length) return;

    const allSelected = visibleIds.every((id) => selectedOrders.includes(id));

    if (allSelected) {
      clearSelectionForOrders(visibleIds);
    } else {
      const merged = new Set([...selectedOrders, ...visibleIds]);
      setSelectedOrders(Array.from(merged));
    }
  };

  const handlePrintSelectedAddresses = () => {
    const selected = orders.filter(
      (o) => o.status === 'confirmed' && selectedOrders.includes(o.id)
    );

    if (!selected.length) {
      error('Please select at least one order to print addresses');
      return;
    }

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      error('Please allow pop-ups to print addresses');
      return;
    }

    const addressLabelsHtml = selected
      .map((order) => {
        const customer = order.customer || {};
        const name = customer.name || 'Customer';
        const addressLines = [
          customer.address,
          [customer.district, customer.state].filter(Boolean).join(', '),
          customer.pincode,
        ]
          .filter(Boolean)
          .join('<br />');

        const phone = (customer.phone || '').trim();
        const whatsapp = (customer.whatsapp || '').trim();

        let contactDisplay = '';
        if (phone && whatsapp && phone !== whatsapp) {
          contactDisplay = `${phone}, ${whatsapp}`;
        } else if (phone || whatsapp) {
          contactDisplay = phone || whatsapp;
        } else if (customer.userId) {
          contactDisplay = `User: ${customer.userId}`;
        }

        return `
          <div class="label">
            <div class="label-header">
              <div class="label-title">Rosary Plant House</div>
              <div class="label-order-id">
                <span class="label-order-id-value">${order.orderId || order.id}</span>
              </div>
            </div>
            <div class="label-body">
              <div class="label-from">
                <div class="section-title">From:</div>
                <div class="section-content">
                  <div>Rosary Plant House,</div>
                  <div>Coonoor,</div>
                  <div>The Nilgiris,</div>
                  <div>Tamil Nadu</div>
                  <br />
                  <div><span class="field-label">Pincode :</span> 643101</div>
                  <div><span class="field-label">Phone :</span> 7904050237</div>
                </div>
              </div>
              <div class="label-to">
                <div class="section-title">To:</div>
                <div class="section-content">
                  <div class="customer-name">${name}</div>
                  ${addressLines ? `<div class="customer-address">${addressLines}</div>` : ''}
                  <div>
                    <span class="field-label">State :</span> ${customer.state || ''}
                  </div>
                  <div>
                    <span class="field-label">Pincode :</span> ${customer.pincode || ''}
                  </div>
                  ${
                    contactDisplay
                      ? `<div class="customer-phone"><span class="field-label">Phone :</span> ${contactDisplay}</div>`
                      : ''
                  }
                </div>
              </div>
            </div>
            <div class="label-footer">
              LIVE PLANTS INSIDE , HANDLE WITH CARE, PLEASE DON’T DELAY
            </div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Order Addresses</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 16px;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background-color: #ffffff;
              color: #000000;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
            .labels-wrapper {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .label {
              background-color: #ffffff;
              border: 1px solid #000000;
              border-radius: 2px;
              padding: 8px 10px 12px 10px;
              display: flex;
              flex-direction: column;
              font-size: 10px;
              min-height: 150px;
              page-break-inside: avoid;
            }
            /* Force exactly 4 labels per page: every 5th label starts on new page */
            .label:nth-of-type(4n + 1) {
              page-break-before: always;
            }
            .label:first-of-type {
              page-break-before: auto;
            }
            .label-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              font-weight: 600;
              border-bottom: 1px solid #000000;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .label-title {
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .label-order-id {
              text-align: right;
            }
            .label-order-id-text {
              text-decoration: underline;
              text-underline-offset: 2px;
            }
            .label-order-id-value {
              margin-left: 4px;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            }
            .label-body {
              display: grid;
              grid-template-columns: 1.1fr 1.3fr;
              gap: 8px;
              flex: 1;
            }
            .section-title {
              font-weight: 600;
              margin-bottom: 2px;
            }
            .section-content {
              border: 1px solid #000000;
              padding: 4px 6px;
              min-height: 72px;
            }
            .field-label {
              font-weight: 600;
              text-decoration: underline;
            }
            .customer-name {
              font-weight: 600;
              margin-bottom: 2px;
            }
            .customer-address {
              margin-bottom: 2px;
            }
            .label-footer {
              margin-top: 4px;
              text-align: center;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              border-top: 1px solid #000000;
              padding-top: 3px;
            }
          </style>
        </head>
        <body>
          <div class="labels-wrapper">
            ${addressLabelsHtml}
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleBulkDeleteSelected = async () => {
    if (filterStatus !== 'cancelled' && filterStatus !== 'delivered') {
      return;
    }

    const toDelete = orders.filter(
      (o) => o.status === filterStatus && selectedOrders.includes(o.id)
    );

    if (!toDelete.length) {
      error('Please select at least one order to delete');
      return;
    }

    const label =
      filterStatus === 'cancelled' ? 'cancelled' : 'delivered';

    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${toDelete.length} ${label} order(s)?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(toDelete.map((order) => deleteOrder(order.id)));
      const ids = new Set(toDelete.map((o) => o.id));
      setOrders((prev) => prev.filter((o) => !ids.has(o.id)));
      setSelectedOrders([]);
      success(`Deleted ${toDelete.length} ${label} order(s)`);
    } catch (err) {
      console.error('Error deleting selected orders:', err);
      error('Failed to delete selected orders');
    }
  };

  const handleBulkMarkDeliveredSelected = async () => {
    if (filterStatus !== 'shipped') {
      return;
    }

    const toUpdate = orders.filter(
      (o) => o.status === 'shipped' && selectedOrders.includes(o.id)
    );

    if (!toUpdate.length) {
      error('Please select at least one shipped order');
      return;
    }

    if (
      !window.confirm(
        `Mark ${toUpdate.length} shipped order(s) as delivered?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        toUpdate.map((order) => updateOrderStatus(order.id, 'delivered'))
      );

      const ids = new Set(toUpdate.map((o) => o.id));
      setOrders((prev) =>
        prev.map((o) =>
          ids.has(o.id) ? { ...o, status: 'delivered' } : o
        )
      );
      setSelectedOrders([]);
      success(`Updated ${toUpdate.length} order(s) to delivered`);
    } catch (err) {
      console.error('Error updating shipped orders to delivered:', err);
      error('Failed to update selected orders');
    }
  };

  const handleBulkMarkConfirmedFromPendingSelected = async () => {
    if (filterStatus !== 'pending') {
      return;
    }

    const toUpdate = orders.filter(
      (o) => o.status === 'pending' && selectedOrders.includes(o.id)
    );

    if (!toUpdate.length) {
      error('Please select at least one pending order');
      return;
    }

    if (
      !window.confirm(
        `Mark ${toUpdate.length} pending order(s) as confirmed?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        toUpdate.map((order) => updateOrderStatus(order.id, 'confirmed'))
      );

      const ids = new Set(toUpdate.map((o) => o.id));
      setOrders((prev) =>
        prev.map((o) =>
          ids.has(o.id) ? { ...o, status: 'confirmed' } : o
        )
      );
      setSelectedOrders([]);
      success(`Updated ${toUpdate.length} order(s) to confirmed`);
    } catch (err) {
      console.error('Error updating pending orders to confirmed:', err);
      error('Failed to update selected orders');
    }
  };

  const handleBulkMarkCancelledFromPendingSelected = async () => {
    if (filterStatus !== 'pending') {
      return;
    }

    const toUpdate = orders.filter(
      (o) => o.status === 'pending' && selectedOrders.includes(o.id)
    );

    if (!toUpdate.length) {
      error('Please select at least one pending order');
      return;
    }

    if (
      !window.confirm(
        `Mark ${toUpdate.length} pending order(s) as cancelled?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        toUpdate.map((order) => updateOrderStatus(order.id, 'cancelled'))
      );

      const ids = new Set(toUpdate.map((o) => o.id));
      setOrders((prev) =>
        prev.map((o) =>
          ids.has(o.id) ? { ...o, status: 'cancelled' } : o
        )
      );
      setSelectedOrders([]);
      success(`Updated ${toUpdate.length} order(s) to cancelled`);
    } catch (err) {
      console.error('Error updating pending orders to cancelled:', err);
      error('Failed to update selected orders');
    }
  };

  const handleBulkMarkShippedSelected = async () => {
    if (filterStatus !== 'confirmed') {
      return;
    }

    const toUpdate = orders.filter(
      (o) => o.status === 'confirmed' && selectedOrders.includes(o.id)
    );

    if (!toUpdate.length) {
      error('Please select at least one confirmed order');
      return;
    }

    if (
      !window.confirm(
        `Mark ${toUpdate.length} confirmed order(s) as shipped?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        toUpdate.map((order) => updateOrderStatus(order.id, 'shipped'))
      );

      const ids = new Set(toUpdate.map((o) => o.id));
      setOrders((prev) =>
        prev.map((o) =>
          ids.has(o.id) ? { ...o, status: 'shipped' } : o
        )
      );
      setSelectedOrders([]);
      success(`Updated ${toUpdate.length} order(s) to shipped`);
    } catch (err) {
      console.error('Error updating confirmed orders to shipped:', err);
      error('Failed to update selected orders');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this cancelled order?')) return;
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      success('Order deleted');
    } catch (err) {
      error('Failed to delete order');
    }
  };

  const getItemName = (item) => {
    const names = productNames[item.productId];
    if (!names) return item.name;
    return showTitle ? names.title : names.commonName;
  };

  const getItemPlantId = (item) => {
    const names = productNames[item.productId];
    if (names?.plantId) return names.plantId;
    return item.displayId || item.productId || '';
  };

  const handleSaveDelivery = async (orderId) => {
    try {
      const charge = parseFloat(deliveryInput) || 0;
      await updateDeliveryCharge(orderId, charge);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, deliveryCharge: charge } : o));
      setEditingDelivery(null);
      success('Delivery charge updated!');
    } catch (err) {
      error('Failed to update delivery charge');
    }
  };

  const handleSaveCustomer = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      const customerData = {
        ...order.customer,
        ...customerForm
      };
      await updateOrderCustomer(orderId, customerData);
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, customer: customerData } : o
      ));
      setEditingCustomerFor(null);
      success('Customer details updated!');
    } catch (err) {
      error('Failed to update customer details');
    }
  };

  const handleSaveOrderItems = async (orderId, newItems) => {
    setSavingItems(true);
    try {
      const result = await updateOrderItems(orderId, newItems);
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, items: newItems, totalAmount: result.totalAmount, totalItems: result.totalItems } : o
      ));
      setEditingItemsFor(null);
      success('Order items updated!');
    } catch (err) {
      error('Failed to update items');
    } finally {
      setSavingItems(false);
    }
  };

  const filteredOrders = orders
    .filter(o => {
      if (filterStatus === 'all') return o.status !== 'cancelled';
      return o.status === filterStatus;
    })
    .filter(o => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.orderId || '').toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').toLowerCase().includes(q) ||
        (o.customer?.whatsapp || '').toLowerCase().includes(q) ||
        (o.customer?.address || '').toLowerCase().includes(q) ||
        (o.customer?.district || '').toLowerCase().includes(q) ||
        (o.customer?.state || '').toLowerCase().includes(q) ||
        (o.customer?.pincode || '').toLowerCase().includes(q)
      );
    });

  const anySelectedVisible = filteredOrders.some(o => selectedOrders.includes(o.id));
  const visibleSelectedCount = filteredOrders.filter(o => selectedOrders.includes(o.id)).length;

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Orders</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <NavLink to="/admin/orders/new" className="btn btn-primary text-sm">
            + New Order
          </NavLink>
          <button
            onClick={() => setShowTitle(prev => !prev)}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${showTitle
                ? 'bg-[var(--color-forest)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {showTitle ? '📖 Title' : '🏷️ Common Name'}
          </button>
          <NavLink to="/admin" className="btn btn-secondary text-sm">
            ← Back
          </NavLink>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-forest)]">{orders.filter(o => o.status !== 'cancelled').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total Orders</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {orders.filter(o => o.status === 'pending').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Pending</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {orders.filter(o => o.status === 'confirmed').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Confirmed</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">Delivered</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all', ...ORDER_STATUSES].map((status) => {
          const count = status === 'all'
            ? orders.filter(o => o.status !== 'cancelled').length
            : orders.filter(o => o.status === status).length;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap flex items-center gap-1.5
                ${isActive
                  ? 'bg-[var(--color-forest)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {status === 'all' ? 'All' : status}
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search by Order ID, name, phone, address..."
          className="input text-sm w-full"
        />
      </div>

      {filterStatus === 'confirmed' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleSelectAllVisible(filteredOrders)}
            disabled={!filteredOrders.length}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${anySelectedVisible
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }
            `}
          >
            {anySelectedVisible ? 'Unselect visible' : 'Select visible'}
          </button>
          <button
            type="button"
            onClick={handlePrintSelectedAddresses}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            🖨️ Print
            {visibleSelectedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                {visibleSelectedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleBulkMarkShippedSelected}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            🚚 Shipped
            {visibleSelectedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                {visibleSelectedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {filterStatus === 'pending' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleSelectAllVisible(filteredOrders)}
            disabled={!filteredOrders.length}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${anySelectedVisible
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }
            `}
          >
            {anySelectedVisible ? 'Unselect visible' : 'Select visible'}
          </button>
          <button
            type="button"
            onClick={handleBulkMarkConfirmedFromPendingSelected}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            ✅ Confirm
            {visibleSelectedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                {visibleSelectedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleBulkMarkCancelledFromPendingSelected}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            ❌ Cancel
            {visibleSelectedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                {visibleSelectedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {filterStatus === 'shipped' && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleSelectAllVisible(filteredOrders)}
            disabled={!filteredOrders.length}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${anySelectedVisible
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }
            `}
          >
            {anySelectedVisible ? 'Unselect visible' : 'Select visible'}
          </button>
          <button
            type="button"
            onClick={handleBulkMarkDeliveredSelected}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            ✅ Delivered
            {visibleSelectedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                {visibleSelectedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {(filterStatus === 'cancelled' || filterStatus === 'delivered') && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleSelectAllVisible(filteredOrders)}
            disabled={!filteredOrders.length}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${anySelectedVisible
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }
            `}
          >
            {anySelectedVisible ? 'Unselect visible' : 'Select visible'}
          </button>
          <button
            type="button"
            onClick={handleBulkDeleteSelected}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            🗑️ Delete Selected
            {visibleSelectedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                {visibleSelectedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl">📋</span>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-4">No orders yet</h2>
          <p className="text-[var(--text-secondary)] mt-2">Orders will appear here when customers checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className={`card overflow-hidden ${isOldPending(order) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}>
              {/* Order Header - Clickable */}
              <button
                onClick={() => toggleExpand(order.id)}
                className="w-full p-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {['pending', 'confirmed', 'shipped', 'cancelled', 'delivered'].includes(filterStatus) && order.status === filterStatus && (
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleOrderSelection(order.id);
                        }}
                        className="w-4 h-4 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold text-[var(--color-forest)]">
                      {order.orderId}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="text-sm text-[var(--text-primary)] mt-1">
                      {order.customer?.name || 'Guest'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusColor(order.status)} capitalize text-xs`}>
                      {order.status}
                    </span>
                    <p className="font-semibold text-[var(--text-primary)] mt-2">
                      {CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {order.totalItems} items{order.deliveryCharge ? ` · +${CURRENCY}${order.deliveryCharge} delivery` : ''}
                    </p>
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)] animate-fade-in">
                  {/* Customer Details */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[var(--text-primary)]">Customer Details</h4>
                      <button
                        onClick={() => {
                          if (editingCustomerFor === order.id) {
                            setEditingCustomerFor(null);
                            return;
                          }
                          setEditingCustomerFor(order.id);
                          setCustomerForm({
                            name: order.customer?.name || '',
                            phone: order.customer?.phone || '',
                            whatsapp: order.customer?.whatsapp || '',
                            address: order.customer?.address || '',
                            district: order.customer?.district || '',
                            state: order.customer?.state || '',
                            pincode: order.customer?.pincode || ''
                          });
                        }}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${editingCustomerFor === order.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                      >
                        {editingCustomerFor === order.id ? '✕ Cancel' : '✏️ Edit'}
                      </button>
                    </div>
                    {editingCustomerFor === order.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">Name</label>
                          <input
                            type="text"
                            value={customerForm.name}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                            className="input text-sm w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">Phone</label>
                          <input
                            type="tel"
                            value={customerForm.phone}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="input text-sm w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">WhatsApp</label>
                          <input
                            type="tel"
                            value={customerForm.whatsapp}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                            className="input text-sm w-full"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">Address</label>
                          <textarea
                            value={customerForm.address}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                            className="input text-sm w-full min-h-[60px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">District</label>
                          <input
                            type="text"
                            value={customerForm.district}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, district: e.target.value }))}
                            className="input text-sm w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">State</label>
                          <input
                            type="text"
                            value={customerForm.state}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, state: e.target.value }))}
                            className="input text-sm w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-secondary)] text-xs mb-1">Pincode</label>
                          <input
                            type="text"
                            value={customerForm.pincode}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, pincode: e.target.value }))}
                            className="input text-sm w-full"
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2 justify-end">
                          <button
                            onClick={() => handleSaveCustomer(order.id)}
                            className="btn btn-primary text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCustomerFor(null)}
                            className="btn btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="text-[var(--text-secondary)]">Phone:</span> {order.customer?.phone || 'N/A'}</p>
                        <p><span className="text-[var(--text-secondary)]">WhatsApp:</span> {order.customer?.whatsapp || 'N/A'}</p>
                        <p className="col-span-2">
                          <span className="text-[var(--text-secondary)]">Address:</span> {order.customer?.address || 'N/A'}
                        </p>
                        <p className="col-span-2">
                          <span className="text-[var(--text-secondary)]">Location:</span>{' '}
                          {[order.customer?.district, order.customer?.state, order.customer?.pincode].filter(Boolean).join(', ') || 'N/A'}
                        </p>
                        {order.customer?.userId && (
                          <p className="col-span-2 text-xs">
                            <span className="text-[var(--text-secondary)]">User ID:</span>{' '}
                            <span className="font-mono">{order.customer.userId}</span>
                          </p>
                        )}
                      </div>

                      {/* Order Link */}
                      <div className="pt-2 border-t border-[var(--border-color)] text-xs">
                        <span className="text-[var(--text-secondary)]">Order Link:</span>{' '}
                        {(() => {
                          const url = getOrderUrl(order.id);
                          return (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--color-forest)] break-all hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {url}
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-[var(--text-primary)]">Items</h4>
                      <button
                        onClick={() => setEditingItemsFor(editingItemsFor === order.id ? null : order.id)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${editingItemsFor === order.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                      >
                        {editingItemsFor === order.id ? '✕ Cancel' : '✏️ Edit'}
                      </button>
                    </div>
                    {editingItemsFor === order.id ? (
                      <OrderItemEditor items={order.items} onSave={(items) => handleSaveOrderItems(order.id, items)} saving={savingItems} />
                    ) : (
                    <div className="space-y-2">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[var(--text-primary)]">
                              {index + 1}. {getItemName(item)}
                              {getItemPlantId(item) && (
                                <span className="text-[var(--text-secondary)] text-xs ml-1">
                                  (ID: {getItemPlantId(item)})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>

                  {/* Delivery & Total */}
                  <div className="mb-4 pt-3 border-t border-[var(--border-color)] space-y-2 text-sm">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Subtotal</span>
                      <span>{CURRENCY}{order.totalAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Delivery</span>
                      {editingDelivery === order.id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                            <input
                              type="number"
                              value={deliveryInput}
                              onChange={(e) => setDeliveryInput(e.target.value)}
                              className="input w-20 py-1 px-2 text-right text-sm"
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <button onClick={() => handleSaveDelivery(order.id)} className="text-[var(--color-forest)] text-xs font-medium hover:underline">Save</button>
                          <button onClick={() => setEditingDelivery(null)} className="text-[var(--text-secondary)] text-xs hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className={order.deliveryCharge ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}>
                            {order.deliveryCharge ? `${CURRENCY}${order.deliveryCharge.toLocaleString('en-IN')}` : 'Not set'}
                          </span>
                          <button
                            onClick={() => { setEditingDelivery(order.id); setDeliveryInput(order.deliveryCharge?.toString() || ''); }}
                            className="text-xs text-[var(--color-forest)] hover:underline"
                          >
                            {order.deliveryCharge ? 'Edit' : 'Add'}
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                      <span>Total</span>
                      <span>{CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Update Status */}
                  <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Update Status</h4>
                    <div className="flex gap-2 flex-wrap">
                      {ORDER_STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={async () => {
                            try {
                              await updateOrderStatus(order.id, status);
                              setOrders(prev => prev.map(o => 
                                o.id === order.id ? { ...o, status } : o
                              ));
                              success(`Order status updated to ${status}`);
                            } catch (err) {
                              error('Failed to update status');
                            }
                          }}
                          disabled={order.status === status}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                            ${order.status === status
                              ? 'bg-[var(--color-forest)] text-white cursor-default'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]'
                            }
                          `}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delete Cancelled Order */}
                  {order.status === 'cancelled' && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="btn bg-red-500 text-white hover:bg-red-600 text-sm w-full"
                      >
                        🗑️ Delete This Order
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
