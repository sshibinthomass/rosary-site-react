import{r as c,j as t,N as B}from"./vendor-react-Drkgvv_v.js";import{b as Te,g as X,u as k,j as Z,f as Ue,h as qe,e as ze,i as Re}from"./orderService-SA36ilnU.js";import{b as Be,d as Me,e as _e,C as m,r as He,A as C}from"./index-ChkRpyuM.js";import{O as Ve}from"./OrderItemEditor-Bb5IsDdN.js";import{g as We}from"./pdfGenerator-sKk19DM1.js";import"./vendor-firebase-lKfkPGEE.js";const ee=["pending","confirmed","shipped","delivered","cancelled"];function Ze(){const{error:i,success:p}=Be(),[x,u]=c.useState([]),[te,se]=c.useState(!0),[M,ae]=c.useState(null),[d,ne]=c.useState("all"),[L,re]=c.useState(!1),[_,le]=c.useState({}),[ie,F]=c.useState(null),[H,V]=c.useState(""),[oe,E]=c.useState(null),[W,Q]=c.useState(""),[S,Y]=c.useState(null),[de,G]=c.useState(!1),[T,ce]=c.useState(""),[D,$]=c.useState(null),[b,y]=c.useState({name:"",phone:"",whatsapp:"",address:"",district:"",state:"",pincode:""}),[g,v]=c.useState([]),[U,K]=c.useState(null);c.useEffect(()=>{xe()},[]),c.useEffect(()=>{v([])},[d]);const xe=async()=>{try{const e=await Te();u(e);const s=new Set;e.forEach(n=>n.items?.forEach(r=>s.add(r.productId)));const a={};await Promise.all(Array.from(s).map(async n=>{try{const l=typeof n=="string"&&/^L/i.test(n)?await Me(n):await _e(n);if(l){const P=l.title||l.name||l.commonName,A=l.commonName||l.name||l.title||P,j=l.id||n;a[n]={title:P,commonName:A,plantId:j}}}catch{}})),le(a)}catch(e){console.error("Error loading orders:",e),i("Failed to load orders")}finally{se(!1)}},q=e=>e?(e.toDate?e.toDate():new Date(e)).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"N/A",pe=e=>{switch(e){case"pending":return"bg-yellow-100 text-yellow-700";case"confirmed":return"bg-blue-100 text-blue-700";case"shipped":return"bg-purple-100 text-purple-700";case"delivered":return"bg-green-100 text-green-700";case"cancelled":return"bg-red-100 text-red-700";default:return"bg-gray-100 text-gray-700"}},me=e=>{ae(M===e?null:e)},ue=e=>{if(e.status!=="pending"||!e.createdAt)return!1;const s=e.createdAt.toDate?e.createdAt.toDate():new Date(e.createdAt);return(Date.now()-s.getTime())/(1e3*60*60*24)>5},he=e=>{v(s=>s.includes(e)?s.filter(a=>a!==e):[...s,e])},ge=e=>{e.length&&v(s=>s.filter(a=>!e.includes(a)))},I=e=>{const s=e.map(n=>n.id);if(!s.length)return;if(s.every(n=>g.includes(n)))ge(s);else{const n=new Set([...g,...s]);v(Array.from(n))}},fe=()=>{const e=x.filter(r=>r.status==="confirmed"&&g.includes(r.id));if(!e.length){i("Please select at least one order to print addresses");return}const s=window.open("","_blank");if(!s){i("Please allow pop-ups to print addresses");return}const n=`
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
            ${e.map(r=>{const l=r.customer||{},P=l.name||"Customer",A=[l.address].filter(Boolean).join("<br />"),j=(l.phone||"").trim(),N=(l.whatsapp||"").trim();let w="";j&&N&&j!==N?w=`${j}, ${N}`:j||N?w=j||N:l.userId&&(w=`User: ${l.userId}`);const Ie=X(r.id),Pe=`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(Ie)}`,Ae=`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent("https://instagram.com/rosary_plant_house")}`,Oe=C.startsWith("http")?C:C.startsWith("/")?window.location.origin+C:window.location.origin+"/"+C,Le=(r.items||[]).reduce((R,O)=>R+O.price*O.quantity,0),Fe=(r.items||[]).reduce((R,O)=>R+(O.quantity||1),0),Ee=Le>1e3;return`
          <div class="page">
            <!-- Original Address Label (Top) -->
            <div class="label">
              <div class="label-header">
                <div class="label-title">Rosary Plant House</div>
                <div class="label-order-id">
                  <span class="label-order-id-value">${r.orderId||r.id}</span>
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
                    <div class="customer-name">${P}</div>
                    ${A?`<div class="customer-address">${A}</div>`:""}
                    <div>
                      <span class="field-label">State :</span> ${l.state||""}
                    </div>
                    <div style="font-weight: bold; font-size: 15px;">
                      <span class="field-label">Pincode :</span> ${l.pincode||""}
                    </div>
                    ${w?`<div class="customer-phone"><span class="field-label">Phone :</span> ${w}</div>`:""}
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
                  <img src="${Oe}" alt="Logo" class="header-logo" onerror="this.style.display='none'" />
                  <div class="header-text-container">
                    <h2>Dear Plant Parent, Thank You! 🌿</h2>
                    <p class="tagline">Bringing Nature's Finest Succulents & Plants to You</p>
                  </div>
                </div>
              </div>
              
              <div class="thank-you-content">
                <div class="thank-you-text">
                  <h3>Order Details</h3>
                  <div class="detail-row"><span>Order ID:</span> <strong>${r.orderId||r.id}</strong></div>
                  <div class="detail-row"><span>Items:</span> <strong>${Fe} plants</strong></div>
                  
                  ${Ee?`
                    <div class="complimentary-msg">
                      🪴 Hope you liked your complimentary plant! 
                    </div>
                  `:""}

                  <h3 style="margin-top: 15px;">Plant Care Tips</h3>
                  <ul class="care-list">
                    <li>Unpack your plants immediately upon arrival.</li>
                    <li>Keep them in a shaded, well-ventilated area for a few days to recover from transit shock before moving to bright light.</li>
                  </ul>
                  
                  <div class="promo-box">
                    <div class="promo-text">
                      <strong>Post an insta story</strong>, tag us and get a <br/><strong>Complimentary Plant next time!</strong>
                    </div>
                    <img src="${Ae}" alt="Insta QR" class="promo-qr" />
                  </div>
                  
                  <div class="contact-footer flex-contact">
                    <div>🌐 rosaryplanthouse.com</div>
                    <div>📞 +91 7904050237</div>
                  </div>
                </div>
                
                <div class="thank-you-qr-section border-left-divider">
                  <div class="qr-container">
                    <img src="${Pe}" alt="Order QR Code" />
                  </div>
                  <div class="qr-text">Scan for Plant Care Tips & Bill</div>
                  <div class="qr-details">
                    Includes: About, Origin, Temp & Humidity, Growth, Watering, Sunlight, Care Tips & Common Problems
                  </div>
                </div>
              </div>
            </div>
          </div>
        `}).join("")}
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `;s.document.open(),s.document.write(n),s.document.close()},ve=async()=>{if(d!=="cancelled"&&d!=="delivered")return;const e=x.filter(a=>a.status===d&&g.includes(a.id));if(!e.length){i("Please select at least one order to delete");return}const s=d==="cancelled"?"cancelled":"delivered";if(window.confirm(`Are you sure you want to permanently delete ${e.length} ${s} order(s)?`))try{await Promise.all(e.map(n=>Z(n.id)));const a=new Set(e.map(n=>n.id));u(n=>n.filter(r=>!a.has(r.id))),v([]),p(`Deleted ${e.length} ${s} order(s)`)}catch(a){console.error("Error deleting selected orders:",a),i("Failed to delete selected orders")}},be=async()=>{if(d!=="shipped")return;const e=x.filter(s=>s.status==="shipped"&&g.includes(s.id));if(!e.length){i("Please select at least one shipped order");return}if(window.confirm(`Mark ${e.length} shipped order(s) as delivered?`))try{await Promise.all(e.map(a=>k(a.id,"delivered")));const s=new Set(e.map(a=>a.id));u(a=>a.map(n=>s.has(n.id)?{...n,status:"delivered"}:n)),v([]),p(`Updated ${e.length} order(s) to delivered`)}catch(s){console.error("Error updating shipped orders to delivered:",s),i("Failed to update selected orders")}},ye=async()=>{if(d!=="pending")return;const e=x.filter(s=>s.status==="pending"&&g.includes(s.id));if(!e.length){i("Please select at least one pending order");return}if(window.confirm(`Mark ${e.length} pending order(s) as confirmed?`))try{await Promise.all(e.map(a=>k(a.id,"confirmed")));const s=new Set(e.map(a=>a.id));u(a=>a.map(n=>s.has(n.id)?{...n,status:"confirmed"}:n)),v([]),p(`Updated ${e.length} order(s) to confirmed`)}catch(s){console.error("Error updating pending orders to confirmed:",s),i("Failed to update selected orders")}},je=async()=>{if(d!=="pending")return;const e=x.filter(s=>s.status==="pending"&&g.includes(s.id));if(!e.length){i("Please select at least one pending order");return}if(window.confirm(`Mark ${e.length} pending order(s) as cancelled?`))try{await Promise.all(e.map(a=>k(a.id,"cancelled")));const s=new Set(e.map(a=>a.id));u(a=>a.map(n=>s.has(n.id)?{...n,status:"cancelled"}:n)),v([]),p(`Updated ${e.length} order(s) to cancelled`)}catch(s){console.error("Error updating pending orders to cancelled:",s),i("Failed to update selected orders")}},Ne=async()=>{if(d!=="confirmed")return;const e=x.filter(s=>s.status==="confirmed"&&g.includes(s.id));if(!e.length){i("Please select at least one confirmed order");return}if(window.confirm(`Mark ${e.length} confirmed order(s) as shipped?`))try{await Promise.all(e.map(a=>k(a.id,"shipped")));const s=new Set(e.map(a=>a.id));u(a=>a.map(n=>s.has(n.id)?{...n,status:"shipped"}:n)),v([]),p(`Updated ${e.length} order(s) to shipped`)}catch(s){console.error("Error updating confirmed orders to shipped:",s),i("Failed to update selected orders")}},we=async e=>{if(window.confirm("Are you sure you want to delete this cancelled order?"))try{await Z(e),u(s=>s.filter(a=>a.id!==e)),p("Order deleted")}catch{i("Failed to delete order")}},J=e=>{const s=_[e.productId];return s?L?s.title:s.commonName:e.name},z=e=>{const s=_[e.productId];return s?.plantId?s.plantId:e.productId||""},ke=async e=>{try{const s=parseFloat(H)||0;await Ue(e,s),u(a=>a.map(n=>n.id===e?{...n,deliveryCharge:s}:n)),F(null),p("Delivery charge updated!")}catch{i("Failed to update delivery charge")}},Ce=async e=>{try{const s=parseFloat(W)||0;await qe(e,s),u(a=>a.map(n=>n.id===e?{...n,manualDiscount:s}:n)),E(null),p("Discount updated!")}catch{i("Failed to update discount")}},Se=async e=>{try{const s=x.find(n=>n.id===e);if(!s)return;const a={...s.customer,...b};await ze(e,a),u(n=>n.map(r=>r.id===e?{...r,customer:a}:r)),$(null),p("Customer details updated!")}catch{i("Failed to update customer details")}},De=async(e,s)=>{G(!0);try{const a=await Re(e,s);u(n=>n.map(r=>{if(r.id!==e)return r;const l={...r,items:s,totalItems:a.totalItems,totalAmount:a.totalAmount,originalAmount:a.originalAmount,discountAmount:a.promoRemoved?0:a.discountAmount??r.discountAmount};return a.promoRemoved&&(delete l.promoCode,delete l.discountType,delete l.discountValue,delete l.originalAmount),l})),Y(null),a.promoRemoved?p("Items updated. Promo removed — order total is below the minimum."):p("Order items updated!")}catch{i("Failed to update items")}finally{G(!1)}},$e=async e=>{K(e.id);try{const s={orderId:e.orderId||e.id,dateFormatted:q(e.createdAt),customer:e.customer||null,promoCode:e.promoCode,discountAmount:e.discountAmount,discountType:e.discountType,deliveryCharge:e.deliveryCharge||0,manualDiscount:e.manualDiscount||0},a=await We(s,e.items||[],J),n=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!0}).replace(/:/g,"-").replace(/ /g,"_"),r=q(e.createdAt).replace(/[:,\s]+/g,"_"),l=`Rosary_Bill_${e.orderId||e.id}_${r}_${n}.pdf`;a.save(l),p("PDF downloaded successfully")}catch(s){console.error("Failed to generate PDF:",s),i("Failed to generate PDF invoice")}finally{K(null)}},f=x.filter(e=>d==="all"?e.status!=="cancelled":e.status===d).filter(e=>{if(!T.trim())return!0;const s=T.toLowerCase();return(e.orderId||"").toLowerCase().includes(s)||(e.customer?.name||"").toLowerCase().includes(s)||(e.customer?.phone||"").toLowerCase().includes(s)||(e.customer?.whatsapp||"").toLowerCase().includes(s)||(e.customer?.address||"").toLowerCase().includes(s)||(e.customer?.district||"").toLowerCase().includes(s)||(e.customer?.state||"").toLowerCase().includes(s)||(e.customer?.pincode||"").toLowerCase().includes(s)}),o=f.some(e=>g.includes(e.id)),h=f.filter(e=>g.includes(e.id)).length;return t.jsxs("div",{className:"animate-fade-in pb-20",children:[t.jsxs("div",{className:"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4",children:[t.jsx("h1",{className:"text-xl font-semibold text-[var(--text-primary)]",children:"Orders"}),t.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[t.jsx(B,{to:"/admin/orders/new",className:"btn btn-primary text-sm",children:"+ New Order"}),t.jsx("button",{onClick:()=>re(e=>!e),className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${L?"bg-[var(--color-forest)] text-white":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
            `,children:L?"📖 Title":"🏷️ Common Name"}),t.jsx(B,{to:"/admin",className:"btn btn-secondary text-sm",children:"← Back"})]})]}),t.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-3 mb-6",children:[t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-[var(--color-forest)]",children:x.filter(e=>e.status!=="cancelled").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Total Orders"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-yellow-600",children:x.filter(e=>e.status==="pending").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Pending"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-blue-600",children:x.filter(e=>e.status==="confirmed").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Confirmed"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-green-600",children:x.filter(e=>e.status==="delivered").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Delivered"})]})]}),t.jsx("div",{className:"flex gap-2 mb-4 overflow-x-auto pb-1",children:["all",...ee].map(e=>{const s=e==="all"?x.filter(n=>n.status!=="cancelled").length:x.filter(n=>n.status===e).length,a=d===e;return t.jsxs("button",{onClick:()=>ne(e),className:`
                px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap flex items-center gap-1.5
                ${a?"bg-[var(--color-forest)] text-white":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
              `,children:[e==="all"?"All":e,t.jsx("span",{className:`
                text-[10px] px-1.5 py-0.5 rounded-full
                ${a?"bg-white/20":"bg-[var(--bg-secondary)]"}
              `,children:s})]},e)})}),t.jsx("div",{className:"mb-4",children:t.jsx("input",{type:"text",value:T,onChange:e=>ce(e.target.value),placeholder:"🔍 Search by Order ID, name, phone, address...",className:"input text-sm w-full"})}),d==="confirmed"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>I(f),disabled:!f.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${o?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:o?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:fe,disabled:!o,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${o?"bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🖨️ Print",h>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:h})]}),t.jsxs("button",{type:"button",onClick:Ne,disabled:!o,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${o?"bg-blue-600 text-white hover:bg-blue-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🚚 Shipped",h>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:h})]})]}),d==="pending"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>I(f),disabled:!f.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${o?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:o?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:ye,disabled:!o,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${o?"bg-blue-600 text-white hover:bg-blue-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["✅ Confirm",h>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:h})]}),t.jsxs("button",{type:"button",onClick:je,disabled:!o,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${o?"bg-red-600 text-white hover:bg-red-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["❌ Cancel",h>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:h})]})]}),d==="shipped"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>I(f),disabled:!f.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${o?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:o?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:be,disabled:!o,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${o?"bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["✅ Delivered",h>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:h})]})]}),(d==="cancelled"||d==="delivered")&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>I(f),disabled:!f.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${o?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:o?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:ve,disabled:!o,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${o?"bg-red-600 text-white hover:bg-red-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🗑️ Delete Selected",h>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:h})]})]}),te?t.jsx("div",{className:"space-y-3",children:[...Array(3)].map((e,s)=>t.jsxs("div",{className:"card p-4 animate-pulse",children:[t.jsx("div",{className:"h-4 bg-gray-200 rounded w-1/3 mb-2"}),t.jsx("div",{className:"h-3 bg-gray-200 rounded w-1/2"})]},s))}):x.length===0?t.jsxs("div",{className:"text-center py-12",children:[t.jsx("span",{className:"text-5xl",children:"📋"}),t.jsx("h2",{className:"text-lg font-semibold text-[var(--text-primary)] mt-4",children:"No orders yet"}),t.jsx("p",{className:"text-[var(--text-secondary)] mt-2",children:"Orders will appear here when customers checkout."})]}):t.jsx("div",{className:"space-y-3",children:f.map(e=>t.jsxs("div",{className:`card overflow-hidden ${ue(e)?"ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30":""}`,children:[t.jsx("button",{onClick:()=>me(e.id),className:"w-full p-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors",children:t.jsxs("div",{className:"flex items-start justify-between gap-3",children:[["pending","confirmed","shipped","cancelled","delivered"].includes(d)&&e.status===d&&t.jsx("div",{className:"pt-1",children:t.jsx("input",{type:"checkbox",checked:g.includes(e.id),onChange:s=>{s.stopPropagation(),he(e.id)},className:"w-4 h-4 rounded",onClick:s=>s.stopPropagation()})}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"font-mono text-sm font-semibold text-[var(--color-forest)]",children:e.orderId}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)] mt-1",children:q(e.createdAt)}),t.jsx("p",{className:"text-sm text-[var(--text-primary)] mt-1",children:e.customer?.name||"Guest"})]}),t.jsxs("div",{className:"text-right",children:[t.jsx("span",{className:`badge ${pe(e.status)} capitalize text-xs`,children:e.status}),e.promoCode&&e.discountAmount>0&&t.jsxs("p",{className:"text-xs text-green-600 dark:text-green-400 mt-1",children:["🏷️ ",e.promoCode," −",m,e.discountAmount.toLocaleString("en-IN")]}),t.jsxs("p",{className:"font-semibold text-[var(--text-primary)] mt-1",children:[m,((e.totalAmount||0)+(e.deliveryCharge||0)-(e.manualDiscount||0)).toLocaleString("en-IN")]}),t.jsxs("p",{className:"text-xs text-[var(--text-secondary)]",children:[e.totalItems," items",e.deliveryCharge?` · +${m}${e.deliveryCharge} delivery`:""]})]})]})}),M===e.id&&t.jsxs("div",{className:"border-t border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)] animate-fade-in",children:[t.jsxs("div",{className:"mb-4",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)]",children:"Customer Details"}),t.jsx("button",{onClick:()=>{if(D===e.id){$(null);return}$(e.id),y({name:e.customer?.name||"",phone:e.customer?.phone||"",whatsapp:e.customer?.whatsapp||"",address:e.customer?.address||"",district:e.customer?.district||"",state:e.customer?.state||"",pincode:e.customer?.pincode||""})},className:`text-xs px-2 py-1 rounded-lg font-medium transition-all ${D===e.id?"bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`,children:D===e.id?"✕ Cancel":"✏️ Edit"})]}),D===e.id?t.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3 text-sm",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Name"}),t.jsx("input",{type:"text",value:b.name,onChange:s=>y(a=>({...a,name:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Phone"}),t.jsx("input",{type:"tel",value:b.phone,onChange:s=>y(a=>({...a,phone:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"WhatsApp"}),t.jsx("input",{type:"tel",value:b.whatsapp,onChange:s=>y(a=>({...a,whatsapp:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{className:"md:col-span-2",children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Address"}),t.jsx("textarea",{value:b.address,onChange:s=>y(a=>({...a,address:s.target.value})),className:"input text-sm w-full min-h-[60px]"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"District"}),t.jsx("input",{type:"text",value:b.district,onChange:s=>y(a=>({...a,district:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"State"}),t.jsx("input",{type:"text",value:b.state,onChange:s=>y(a=>({...a,state:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Pincode"}),t.jsx("input",{type:"text",value:b.pincode,onChange:s=>y(a=>({...a,pincode:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{className:"md:col-span-2 flex gap-2 justify-end",children:[t.jsx("button",{onClick:()=>Se(e.id),className:"btn btn-primary text-xs",children:"Save"}),t.jsx("button",{onClick:()=>$(null),className:"btn btn-secondary text-xs",children:"Cancel"})]})]}):t.jsxs("div",{className:"space-y-2 text-sm",children:[t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsxs("p",{children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Phone:"})," ",e.customer?.phone||"N/A"]}),t.jsxs("p",{children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"WhatsApp:"})," ",e.customer?.whatsapp||"N/A"]}),t.jsxs("p",{className:"col-span-2",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Address:"})," ",e.customer?.address||"N/A"]}),t.jsxs("p",{className:"col-span-2",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Location:"})," ",[e.customer?.district,e.customer?.state,e.customer?.pincode].filter(Boolean).join(", ")||"N/A"]}),e.customer?.userId&&t.jsxs("p",{className:"col-span-2 text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"User ID:"})," ",t.jsx("span",{className:"font-mono",children:e.customer.userId})]})]}),t.jsxs("div",{className:"pt-2 border-t border-[var(--border-color)] text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Order Link:"})," ",(()=>{const s=X(e.id);return t.jsx("a",{href:s,target:"_blank",rel:"noopener noreferrer",className:"text-[var(--color-forest)] break-all hover:underline",onClick:a=>a.stopPropagation(),children:s})})()]}),e.customer?.userId&&t.jsxs("div",{className:"pt-2 mt-2 border-t border-[var(--border-color)] text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"User Link:"})," ",t.jsx(B,{to:`/admin/users?userId=${e.customer.userId}`,className:"text-[var(--color-forest)] hover:underline font-medium",onClick:s=>s.stopPropagation(),children:"View User Profile →"})]}),t.jsx("div",{className:"pt-4 mt-2 border-t border-[var(--border-color)]",children:t.jsxs("button",{onClick:()=>$e(e),disabled:U===e.id,className:"btn btn-secondary text-xs w-full sm:w-auto flex items-center justify-center gap-2",children:[U===e.id?t.jsx("span",{className:"w-3 h-3 border-2 border-[var(--text-secondary)] border-t-[var(--text-primary)] rounded-full animate-spin"}):"📄",U===e.id?"Generating PDF...":"Download PDF Bill"]})})]})]}),t.jsxs("div",{className:"mb-4",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)]",children:"Items"}),t.jsx("button",{onClick:()=>Y(S===e.id?null:e.id),className:`text-xs px-2 py-1 rounded-lg font-medium transition-all ${S===e.id?"bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`,children:S===e.id?"✕ Cancel":"✏️ Edit"})]}),(()=>{const s=e.items?.map(a=>`${z(a)}-${a.quantity}`).join(",");return s?t.jsxs("div",{className:"flex items-center gap-2 text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-color)] mb-3 max-w-full overflow-hidden",children:[t.jsx("span",{className:"font-mono text-[var(--text-primary)] truncate flex-1",children:s}),t.jsx("button",{onClick:a=>{a.stopPropagation(),navigator.clipboard.writeText(s),p("IDs copied!")},className:"text-[var(--color-forest)] font-medium hover:underline flex-shrink-0",children:"Copy"})]}):null})(),S===e.id?t.jsx(Ve,{items:e.items,onSave:s=>De(e.id,s),saving:de}):t.jsx("div",{className:"space-y-2",children:e.items?.map((s,a)=>t.jsxs("div",{className:"flex items-center gap-2 text-sm",children:[s.imageUrl&&t.jsx("img",{src:He(s.imageUrl),alt:s.name,className:"w-10 h-10 rounded object-cover"}),t.jsxs("div",{className:"flex-1 min-w-0",children:[t.jsxs("p",{className:"truncate text-[var(--text-primary)]",children:[a+1,"."," ",z(s)&&t.jsxs("span",{className:"text-[var(--text-secondary)] text-xs mr-1",children:["(ID: ",z(s),")"]}),J(s)]}),t.jsxs("p",{className:"text-xs text-[var(--text-secondary)]",children:[m,s.price," × ",s.quantity," = ",m,(s.price*s.quantity).toLocaleString("en-IN")]})]})]},a))})]}),t.jsxs("div",{className:"mb-4 pt-3 border-t border-[var(--border-color)] space-y-2 text-sm",children:[(()=>{const s=e.items?.reduce((a,n)=>a+(n.quantity||0),0)||0;return t.jsxs("div",{className:"flex justify-between text-[var(--text-secondary)]",children:[t.jsx("span",{children:"Total Plants"}),t.jsx("span",{className:"font-semibold text-[var(--text-primary)]",children:s})]})})(),t.jsxs("div",{className:"flex justify-between text-[var(--text-secondary)]",children:[t.jsx("span",{children:"Subtotal"}),t.jsxs("span",{children:[m,(e.originalAmount??e.totalAmount)?.toLocaleString("en-IN")]})]}),e.promoCode&&e.discountAmount>0&&t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsxs("span",{className:"flex items-center gap-1.5 text-green-600 dark:text-green-400",children:[t.jsx("span",{children:"🏷️"}),t.jsx("span",{className:"font-mono font-semibold",children:e.promoCode}),t.jsxs("span",{className:"text-xs text-[var(--text-secondary)]",children:["(",e.discountType==="percentage"?`${e.discountValue}% off`:`${m}${e.discountValue} off`,")"]})]}),t.jsxs("span",{className:"font-medium text-green-600 dark:text-green-400",children:["−",m,e.discountAmount.toLocaleString("en-IN")]})]}),t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Discount"}),oe===e.id?t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:m}),t.jsx("input",{type:"number",value:W,onChange:s=>Q(s.target.value),className:"input w-20 py-1 px-2 text-right text-sm",placeholder:"0",min:"0"})]}),t.jsx("button",{onClick:()=>Ce(e.id),className:"text-[var(--color-forest)] text-xs font-medium hover:underline",children:"Save"}),t.jsx("button",{onClick:()=>E(null),className:"text-[var(--text-secondary)] text-xs hover:underline",children:"Cancel"})]}):t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx("span",{className:e.manualDiscount?"text-green-600 dark:text-green-400":"text-[var(--text-secondary)] italic",children:e.manualDiscount?`−${m}${e.manualDiscount.toLocaleString("en-IN")}`:"Not set"}),t.jsx("button",{onClick:()=>{E(e.id),Q(e.manualDiscount?.toString()||"")},className:"text-xs text-[var(--color-forest)] hover:underline",children:e.manualDiscount?"Edit":"Add"})]})]}),t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Delivery"}),ie===e.id?t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:m}),t.jsx("input",{type:"number",value:H,onChange:s=>V(s.target.value),className:"input w-20 py-1 px-2 text-right text-sm",placeholder:"0",min:"0"})]}),t.jsx("button",{onClick:()=>ke(e.id),className:"text-[var(--color-forest)] text-xs font-medium hover:underline",children:"Save"}),t.jsx("button",{onClick:()=>F(null),className:"text-[var(--text-secondary)] text-xs hover:underline",children:"Cancel"})]}):t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx("span",{className:e.deliveryCharge?"text-[var(--text-primary)]":"text-[var(--text-secondary)] italic",children:e.deliveryCharge?`${m}${e.deliveryCharge.toLocaleString("en-IN")}`:"Not set"}),t.jsx("button",{onClick:()=>{F(e.id),V(e.deliveryCharge?.toString()||"")},className:"text-xs text-[var(--color-forest)] hover:underline",children:e.deliveryCharge?"Edit":"Add"})]})]}),t.jsxs("div",{className:"flex justify-between font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]",children:[t.jsx("span",{children:"Total"}),t.jsxs("span",{children:[m,((e.totalAmount||0)+(e.deliveryCharge||0)-(e.manualDiscount||0)).toLocaleString("en-IN")]})]})]}),t.jsxs("div",{className:"mt-4 pt-4 border-t border-[var(--border-color)]",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)] mb-2",children:"Update Status"}),t.jsx("div",{className:"flex gap-2 flex-wrap",children:ee.map(s=>t.jsx("button",{onClick:async()=>{try{await k(e.id,s),u(a=>a.map(n=>n.id===e.id?{...n,status:s}:n)),p(`Order status updated to ${s}`)}catch{i("Failed to update status")}},disabled:e.status===s,className:`
                            px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                            ${e.status===s?"bg-[var(--color-forest)] text-white cursor-default":"bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]"}
                          `,children:s},s))})]}),e.status==="cancelled"&&t.jsx("div",{className:"mt-4 pt-4 border-t border-[var(--border-color)]",children:t.jsx("button",{onClick:()=>we(e.id),className:"btn bg-red-500 text-white hover:bg-red-600 text-sm w-full",children:"🗑️ Delete This Order"})})]})]},e.id))})]})}export{Ze as default};
