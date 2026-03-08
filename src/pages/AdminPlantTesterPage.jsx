import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { getAllProducts } from '../services/productService';
import { getLimitedPlants } from '../services/limitedService';
import { CURRENCY } from '../config/constants';
import { resolveImageUrl } from '../utils/imageCompressor';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function AdminPlantTesterPage() {
  const { success, error } = useToast();

  const [items, setItems] = useState([]);
  const [quickInput, setQuickInput] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [showNameAs, setShowNameAs] = useState('title'); // 'common' | 'title'
  const [isExporting, setIsExporting] = useState(false);

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
      let nextItems = []; // Start fresh, overwriting instead of appending

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
            imageUrl: product.imageUrl || product.image || (product.imageUrls && product.imageUrls[0]) || null,
            category: product.category || '',
            _source: product._source || 'product'
          });
        }
      });
      // Update next items (completely replacing the old ones)
      setItems(nextItems);
      
      // Update quick input string to reflect exactly the deduped parsed items
      const newQuickInput = nextItems.map(item => `${item.productId}-${item.quantity}`).join(', ');
      setQuickInput(newQuickInput);

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
    let finalQty = 1;
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      finalQty = existing.quantity + 1;
      setItems(items.map((i) =>
        i.productId === product.id ? { ...i, quantity: finalQty } : i
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
          imageUrl: product.imageUrl || product.image || (product.imageUrls && product.imageUrls[0]) || null,
          category: product.category || '',
          _source: product._source || 'product'
        }
      ]);
    }
    
    // Update the quickInput box with the newly added product
    setQuickInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `${product.id}-1`;
      
      const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
      let found = false;
      const newParts = parts.map(p => {
        if (p.startsWith(`${product.id}-`)) {
          found = true;
          return `${product.id}-${finalQty}`;
        }
        return p;
      });
      
      if (!found) {
        newParts.push(`${product.id}-1`);
      }
      
      return newParts.join(', ');
    });

    setShowSearch(false);
    setSearchQuery('');
  };

  const handleQuantityChange = (productId, delta) => {
    let finalQty = 1;
    setItems(items.map((i) => {
      if (i.productId !== productId) return i;
      finalQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: finalQty };
    }));
    
    // Update the quickInput text box
    setQuickInput((prev) => {
      if (!prev) return prev;
      const parts = prev.split(',').map(p => p.trim()).filter(Boolean);
      // Find the part that has this ID and edit its qty
      const newParts = parts.map(p => {
        if (p.startsWith(`${productId}-`)) {
          return `${productId}-${finalQty}`;
        }
        return p;
      });
      return newParts.join(', ');
    });
  };

  const handleRemoveItem = (productId) => {
    setItems(items.filter((i) => i.productId !== productId));
    
    // Optionally remove it from the quick input string as well
    setQuickInput((prev) => {
      // Split by commas, keep only parts that don't start with this productId
      const parts = prev.split(',').map(p => p.trim()).filter(Boolean);
      const filtered = parts.filter(p => !p.startsWith(`${productId}-`));
      return filtered.join(', ');
    });
  };

  const handleClearAll = () => {
    setItems([]);
    setQuickInput('');
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

  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const getBase64Image = async (url) => {
    try {
      if (!url) return null;
      const resolvedUrl = resolveImageUrl(url);
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Important for CORS
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
          console.warn('Image load error for Base64 (CORS)', url);
          resolve(null);
        };
        img.src = resolvedUrl;
      });
    } catch (err) {
      console.warn('Failed to encode image to base64', url, err);
      return null;
    }
  };

  const generatePDF = async () => {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const ITEMS_PER_PAGE = 10; // Set explicitly to 10 per user request
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

    for (let pageInfo = 0; pageInfo < totalPages; pageInfo++) {
      const startIndex = pageInfo * ITEMS_PER_PAGE;
      const currentItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      const isLastPage = pageInfo === totalPages - 1;

      // Preload all images on this page into base64 to bypass html2canvas CORS clipping
      const itemsWithBase64Images = await Promise.all(
        currentItems.map(async (item) => {
          const base64 = await getBase64Image(item.imageUrl);
          return { ...item, base64 };
        })
      );

      // We create a temporary detached div for rendering this page
      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.top = '-9999px';
      printDiv.style.left = '-9999px';
      printDiv.style.width = '800px'; 
      printDiv.style.backgroundColor = 'white';
      printDiv.style.padding = '40px';
      printDiv.style.color = '#000';
      printDiv.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(printDiv);

      // Build the HTML content to render for this page
      const tableHtml = itemsWithBase64Images.map((item, index) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; text-align: left;">${startIndex + index + 1}</td>
          <td style="padding: 12px 8px; text-align: left;">${item.productId}</td>
          <td style="padding: 12px 8px; text-align: left;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${item.base64 
                  ? `<img src="${item.base64}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;" />` 
                  : `<div style="width: 40px; height: 40px; border-radius: 4px; background-color: #f3f4f6;"></div>`
               }
              <span style="font-weight: 500;">${getDisplayName(item)}</span>
            </div>
          </td>
          <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 8px; text-align: right;">${CURRENCY.replace('₹', 'Rs. ')}${item.price}</td>
          <td style="padding: 12px 8px; text-align: right;">${CURRENCY.replace('₹', 'Rs. ')}${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');

      let headerHtml = '';
      if (pageInfo === 0) {
        // Logo assumes /logo.png exists in public. Using origin to ensure absolute URL for fetch
        const logoUrl = window.location.origin + '/logo.png';
        const logoBase64 = await getBase64Image(logoUrl);

        headerHtml = `
          <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                ${logoBase64 ? `<img src="${logoBase64}" style="width: 60px; height: 60px; object-fit: contain;" />` : ''}
                <div>
                  <h1 style="font-size: 26px; font-weight: bold; margin: 0; color: #111827;">Rosary Plant House</h1>
                  <p style="font-size: 13px; color: #4b5563; margin: 4px 0 0 0;">Premium Indoor & Outdoor Plants</p>
                </div>
              </div>
              <p style="font-size: 12px; color: #6b7280; margin: 20px 0 0 0; line-height: 1.5;">
                <strong>Rosary Plant House</strong><br/>
                Samayapuram, Alwarpet, Coonoor<br/>
                The Nilgiris, Tamil Nadu<br/>
                Phone / WhatsApp: +91 790 405 0237<br/>
                Email: rosaryplanthouse@gmail.com
              </p>
            </div>
            <div style="text-align: right;">
              <h2 style="font-size: 32px; font-weight: bold; margin: 0 0 15px 0; color: #2e7d32; text-transform: uppercase; letter-spacing: 2px;">INVOICE</h2>
              <table style="display: inline-block; font-size: 13px; color: #4b5563;">
                <tr>
                  <td style="text-align: right; padding-right: 15px; padding-bottom: 5px;"><strong>Date:</strong></td>
                  <td style="text-align: left; padding-bottom: 5px;">${currentDate}</td>
                </tr>
                <tr>
                  <td style="text-align: right; padding-right: 15px;"><strong>Total Items:</strong></td>
                  <td style="text-align: left;">${totalQuantity}</td>
                </tr>
              </table>
            </div>
          </div>
          <hr style="border: none; border-top: 2px solid #e5e7eb; margin-bottom: 30px;" />
        `;
      } else {
        headerHtml = `
          <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
            <h2 style="font-size: 18px; font-weight: bold; margin: 0; color: #111827;">Rosary Plant House - Invoice (Cont.)</h2>
            <div style="font-size: 12px; color: #6b7280;">Page ${pageInfo + 1} of ${totalPages}</div>
          </div>
        `;
      }

      let footerHtml = '';
      if (isLastPage) {
        footerHtml = `
          <tfoot>
            <tr style="background-color: #f9fafb; border-top: 2px solid #e5e7eb;">
              <td colspan="3" style="padding: 16px 8px; text-align: left; font-weight: bold; font-size: 16px;">Total</td>
              <td style="padding: 16px 8px; text-align: center; font-weight: bold; font-size: 16px;">${totalQuantity}</td>
              <td></td>
              <td style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #2e7d32;">
                ${CURRENCY.replace('₹', 'Rs. ')}${totalPrice.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        `;
      }

      printDiv.innerHTML = `
        ${headerHtml}
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #2e7d32; color: white;">
              <th style="padding: 12px 8px; text-align: left; font-weight: 600;">#</th>
              <th style="padding: 12px 8px; text-align: left; font-weight: 600;">ID</th>
              <th style="padding: 12px 8px; text-align: left; font-weight: 600;">Name</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 600;">Qty</th>
              <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Price</th>
              <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml}
          </tbody>
          ${footerHtml}
        </table>
      `;

      try {
        // Need a small delay for images to load if they aren't cached
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(printDiv, {
          scale: 2, // High resolution
          useCORS: true,
          allowTaint: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        if (pageInfo > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } finally {
        document.body.removeChild(printDiv);
      }
    }
    
    return pdf;
  };

  const handleExportPDF = async () => {
    if (items.length === 0) {
      error('No plants to export');
      return;
    }
    
    setIsExporting(true);
    try {
      const doc = await generatePDF();
      
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/:/g, '-').replace(/ /g, '_');
      const fileName = `Rosary_Bill_${currentDate.replace(/ /g, '_')}_${timeStr}.pdf`;
      
      doc.save(fileName);
      success('PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (items.length === 0) {
      error('No plants to share');
      return;
    }
    
    try {
      // Create a textual summary for WhatsApp message
      let message = `*🌿 Plant Tester Bill* - ${currentDate}\n\n`;
      
      items.forEach((item, index) => {
        message += `${index + 1}. *${getDisplayName(item)}* (ID: ${item.productId})\n`;
        message += `   Qty: ${item.quantity} x ${CURRENCY}${item.price} = *${CURRENCY}${(item.price * item.quantity).toLocaleString('en-IN')}*\n`;
      });
      
      message += `\n*Total Items:* ${totalQuantity}`;
      message += `\n*Total Amount:* ${CURRENCY}${totalPrice.toLocaleString('en-IN')}`;

      // Encode for URL
      const encodedMessage = encodeURIComponent(message);
      
      // Try to use Web Share API with the PDF if supported (mobile mostly)
      if (navigator.share && navigator.canShare) {
        try {
          // Check if we can share files
          setIsExporting(true);
          const doc = await generatePDF();
          const arrayBuffer = doc.output('arraybuffer');
          
          const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/:/g, '-').replace(/ /g, '_');
          const file = new File([arrayBuffer], `Rosary_Bill_${currentDate.replace(/ /g, '_')}_${timeStr}.pdf`, {
            type: 'application/pdf',
          });
          
          if (navigator.canShare({ files: [file] })) {
             await navigator.share({
              title: 'Plant Tester Bill',
              text: message,
              files: [file]
            });
            success('Shared successfully');
            return;
          }
        } catch (shareErr) {
          console.log('File sharing not supported or failed, falling back to text sharing', shareErr);
        }
      }
      
      // Fallback: Open WhatsApp with just the text
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    } catch (err) {
      console.error('Failed to share via WhatsApp:', err);
      error('Failed to share');
    } finally {
      setIsExporting(false);
    }
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
              <div className="pt-2 space-y-2 border-t border-[var(--border-color)]">
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex-1 btn btn-secondary text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    )}
                    {isExporting ? 'Preparing...' : 'PDF'}
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    disabled={isExporting}
                    className="flex-1 btn btn-primary text-xs flex items-center justify-center gap-1 !bg-[#25D366] hover:!bg-[#128C7E] border-none text-white disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Share
                  </button>
                </div>
                <button
                  onClick={handleClearAll}
                  className="w-full py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
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
