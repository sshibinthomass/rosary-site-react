import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { resolveImageUrl } from './imageCompressor';
import { CURRENCY } from '../config/constants';

const ITEMS_PER_PAGE = 10;

const getBase64Image = async (url) => {
  try {
    if (!url) return null;
    const resolvedUrl = resolveImageUrl(url);
    
    return new Promise((resolve) => {
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

/**
 * Generates an a4-sized invoice PDF for an order
 * @param {Object} orderData - The order data to format 
 * @param {Array} items - The items array to render
 * @param {Function} getDisplayName - Function to get the display name of an item
 * @returns {jsPDF} The exported jsPDF document instance
 */
export const generateInvoicePDF = async (orderData, items, getDisplayName) => {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4'
  });

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const itemsSubtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discountAmount = orderData.promoCode && orderData.discountAmount > 0 ? orderData.discountAmount : 0;
  const manualDiscount = orderData.manualDiscount || 0;
  const deliveryCharge = orderData.deliveryCharge || 0;
  const grandTotal = (itemsSubtotal - discountAmount - manualDiscount) + deliveryCharge;

  for (let pageInfo = 0; pageInfo < totalPages; pageInfo++) {
    const startIndex = pageInfo * ITEMS_PER_PAGE;
    const currentItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const isLastPage = pageInfo === totalPages - 1;

    // Preload all images on this page into base64 to bypass html2canvas CORS clipping
    const itemsWithBase64Images = await Promise.all(
      currentItems.map(async (item) => {
        const base64 = await getBase64Image(item.imageUrl || item.image);
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
        <td style="padding: 12px 8px; text-align: left;">${item.productId || ''}</td>
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
                <p style="font-size: 13px; color: #4b5563; margin: 4px 0 0 0;">Hand-picked Plants from the Queen of Hills</p>
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
                <td style="text-align: right; padding-right: 15px; padding-bottom: 5px;"><strong>Order ID:</strong></td>
                <td style="text-align: left; padding-bottom: 5px;">${orderData.orderId || 'Plant Tester'}</td>
              </tr>
              <tr>
                <td style="text-align: right; padding-right: 15px; padding-bottom: 5px;"><strong>Date:</strong></td>
                <td style="text-align: left; padding-bottom: 5px;">${orderData.dateFormatted}</td>
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

      if (orderData.customer) {
        const c = orderData.customer;
        const addressLines = [c.address, c.district, c.state, c.pincode].filter(Boolean).join(', ');
        const contactLine = [c.phone, c.whatsapp].filter(Boolean).filter((val, i, arr) => arr.indexOf(val) === i).join(' / ');
        
        headerHtml += `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin: 0 0 8px 0; text-transform: uppercase;">Billed To:</h3>
            <div style="font-size: 14px; color: #111827; padding: 12px; background-color: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; display: inline-block; min-width: 250px;">
              <strong>${c.name || 'Customer'}</strong><br/>
              ${addressLines}<br/>
              ${contactLine ? `${contactLine}` : ''}
            </div>
          </div>
        `;
      }

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
            <td colspan="3" style="padding: 16px 8px; text-align: left; font-weight: bold; font-size: 16px;">Subtotal</td>
            <td style="padding: 16px 8px; text-align: center; font-weight: bold; font-size: 16px;">${totalQuantity}</td>
            <td></td>
            <td style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 16px;">
              ${CURRENCY.replace('₹', 'Rs. ')}${itemsSubtotal.toLocaleString('en-IN')}
            </td>
          </tr>
      `;

      if (discountAmount > 0) {
        footerHtml += `
          <tr style="background-color: #f9fafb;">
            <td colspan="5" style="padding: 8px 8px; text-align: right; font-size: 14px; color: #16a34a;">
              Discount (${orderData.promoCode || 'Promo'})
            </td>
            <td style="padding: 8px 8px; text-align: right; font-size: 14px; color: #16a34a;">
              -${CURRENCY.replace('₹', 'Rs. ')}${discountAmount.toLocaleString('en-IN')}
            </td>
          </tr>
        `;
      }

      if (manualDiscount > 0) {
        footerHtml += `
          <tr style="background-color: #f9fafb;">
            <td colspan="5" style="padding: 8px 8px; text-align: right; font-size: 14px; color: #16a34a;">
              Discount
            </td>
            <td style="padding: 8px 8px; text-align: right; font-size: 14px; color: #16a34a;">
              -${CURRENCY.replace('₹', 'Rs. ')}${manualDiscount.toLocaleString('en-IN')}
            </td>
          </tr>
        `;
      }

      if (deliveryCharge > 0) {
        footerHtml += `
          <tr style="background-color: #f9fafb;">
            <td colspan="5" style="padding: 8px 8px; text-align: right; font-size: 14px; color: #4b5563;">
              Delivery Charge
            </td>
            <td style="padding: 8px 8px; text-align: right; font-size: 14px; color: #4b5563;">
              ${CURRENCY.replace('₹', 'Rs. ')}${deliveryCharge.toLocaleString('en-IN')}
            </td>
          </tr>
        `;
      }

      if (discountAmount > 0 || manualDiscount > 0 || deliveryCharge > 0) {
        footerHtml += `
          <tr style="background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
            <td colspan="5" style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #2e7d32;">
              Grand Total
            </td>
            <td style="padding: 16px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #2e7d32;">
              ${CURRENCY.replace('₹', 'Rs. ')}${grandTotal.toLocaleString('en-IN')}
            </td>
          </tr>
        `;
      }

      footerHtml += `</tfoot>`;
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
