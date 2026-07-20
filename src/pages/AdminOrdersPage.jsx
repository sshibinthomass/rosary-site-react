import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllOrders, updateOrderStatus, archiveOrder, updateDeliveryCharge, updateManualDiscount, updateOrderItems, updateOrderCustomer, getOrderUrl } from '../services/orderService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { resolveImageUrl } from '../utils/imageCompressor';
import { CURRENCY } from '../config/constants';
import { useToast } from '../context/ToastContext';
import OrderItemEditor from '../components/OrderItemEditor';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import logoImg from '../assets/logo.png';

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
  const [editingDiscount, setEditingDiscount] = useState(null); // orderId being discounted
  const [discountInput, setDiscountInput] = useState('');
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
  const [exportingOrder, setExportingOrder] = useState(null); // id of order being exported

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
              const plantId = product.id || pid;
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
          customer.address
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

        const orderUrl = getOrderUrl(order.id);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderUrl)}`;
        const instaQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('https://instagram.com/rosary_plant_house')}`;
        
        const logoUrl = logoImg.startsWith('http') ? logoImg : (logoImg.startsWith('/') ? window.location.origin + logoImg : window.location.origin + '/' + logoImg);

        // Calculate item total excluding delivery & discounts
        const itemsTotal = (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalItemsQuantity = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
        const isLargeOrder = itemsTotal > 1000;

        return `
          <div class="page">
            <!-- Original Address Label (Top) -->
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
                    <div style="font-weight: bold; font-size: 15px;">
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
                LIVE PLANTS INSIDE , HANDLE WITH CARE, PLEASE DON'T DELAY
              </div>
            </div>

            <!-- Colorful Thank You & Info Section (Bottom) -->
            <div class="thank-you-card">
              <div class="thank-you-header">
                <div class="header-logo-container">
                  <img src="${logoUrl}" alt="Logo" class="header-logo" onerror="this.style.display='none'" />
                  <div class="header-text-container">
                    <h2>Dear Plant Parent, Thank You! 🌿</h2>
                    <p class="tagline">Bringing Nature's Finest Succulents & Plants to You</p>
                  </div>
                </div>
              </div>
              
              <div class="thank-you-content">
                <div class="thank-you-text">
                  <h3>Order Details</h3>
                  <div class="detail-row"><span>Order ID:</span> <strong>${order.orderId || order.id}</strong></div>
                  <div class="detail-row"><span>Items:</span> <strong>${totalItemsQuantity} plants</strong></div>
                  
                  ${isLargeOrder ? `
                    <div class="complimentary-msg">
                      🪴 Hope you liked your complimentary plant! 
                    </div>
                  ` : ''}

                  <h3 style="margin-top: 15px;">Plant Care Tips</h3>
                  <ul class="care-list">
                    <li>Unpack your plants immediately upon arrival.</li>
                    <li>Keep them in a shaded, well-ventilated area for a few days to recover from transit shock before moving to bright light.</li>
                  </ul>
                  
                  <div class="promo-box">
                    <div class="promo-text">
                      <strong>Post an insta story</strong>, tag us and get a <br/><strong>Complimentary Plant next time!</strong>
                    </div>
                    <img src="${instaQrUrl}" alt="Insta QR" class="promo-qr" />
                  </div>
                  
                  <div class="contact-footer flex-contact">
                    <div>🌐 rosaryplanthouse.com</div>
                    <div>📞 +91 7904050237</div>
                  </div>
                </div>
                
                <div class="thank-you-qr-section border-left-divider">
                  <div class="qr-container">
                    <img src="${qrUrl}" alt="Order QR Code" />
                  </div>
                  <div class="qr-text">Scan for Plant Care Tips & Bill</div>
                  <div class="qr-details">
                    Includes: About, Origin, Temp & Humidity, Growth, Watering, Sunlight, Care Tips & Common Problems
                  </div>
                </div>
              </div>
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
            }
            .page {
              page-break-after: always;
              display: flex;
              flex-direction: column;
              gap: 24px;
              padding: 16px 0;
            }
            .page:last-child {
              page-break-after: auto;
            }
            
            /* --- Original Label Styling --- */
            .label {
              background-color: #ffffff;
              border: 1px solid #000000;
              border-radius: 2px;
              padding: 8px 10px 12px 10px;
              display: flex;
              flex-direction: column;
              font-size: 10px;
              min-height: 150px;
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
            .label-to .section-content {
              font-size: 14px;
              line-height: 1.4;
            }
            .customer-name {
              font-weight: 700;
              font-size: 16px;
              margin-bottom: 4px;
            }
            .customer-address {
              margin-bottom: 4px;
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

            /* --- Colorful Thank You Card Styling --- */
            .thank-you-card {
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
              font-family: 'Segoe UI', system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              background-color: #fafafa;
            }
            .thank-you-header {
              background: linear-gradient(135deg, #528945 0%, #68a357 100%);
              color: white;
              padding: 16px 24px;
            }
            .header-logo-container {
              display: flex;
              align-items: center;
              justify-content: flex-start;
              gap: 16px;
            }
            .header-text-container {
              text-align: left;
            }
            .header-logo {
              width: 55px;
              height: 55px;
              object-fit: contain;
              background: white;
              border-radius: 50%;
              padding: 3px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .thank-you-header h2 {
              margin: 0 0 4px 0;
              font-size: 22px;
              font-weight: 700;
            }
            .thank-you-header .tagline {
              margin: 0;
              font-size: 14px;
              opacity: 0.95;
              font-weight: 500;
              letter-spacing: 0.3px;
            }
            .thank-you-content {
              padding: 24px;
              display: grid;
              grid-template-columns: 1.5fr 1fr;
              gap: 30px;
              align-items: flex-start;
            }
            .border-left-divider {
              border-left: 2px dashed #cbd5e1;
              padding-left: 30px;
            }
            .thank-you-text h3 {
              color: #1e293b;
              margin: 0 0 10px 0;
              font-size: 16px;
              font-weight: 700;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 14px;
              color: #475569;
              max-width: 250px;
            }
            .detail-row strong {
              color: #0f172a;
            }
            .complimentary-msg {
              background-color: #fdf6b2;
              color: #8a4b08;
              padding: 8px 12px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
              margin-top: 12px;
              display: inline-block;
              border-left: 4px solid #faca15;
            }
            .care-list {
              margin: 0;
              padding-left: 18px;
              color: #64748b;
              font-size: 13px;
              line-height: 1.5;
            }
            .care-list li {
              margin-bottom: 4px;
            }
            .promo-box {
              margin-top: 20px;
              background-color: #f3e8ff;
              padding: 12px 16px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border: 1px solid #e9d5ff;
              gap: 12px;
            }
            .promo-text {
              font-size: 13px;
              line-height: 1.4;
              color: #4338ca;
            }
            .promo-text strong {
              color: #3730a3;
            }
            .promo-qr {
              width: 50px;
              height: 50px;
              border-radius: 4px;
              mix-blend-mode: multiply;
            }
            .thank-you-qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 12px;
              height: 100%;
            }
            .qr-container {
              background: white;
              padding: 12px;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              border: 1px solid #f1f5f9;
            }
            .qr-container img {
              width: 140px;
              height: 140px;
              display: block;
            }
            .qr-text {
              font-weight: 700;
              color: #3f6212;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: center;
              line-height: 1.4;
              max-width: 160px;
            }
            .qr-details {
              font-size: 10.5px;
              color: #475569;
              text-align: center;
              line-height: 1.3;
              max-width: 170px;
              margin-top: 2px;
            }
            .contact-footer {
              font-size: 13px;
              color: #475569;
              margin-top: 15px;
            }
            .flex-contact {
              display: flex;
              gap: 20px;
              font-weight: 600;
              border-top: 1px dashed #e2e8f0;
              padding-top: 15px;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .thank-you-card {
                break-inside: avoid;
              }
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

  const handleBulkArchiveSelected = async () => {
    if (filterStatus !== 'cancelled' && filterStatus !== 'delivered') {
      return;
    }

    const toArchive = orders.filter(
      (o) => o.status === filterStatus && selectedOrders.includes(o.id)
    );

    if (!toArchive.length) {
      error('Please select at least one order to archive');
      return;
    }

    const label =
      filterStatus === 'cancelled' ? 'cancelled' : 'delivered';

    if (
      !window.confirm(
        `Archive ${toArchive.length} ${label} order(s)? Their existing order links will keep working.`
      )
    ) {
      return;
    }

    try {
      await Promise.all(toArchive.map((order) => archiveOrder(order.id)));
      const ids = new Set(toArchive.map((o) => o.id));
      setOrders((prev) => prev.filter((o) => !ids.has(o.id)));
      setSelectedOrders([]);
      success(`Archived ${toArchive.length} ${label} order(s)`);
    } catch (err) {
      console.error('Error archiving selected orders:', err);
      error('Failed to archive selected orders');
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

  const handleArchiveOrder = async (orderId) => {
    if (!window.confirm('Archive this cancelled order? Its existing order link will keep working.')) return;
    try {
      await archiveOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      success('Order archived');
    } catch (err) {
      error('Failed to archive order');
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
    return item.productId || '';
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

  const handleSaveDiscount = async (orderId) => {
    try {
      const discount = parseFloat(discountInput) || 0;
      await updateManualDiscount(orderId, discount);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, manualDiscount: discount } : o));
      setEditingDiscount(null);
      success('Discount updated!');
    } catch (err) {
      error('Failed to update discount');
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
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const updated = {
          ...o,
          items: newItems,
          totalItems: result.totalItems,
          totalAmount: result.totalAmount,
          originalAmount: result.originalAmount,
          discountAmount: result.promoRemoved ? 0 : (result.discountAmount ?? o.discountAmount)
        };
        if (result.promoRemoved) {
          delete updated.promoCode;
          delete updated.discountType;
          delete updated.discountValue;
          delete updated.originalAmount;
        }
        return updated;
      }));
      setEditingItemsFor(null);
      if (result.promoRemoved) {
        success('Items updated. Promo removed — order total is below the minimum.');
      } else {
        success('Order items updated!');
      }
    } catch (err) {
      error('Failed to update items');
    } finally {
      setSavingItems(false);
    }
  };

  const handleExportPDF = async (order) => {
    setExportingOrder(order.id);
    try {
      const orderData = {
        orderId: order.orderId || order.id,
        dateFormatted: formatDate(order.createdAt),
        customer: order.customer || null,
        promoCode: order.promoCode,
        discountAmount: order.discountAmount,
        discountType: order.discountType,
        deliveryCharge: order.deliveryCharge || 0,
        manualDiscount: order.manualDiscount || 0
      };

      const doc = await generateInvoicePDF(orderData, order.items || [], getItemName);
      
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/:/g, '-').replace(/ /g, '_');
      const safeDate = formatDate(order.createdAt).replace(/[:,\s]+/g, '_');
      const fileName = `Rosary_Bill_${order.orderId || order.id}_${safeDate}_${timeStr}.pdf`;
      
      doc.save(fileName);
      success('PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      error('Failed to generate PDF invoice');
    } finally {
      setExportingOrder(null);
    }
  };

  const filteredOrders = orders
    .filter(o => !o.archived)
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
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <button onClick={() => setFilterStatus('all')} className={`card p-3 text-center transition-all hover:ring-2 hover:ring-[var(--color-forest)] ${filterStatus === 'all' ? 'ring-2 ring-[var(--color-forest)]' : ''}`}>
          <p className="text-2xl font-bold text-[var(--color-forest)]">{orders.filter(o => o.status !== 'cancelled').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Total</p>
        </button>
        <button onClick={() => setFilterStatus('pending')} className={`card p-3 text-center transition-all hover:ring-2 hover:ring-yellow-600 ${filterStatus === 'pending' ? 'ring-2 ring-yellow-600' : ''}`}>
          <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Pending</p>
        </button>
        <button onClick={() => setFilterStatus('confirmed')} className={`card p-3 text-center transition-all hover:ring-2 hover:ring-blue-600 ${filterStatus === 'confirmed' ? 'ring-2 ring-blue-600' : ''}`}>
          <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'confirmed').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Confirmed</p>
        </button>
        <button onClick={() => setFilterStatus('shipped')} className={`card p-3 text-center transition-all hover:ring-2 hover:ring-purple-600 ${filterStatus === 'shipped' ? 'ring-2 ring-purple-600' : ''}`}>
          <p className="text-2xl font-bold text-purple-600">{orders.filter(o => o.status === 'shipped').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Shipped</p>
        </button>
        <button onClick={() => setFilterStatus('delivered')} className={`card p-3 text-center transition-all hover:ring-2 hover:ring-green-600 ${filterStatus === 'delivered' ? 'ring-2 ring-green-600' : ''}`}>
          <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Delivered</p>
        </button>
        <button onClick={() => setFilterStatus('cancelled')} className={`card p-3 text-center transition-all hover:ring-2 hover:ring-red-600 ${filterStatus === 'cancelled' ? 'ring-2 ring-red-600' : ''}`}>
          <p className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</p>
          <p className="text-xs text-[var(--text-secondary)]">Cancelled</p>
        </button>
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
            onClick={handleBulkArchiveSelected}
            disabled={!anySelectedVisible}
            className={`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${anySelectedVisible
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
              }
            `}
          >
            Archive Selected
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
                    {order.promoCode && order.discountAmount > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        🏷️ {order.promoCode} −{CURRENCY}{order.discountAmount.toLocaleString('en-IN')}
                      </p>
                    )}
                    <p className="font-semibold text-[var(--text-primary)] mt-1">
                      {CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0) - (order.manualDiscount || 0)).toLocaleString('en-IN')}
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
                  {/* Quick Update Status */}
                  <div className="mb-4 pb-4 border-b border-[var(--border-color)]">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Update Status</h4>
                    <div className="flex gap-2 flex-wrap">
                      {ORDER_STATUSES.map((status) => (
                        <button
                          key={`top-${status}`}
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

                      <div className="pt-2 text-xs">
                        <NavLink
                          to={`/admin/checkout-attempts?orderId=${encodeURIComponent(order.orderId || order.id)}`}
                          className="font-medium text-[var(--color-forest)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Checkout issues
                        </NavLink>
                      </div>

                      {/* User Link */}
                      {order.customer?.userId && (
                        <div className="pt-2 mt-2 border-t border-[var(--border-color)] text-xs">
                          <span className="text-[var(--text-secondary)]">User Link:</span>{' '}
                          <NavLink
                            to={`/admin/users?userId=${order.customer.userId}`}
                            className="text-[var(--color-forest)] hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View User Profile →
                          </NavLink>
                        </div>
                      )}

                      {/* Export PDF Button */}
                      <div className="pt-4 mt-2 border-t border-[var(--border-color)]">
                        <button
                          onClick={() => handleExportPDF(order)}
                          disabled={exportingOrder === order.id}
                          className="btn btn-secondary text-xs w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                          {exportingOrder === order.id ? (
                            <span className="w-3 h-3 border-2 border-[var(--text-secondary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
                          ) : '📄'}
                          {exportingOrder === order.id ? 'Generating PDF...' : 'Download PDF Bill'}
                        </button>
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

                    {/* Copyable ID List */}
                    {(() => {
                      const idListString = order.items?.map(item => {
                        const plantId = getItemPlantId(item);
                        return `${plantId}-${item.quantity}`;
                      }).join(',');
                      return idListString ? (
                        <div className="flex items-center gap-2 text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)] mb-3 max-w-full overflow-hidden">
                          <span className="font-mono text-[var(--text-primary)] truncate flex-1">{idListString}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(idListString);
                              success('IDs copied!');
                            }}
                            className="text-[var(--color-forest)] font-medium hover:underline flex-shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      ) : null;
                    })()}

                    {editingItemsFor === order.id ? (
                      <OrderItemEditor items={order.items} onSave={(items) => handleSaveOrderItems(order.id, items)} saving={savingItems} />
                    ) : (
                    <div className="space-y-2">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {item.imageUrl && (
                            <img 
                              src={resolveImageUrl(item.imageUrl)} 
                              alt={item.name} 
                              className="w-20 h-20 sm:w-14 sm:h-14 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[var(--text-primary)]">
                              {index + 1}.{' '}
                              {getItemPlantId(item) && (
                                <span className="text-[var(--text-secondary)] text-xs mr-1">
                                  (ID: {getItemPlantId(item)})
                                </span>
                              )}
                              {getItemName(item)}
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
                    {(() => {
                      const totalPlants = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                      return (
                        <div className="flex justify-between text-[var(--text-secondary)]">
                          <span>Total Plants</span>
                          <span className="font-semibold text-[var(--text-primary)]">{totalPlants}</span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Subtotal</span>
                      <span>{CURRENCY}{(order.originalAmount ?? order.totalAmount)?.toLocaleString('en-IN')}</span>
                    </div>
                    {order.promoCode && order.discountAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <span>🏷️</span>
                          <span className="font-mono font-semibold">{order.promoCode}</span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            ({order.discountType === 'percentage'
                              ? `${order.discountValue}% off`
                              : `${CURRENCY}${order.discountValue} off`})
                          </span>
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          −{CURRENCY}{order.discountAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Discount</span>
                      {editingDiscount === order.id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                            <input
                              type="number"
                              value={discountInput}
                              onChange={(e) => setDiscountInput(e.target.value)}
                              className="input w-20 py-1 px-2 text-right text-sm"
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <button onClick={() => handleSaveDiscount(order.id)} className="text-[var(--color-forest)] text-xs font-medium hover:underline">Save</button>
                          <button onClick={() => setEditingDiscount(null)} className="text-[var(--text-secondary)] text-xs hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className={order.manualDiscount ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-secondary)] italic'}>
                            {order.manualDiscount ? `−${CURRENCY}${order.manualDiscount.toLocaleString('en-IN')}` : 'Not set'}
                          </span>
                          <button
                            onClick={() => { setEditingDiscount(order.id); setDiscountInput(order.manualDiscount?.toString() || ''); }}
                            className="text-xs text-[var(--color-forest)] hover:underline"
                          >
                            {order.manualDiscount ? 'Edit' : 'Add'}
                          </button>
                        </span>
                      )}
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
                      <span>{CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0) - (order.manualDiscount || 0)).toLocaleString('en-IN')}</span>
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

                  {/* Archive cancelled orders without breaking their public links. */}
                  {order.status === 'cancelled' && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                      <button
                        onClick={() => handleArchiveOrder(order.id)}
                        className="btn bg-red-500 text-white hover:bg-red-600 text-sm w-full"
                      >
                        Archive This Order
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
