import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

import { getOrderById, updateOrderStatus, updateOrderCustomer, updateDeliveryCharge, updateManualDiscount, updateOrderItems } from '../services/orderService';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import { resolveImageUrl } from '../utils/imageCompressor';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CURRENCY } from '../config/constants';
import OrderItemEditor from '../components/OrderItemEditor';
import { generateInvoicePDF } from '../utils/pdfGenerator';

import ReactMarkdown from 'react-markdown';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function OrderPage() {
  const { orderId } = useParams();
  const { user, isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Customer edit state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomer, setEditCustomer] = useState({});
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Delivery charge state
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryInput, setDeliveryInput] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Manual discount state
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Name toggle state (admin only)
  const [showTitle, setShowTitle] = useState(false);
  const [productNames, setProductNames] = useState({}); // { productId: { title, commonName } }
  const [loadingNames, setLoadingNames] = useState(false);

  // Item editing state
  const [editingItems, setEditingItems] = useState(false);
  const [savingItems, setSavingItems] = useState(false);

  // PDF Exporting state
  // PDF Exporting state
  const [exportingOrder, setExportingOrder] = useState(false);

  // Thank You Popup State
  const [showThanksPopup, setShowThanksPopup] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  useEffect(() => {
    if (order && !isAdmin) { // Only show popup to customers
      const isDismissed = sessionStorage.getItem(`thanksPopupDismissed_${orderId}`) === 'true';
      if (!isDismissed) {
        // Show after a short delay
        const timer = setTimeout(() => {
          setShowThanksPopup(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [order, orderId, isAdmin]);

  const handleCloseThanksPopup = () => {
    sessionStorage.setItem(`thanksPopupDismissed_${orderId}`, 'true');
    setShowThanksPopup(false);
  };


  const loadOrder = async () => {
    try {
      const orderData = await getOrderById(orderId);
      if (orderData) {
        setOrder(orderData);
        setEditCustomer(orderData.customer || {});
        setDeliveryInput(orderData.deliveryCharge?.toString() || '');
        setDiscountInput(orderData.manualDiscount?.toString() || '');

        // Fetch product names for admin toggle
        fetchProductNames(orderData.items);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is the order owner
  const isOrderOwner = user && order?.customer?.userId && user.uid === order.customer.userId;
  const canEditCustomer = isAdmin || isOrderOwner;

  // Fetch product names for toggle
  const fetchProductNames = async (items) => {
    try {
      const names = {};
      for (const item of items) {
        const isLimited = typeof item.productId === 'string' && /^L/i.test(item.productId);
        let product = null;
        try {
          product = isLimited
            ? await getLimitedById(item.productId)
            : await getProductById(item.productId);
        } catch {
          // ignore individual failures
        }

        if (product) {
          const title = product.title || item.name || product.name || product.commonName;
          const commonName = product.commonName || product.name || item.name || title;
          const plantId = product.id || item.productId;
          names[item.productId] = { 
            title, 
            commonName, 
            plantId,
            description: product.description,
            watering: product.watering,
            sunlight: product.sunlight,
            transit: product.transit
          };
        } else {
          names[item.productId] = { title: item.name, commonName: item.name, plantId: item.productId };
        }
      }
      setProductNames(names);
    } catch (err) {
      console.error('Failed to load product names:', err);
    }
  };

  const handleToggleNames = () => {
    setShowTitle(prev => !prev);
  };

  const getItemName = (item) => {
    const names = productNames[item.productId];
    if (!names) return item.name;

    // For non-admin viewers, always show the Title/Display name.
    if (!isAdmin) {
      return names.title;
    }

    // Admins can toggle between Title and Common Name.
    return showTitle ? names.title : names.commonName;
  };

  const getItemPlantId = (item) => {
    const names = productNames[item.productId];
    if (names?.plantId) return names.plantId;
    return item.productId || '';
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder(prev => ({ ...prev, status: newStatus }));
      success(`Status updated to ${newStatus}`);
    } catch (err) {
      showError('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveCustomer = async () => {
    setSavingCustomer(true);
    try {
      await updateOrderCustomer(order.id, editCustomer);
      setOrder(prev => ({ ...prev, customer: editCustomer }));
      setIsEditingCustomer(false);
      success('Customer details updated!');
    } catch (err) {
      showError('Failed to update details');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleCancelEdit = () => {
    setEditCustomer(order.customer || {});
    setIsEditingCustomer(false);
  };

  const handleSaveDelivery = async () => {
    setSavingDelivery(true);
    try {
      const charge = parseFloat(deliveryInput) || 0;
      await updateDeliveryCharge(order.id, charge);
      setOrder(prev => ({ ...prev, deliveryCharge: charge }));
      setEditingDelivery(false);
      success('Delivery charge updated!');
    } catch (err) {
      showError('Failed to update delivery charge');
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    try {
      const discount = parseFloat(discountInput) || 0;
      await updateManualDiscount(order.id, discount);
      setOrder(prev => ({ ...prev, manualDiscount: discount }));
      setEditingDiscount(false);
      success('Discount updated!');
    } catch (err) {
      showError('Failed to update discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleSaveItems = async (newItems) => {
    setSavingItems(true);
    try {
      const result = await updateOrderItems(order.id, newItems);
      setOrder(prev => {
        const updated = {
          ...prev,
          items: newItems,
          totalItems: result.totalItems,
          totalAmount: result.totalAmount,
          originalAmount: result.originalAmount,
          discountAmount: result.promoRemoved ? 0 : (result.discountAmount ?? prev.discountAmount)
        };
        if (result.promoRemoved) {
          delete updated.promoCode;
          delete updated.discountType;
          delete updated.discountValue;
          delete updated.originalAmount;
        }
        return updated;
      });
      setEditingItems(false);
      fetchProductNames(newItems);
      if (result.promoRemoved) {
        success('Items updated. Promo removed — order total is below the minimum.');
      } else {
        success('Order items updated!');
      }
    } catch (err) {
      showError('Failed to update items');
    } finally {
      setSavingItems(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingOrder(true);
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
      showError('Failed to generate PDF invoice');
    } finally {
      setExportingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in text-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--color-forest)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[var(--text-secondary)] mt-4">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">📋</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Order Not Found</h2>
        <p className="text-[var(--text-secondary)] mt-2">{error || 'This order does not exist.'}</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Back to Home
        </NavLink>
      </div>
    );
  }

  if (order.status === 'cancelled' && !isAdmin) {
    return (
      <div className="animate-fade-in text-center py-12">
        <span className="text-5xl">📋</span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-4">Order Not Found</h2>
        <p className="text-[var(--text-secondary)] mt-2">This order is no longer available.</p>
        <NavLink to="/" className="btn btn-primary mt-4">
          Back to Home
        </NavLink>
      </div>
    );
  }

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
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto relative">
      {/* Thank You & Promo Popup */}
      {showThanksPopup && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white dark:bg-[var(--bg-primary)] w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden relative animate-slide-up border-[3px] border-[var(--color-forest)] p-1"
            role="dialog"
          >
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-800/40 rounded-[20px] p-6 text-center relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-green-300/40 dark:bg-green-600/30 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-emerald-300/40 dark:bg-emerald-600/30 rounded-full blur-xl pointer-events-none"></div>
                <button
                  onClick={handleCloseThanksPopup}
                  className="absolute top-3 right-3 p-1.5 text-green-700 bg-green-200/50 hover:bg-green-300/50 rounded-full transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <img src={logo} alt="Rosary Plant House" className="w-16 h-16 mx-auto mb-3 animate-bounce-slow object-contain" />
                <h2 className="text-2xl font-black text-green-800 dark:text-green-300 mb-2 font-serif">
                  Thank You{order?.customer?.name ? `, ${order.customer.name}` : "" }! 🌿
                </h2>

                <p className="text-green-700 dark:text-green-300/90 text-sm mb-5 font-medium">
                  We're so glad you chose Rosary Plant House!
                </p>
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-4 border border-green-200 dark:border-green-800/50 mb-2 shadow-inner">
                  <div className="text-3xl mb-2">🎁</div>
                  <p className="text-xs text-green-800 dark:text-green-200 font-bold mb-1 tracking-wider uppercase">Claim Free Plant</p>
                  <p className="text-[12px] text-green-700 dark:text-green-300/90 leading-relaxed font-medium">
                      Post an Insta story with your beautiful plants bought from rosary plant house and tag <strong>@rosary_plant_house</strong> to get a <strong className="text-green-800 dark:text-green-200">Complimentary Plant</strong> on your next order! 📸
                  </p>
                </div>
                {/* Social Links inside Popup */}
                <div className="flex flex-wrap justify-center gap-3 mt-5 mb-2">
                  <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:scale-110 shadow-md transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                  <a href="https://facebook.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2.5 bg-[#1877F2] text-white rounded-full hover:scale-110 shadow-md transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2.5 bg-[#25D366] text-white rounded-full hover:scale-110 shadow-md transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.996 0A12 12 0 000 12c0 2.115.553 4.103 1.528 5.819L.085 23.44l5.776-1.503A11.928 11.928 0 0011.996 24C18.625 24 24 18.625 24 12 24 5.375 18.625 0 11.996 0zm0 22a9.94 9.94 0 01-5.1-1.405l-.364-.216-3.8.989 1.01-3.666-.237-.37A9.957 9.957 0 012 12c0-5.514 4.486-10 10-10 5.513 0 9.996 4.486 9.996 10 0 5.514-4.483 10-9.996 10zm5.492-7.48c-.301-.15-1.782-.876-2.062-.976-.28-.1-.482-.15-.685.15-.203.3-.781.976-.957 1.176-.176.2-.353.226-.653.076-1.353-.679-2.4-1.99-2.883-2.827-.176-.3-.018-.466.132-.616.135-.135.301-.351.452-.527.15-.176.2-.301.3-.502.1-.201.05-.376-.025-.526-.075-.15-.685-1.652-.938-2.261-.247-.594-.497-.514-.685-.524-.176-.008-.378-.01-.58-.01a1.115 1.115 0 00-.803.376c-.276.3-1.053 1.026-1.053 2.503 0 1.477 1.078 2.903 1.228 3.103.15.2 2.112 3.221 5.115 4.516.716.309 1.275.494 1.71.632.72.23 1.373.197 1.888.119.578-.088 1.782-.728 2.033-1.43.25-.702.25-1.303.175-1.43-.075-.126-.276-.201-.577-.35z"/></svg>
                  </a>
                  <a href="https://rosaryplanthouse.com" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center justify-center p-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full hover:scale-110 shadow-md transition-transform">
                    <span className="text-sm leading-none">🌐</span>
                  </a>
                </div>
                <button 
                  onClick={handleCloseThanksPopup}
                  className="mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/20 hover:scale-[1.02] transition-transform"
                >
                  Awesome, got it! 💚
                </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Promotional Ad Section */}
      {!isAdmin && (
      <div className="card p-6 mb-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 border-2 border-green-200 dark:border-green-800 shadow-sm relative overflow-hidden">
        {/* Decorative background leaf/circle */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-200/50 dark:bg-green-700/30 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-200/50 dark:bg-emerald-700/30 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="text-center relative z-10">
          <h2 className="text-2xl font-black text-green-800 dark:text-green-300 mb-2 font-serif">
            Join Our Plant Family! 🌿
          </h2>
          <p className="text-sm md:text-base text-green-700 dark:text-green-300/90 mb-6 max-w-lg mx-auto leading-relaxed">
            Follow us for daily plant care tips, exciting new arrivals, and exclusive offers. 
            <br className="hidden md:block"/>
            <span className="font-semibold text-green-800 dark:text-green-200 mt-2 block bg-white/50 dark:bg-black/20 py-2 px-3 rounded-lg">
              📸 Tag us in your Instagram story with your beautiful new plants to get a Complimentary Plant on your next order!
            </span>
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <a href="https://instagram.com/rosary_plant_house" target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full font-bold text-sm hover:scale-105 hover:shadow-lg transition-all duration-300 group">
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>
            <a href="https://facebook.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white rounded-full font-bold text-sm hover:scale-105 hover:bg-[#166fe5] hover:shadow-lg transition-all duration-300 group">
              <svg className="w-5 h-5 group-hover:-rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
            <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-full font-bold text-sm hover:scale-105 hover:bg-[#20bd5a] hover:shadow-lg transition-all duration-300 group">
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M11.996 0A12 12 0 000 12c0 2.115.553 4.103 1.528 5.819L.085 23.44l5.776-1.503A11.928 11.928 0 0011.996 24C18.625 24 24 18.625 24 12 24 5.375 18.625 0 11.996 0zm0 22a9.94 9.94 0 01-5.1-1.405l-.364-.216-3.8.989 1.01-3.666-.237-.37A9.957 9.957 0 012 12c0-5.514 4.486-10 10-10 5.513 0 9.996 4.486 9.996 10 0 5.514-4.483 10-9.996 10zm5.492-7.48c-.301-.15-1.782-.876-2.062-.976-.28-.1-.482-.15-.685.15-.203.3-.781.976-.957 1.176-.176.2-.353.226-.653.076-1.353-.679-2.4-1.99-2.883-2.827-.176-.3-.018-.466.132-.616.135-.135.301-.351.452-.527.15-.176.2-.301.3-.502.1-.201.05-.376-.025-.526-.075-.15-.685-1.652-.938-2.261-.247-.594-.497-.514-.685-.524-.176-.008-.378-.01-.58-.01a1.115 1.115 0 00-.803.376c-.276.3-1.053 1.026-1.053 2.503 0 1.477 1.078 2.903 1.228 3.103.15.2 2.112 3.221 5.115 4.516.716.309 1.275.494 1.71.632.72.23 1.373.197 1.888.119.578-.088 1.782-.728 2.033-1.43.25-.702.25-1.303.175-1.43-.075-.126-.276-.201-.577-.35z"/></svg>
              WhatsApp
            </a>
            <a href="https://rosaryplanthouse.com" target="_blank" rel="noopener noreferrer" 
               className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full font-bold text-sm hover:scale-105 hover:bg-slate-700 dark:hover:bg-slate-300 hover:shadow-lg transition-all duration-300 group">
              <span className="text-xl leading-none group-hover:scale-110 transition-transform">🌐</span> Website
            </a>
          </div>
        </div>
      </div>
      )}

      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Order Details</h1>
          <span className={`badge ${getStatusColor(order.status)} capitalize`}>
            {order.status}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Order ID: <span className="font-mono font-medium text-[var(--text-primary)]">{order.orderId}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Placed on: {formatDate(order.createdAt)}
        </p>
      </div>

      {/* Admin: Update Status */}
      {isAdmin && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={updatingStatus || order.status === status}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${order.status === status
                    ? getStatusColor(status) + ' ring-2 ring-offset-2 ring-[var(--color-forest)] dark:ring-offset-[var(--bg-primary)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                  }
                  ${updatingStatus ? 'opacity-50 cursor-wait' : ''}
                `}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer Details */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--text-primary)]">Delivery Details</h2>
          {canEditCustomer && !isEditingCustomer && (
            <button
              onClick={() => setIsEditingCustomer(true)}
              className="text-sm text-[var(--color-forest)] hover:underline font-medium"
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {isEditingCustomer ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Name</label>
              <input
                type="text"
                value={editCustomer.name || ''}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={editCustomer.phone || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="input"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">WhatsApp</label>
                <input
                  type="tel"
                  value={editCustomer.whatsapp || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="input"
                  placeholder="WhatsApp number"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Address</label>
              <textarea
                value={editCustomer.address || ''}
                onChange={(e) => setEditCustomer(prev => ({ ...prev, address: e.target.value }))}
                className="input min-h-[70px] resize-none"
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Pincode</label>
                <input
                  type="text"
                  value={editCustomer.pincode || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, pincode: e.target.value }))}
                  className="input"
                  placeholder="Pincode"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">District</label>
                <input
                  type="text"
                  value={editCustomer.district || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, district: e.target.value }))}
                  className="input"
                  placeholder="District"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">State</label>
                <input
                  type="text"
                  value={editCustomer.state || ''}
                  onChange={(e) => setEditCustomer(prev => ({ ...prev, state: e.target.value }))}
                  className="input"
                  placeholder="State"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {savingCustomer ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">Name:</span> {order.customer.name || 'N/A'}
            </p>
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">Phone:</span> {order.customer.phone || 'N/A'}
            </p>
            {order.customer.whatsapp && order.customer.whatsapp !== order.customer.phone && (
              <p className="text-[var(--text-primary)]">
                <span className="text-[var(--text-secondary)]">WhatsApp:</span> {order.customer.whatsapp}
              </p>
            )}
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">Address:</span> {order.customer.address || 'N/A'}
            </p>
            {(order.customer.district || order.customer.state || order.customer.pincode) && (
              <p className="text-[var(--text-primary)]">
                <span className="text-[var(--text-secondary)]">Location:</span>{' '}
                {[order.customer.district, order.customer.state, order.customer.pincode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
      {/* Items */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--text-primary)]">Items ({order.totalItems})</h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditingItems(!editingItems)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${editingItems ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {editingItems ? '✕ Cancel' : '✏️ Edit Items'}
              </button>
            )}
            {isAdmin && !editingItems && (
              <button
                onClick={handleToggleNames}
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
            )}
          </div>
        </div>
        {editingItems && isAdmin ? (
          <OrderItemEditor items={order.items} onSave={handleSaveItems} saving={savingItems} />
        ) : (
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex gap-3 pb-3 border-b border-[var(--border-color)] last:border-0 last:pb-0">
              {item.imageUrl && (
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--text-primary)] truncate">
                  {index + 1}.{' '}
                  {getItemPlantId(item) && (
                    <span className="text-[var(--text-secondary)] text-xs mr-1">
                      (ID: {getItemPlantId(item)})
                    </span>
                  )}
                  {getItemName(item)}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {CURRENCY}{item.price} × {item.quantity} = {CURRENCY}{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
                {!isAdmin && ['confirmed', 'shipped', 'delivered', 'completed'].includes(order.status?.toLowerCase()) && productNames[item.productId] && (
                  <div className="mt-3 bg-[var(--bg-tertiary)] rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-wide">Care Instructions</h4>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex flex-col items-center p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] gap-1">
                        <span className="text-lg">💧</span>
                        <p className="text-[9px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Water</p>
                        <p className="text-[10px] font-bold text-[var(--text-primary)] text-center">{productNames[item.productId].watering || 'Moderate'}</p>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-color)] gap-1">
                        <span className="text-lg">☀️</span>
                        <p className="text-[9px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">Sunlight</p>
                        <p className="text-[10px] font-bold text-[var(--text-primary)] text-center">{productNames[item.productId].sunlight || 'Moderate'}</p>
                      </div>
                    </div>
                    {productNames[item.productId].description && (
                      <details open className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-color)] group">
                        <summary className="text-[10px] font-semibold text-[var(--text-primary)] uppercase tracking-wide cursor-pointer list-none flex items-center justify-between select-none p-1 -m-1 rounded hover:bg-[var(--bg-secondary)]">
                          Plant Description
                          <span className="text-[8px] transition-transform duration-200 group-open:rotate-180">▼</span>
                        </summary>
                        <div className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {(() => {
                            const raw = productNames[item.productId].description.replace(/Â/g, '');
                            const sections = raw.split(/^## /m);
                            const mdComponents = {
                              p: ({children}) => <p style={{margin: '0.35rem 0'}}>{children}</p>,
                              ul: ({children}) => <ul style={{margin: '0.35rem 0', paddingLeft: '1.25rem', listStyleType: 'disc'}}>{children}</ul>,
                              ol: ({children}) => <ol style={{margin: '0.35rem 0', paddingLeft: '1.25rem', listStyleType: 'decimal'}}>{children}</ol>,
                              li: ({children}) => <li style={{margin: '0.15rem 0'}}>{children}</li>,
                              strong: ({children}) => <strong style={{color: 'var(--text-primary)', fontWeight: 600}}>{children}</strong>,
                              h1: ({children}) => <h3 style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem'}}>{children}</h3>,
                              h2: () => null,
                              h3: ({children}) => <h5 style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.4rem 0 0.2rem'}}>{children}</h5>,
                            };
                            return sections.map((section, i) => {
                              if (i === 0) {
                                // Content before the first ## heading
                                return section.trim() ? <ReactMarkdown key={i} components={mdComponents}>{section.trim()}</ReactMarkdown> : null;
                              }
                              const newlineIdx = section.indexOf('\n');
                              const heading = newlineIdx !== -1 ? section.slice(0, newlineIdx).trim() : section.trim();
                              const body = newlineIdx !== -1 ? section.slice(newlineIdx + 1).trim() : '';
                              return (
                                <details key={i} className="group/section border-b border-[var(--border-color)] last:border-0">
                                  <summary
                                    className="cursor-pointer list-none flex items-center justify-between select-none py-2 rounded hover:bg-[var(--bg-secondary)]"
                                    style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)'}}
                                  >
                                    {heading}
                                    <span className="text-[8px] transition-transform duration-200 group-open/section:rotate-180 ml-2 flex-shrink-0">▼</span>
                                  </summary>
                                  {body && (
                                    <div className="pb-2">
                                      <ReactMarkdown components={mdComponents}>{body}</ReactMarkdown>
                                    </div>
                                  )}
                                </details>
                              );
                            });
                          })()}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-2">
          {/* Subtotal — show original pre-discount amount when a promo was used */}
          <div className="flex justify-between text-sm text-[var(--text-secondary)]">
            <span>Subtotal</span>
            <span>{CURRENCY}{(order.originalAmount ?? order.totalAmount).toLocaleString('en-IN')}</span>
          </div>

          {/* Promo discount row */}
          {order.promoCode && order.discountAmount > 0 && (
            <div className="flex justify-between items-center text-sm">
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

          {/* Manual Discount */}
          {(isAdmin || order.manualDiscount > 0) && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Discount</span>
            {isAdmin && editingDiscount ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                  <input
                    type="number"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="input w-24 py-1 px-2 text-right text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleSaveDiscount}
                  disabled={savingDiscount}
                  className="text-[var(--color-forest)] text-xs font-medium hover:underline"
                >
                  {savingDiscount ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingDiscount(false); setDiscountInput(order.manualDiscount?.toString() || ''); }}
                  className="text-[var(--text-secondary)] text-xs hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <span className={order.manualDiscount ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-secondary)] italic'}>
                  {order.manualDiscount ? `−${CURRENCY}${order.manualDiscount.toLocaleString('en-IN')}` : 'Not set'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditingDiscount(true)}
                    className="text-xs text-[var(--color-forest)] hover:underline"
                  >
                    {order.manualDiscount ? 'Edit' : 'Add'}
                  </button>
                )}
              </span>
            )}
          </div>
          )}

          {/* Delivery Charge */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Delivery</span>
            {isAdmin && editingDelivery ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-secondary)]">{CURRENCY}</span>
                  <input
                    type="number"
                    value={deliveryInput}
                    onChange={(e) => setDeliveryInput(e.target.value)}
                    className="input w-24 py-1 px-2 text-right text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleSaveDelivery}
                  disabled={savingDelivery}
                  className="text-[var(--color-forest)] text-xs font-medium hover:underline"
                >
                  {savingDelivery ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingDelivery(false); setDeliveryInput(order.deliveryCharge?.toString() || ''); }}
                  className="text-[var(--text-secondary)] text-xs hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <span className={order.deliveryCharge ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] italic'}>
                  {order.deliveryCharge ? `${CURRENCY}${order.deliveryCharge.toLocaleString('en-IN')}` : 'Not set'}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditingDelivery(true)}
                    className="text-xs text-[var(--color-forest)] hover:underline"
                  >
                    {order.deliveryCharge ? 'Edit' : 'Add'}
                  </button>
                )}
              </span>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between text-lg font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
            <span>Total</span>
            <span>{CURRENCY}{((order.totalAmount || 0) + (order.deliveryCharge || 0) - (order.manualDiscount || 0)).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>




      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <NavLink to="/" className="btn btn-secondary flex-1">
          Continue Shopping
        </NavLink>
        {isAdmin && (
          <button
            onClick={handleExportPDF}
            disabled={exportingOrder}
            className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {exportingOrder ? (
              <span className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
            ) : '📄'}
            {exportingOrder ? 'Generating PDF...' : 'Download PDF Bill'}
          </button>
        )}
      </div>
    </div>
  );
}
