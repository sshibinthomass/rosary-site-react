import{r as o,j as t,N as W}from"./vendor-react-Drkgvv_v.js";import{b as ye,g as Ne,u as C,i as q,f as je,e as we,h as Ce}from"./orderService-OjSqqcG1.js";import{b as Se,d as ke,e as Ae,C as b,r as $e}from"./index-JIrN78wO.js";import{O as De}from"./OrderItemEditor-BUhCwp4e.js";import{g as Ie}from"./pdfGenerator-oD0xWsTM.js";import"./vendor-firebase-lKfkPGEE.js";const G=["pending","confirmed","shipped","delivered","cancelled"];function Te(){const{error:d,success:x}=Se(),[m,u]=o.useState([]),[Q,Y]=o.useState(!0),[U,J]=o.useState(null),[c,K]=o.useState("all"),[P,X]=o.useState(!1),[T,Z]=o.useState({}),[ee,F]=o.useState(null),[B,M]=o.useState(""),[S,R]=o.useState(null),[te,_]=o.useState(!1),[O,se]=o.useState(""),[k,A]=o.useState(null),[f,y]=o.useState({name:"",phone:"",whatsapp:"",address:"",district:"",state:"",pincode:""}),[h,v]=o.useState([]),[L,z]=o.useState(null);o.useEffect(()=>{ae()},[]),o.useEffect(()=>{v([])},[c]);const ae=async()=>{try{const e=await ye();u(e);const s=new Set;e.forEach(r=>r.items?.forEach(n=>s.add(n.productId)));const a={};await Promise.all(Array.from(s).map(async r=>{try{const l=typeof r=="string"&&/^L/i.test(r)?await ke(r):await Ae(r);if(l){const D=l.title||l.name||l.commonName,I=l.commonName||l.name||l.title||D,N=l.id||r;a[r]={title:D,commonName:I,plantId:N}}}catch{}})),Z(a)}catch(e){console.error("Error loading orders:",e),d("Failed to load orders")}finally{Y(!1)}},E=e=>e?(e.toDate?e.toDate():new Date(e)).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"N/A",re=e=>{switch(e){case"pending":return"bg-yellow-100 text-yellow-700";case"confirmed":return"bg-blue-100 text-blue-700";case"shipped":return"bg-purple-100 text-purple-700";case"delivered":return"bg-green-100 text-green-700";case"cancelled":return"bg-red-100 text-red-700";default:return"bg-gray-100 text-gray-700"}},le=e=>{J(U===e?null:e)},ne=e=>{if(e.status!=="pending"||!e.createdAt)return!1;const s=e.createdAt.toDate?e.createdAt.toDate():new Date(e.createdAt);return(Date.now()-s.getTime())/(1e3*60*60*24)>5},ie=e=>{v(s=>s.includes(e)?s.filter(a=>a!==e):[...s,e])},de=e=>{e.length&&v(s=>s.filter(a=>!e.includes(a)))},$=e=>{const s=e.map(r=>r.id);if(!s.length)return;if(s.every(r=>h.includes(r)))de(s);else{const r=new Set([...h,...s]);v(Array.from(r))}},ce=()=>{const e=m.filter(n=>n.status==="confirmed"&&h.includes(n.id));if(!e.length){d("Please select at least one order to print addresses");return}const s=window.open("","_blank");if(!s){d("Please allow pop-ups to print addresses");return}const r=`
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
            ${e.map(n=>{const l=n.customer||{},D=l.name||"Customer",I=[l.address,[l.district,l.state].filter(Boolean).join(", "),l.pincode].filter(Boolean).join("<br />"),N=(l.phone||"").trim(),j=(l.whatsapp||"").trim();let w="";return N&&j&&N!==j?w=`${N}, ${j}`:N||j?w=N||j:l.userId&&(w=`User: ${l.userId}`),`
          <div class="label">
            <div class="label-header">
              <div class="label-title">Rosary Plant House</div>
              <div class="label-order-id">
                <span class="label-order-id-value">${n.orderId||n.id}</span>
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
                  <div class="customer-name">${D}</div>
                  ${I?`<div class="customer-address">${I}</div>`:""}
                  <div>
                    <span class="field-label">State :</span> ${l.state||""}
                  </div>
                  <div>
                    <span class="field-label">Pincode :</span> ${l.pincode||""}
                  </div>
                  ${w?`<div class="customer-phone"><span class="field-label">Phone :</span> ${w}</div>`:""}
                </div>
              </div>
            </div>
            <div class="label-footer">
              LIVE PLANTS INSIDE , HANDLE WITH CARE, PLEASE DON’T DELAY
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
    `;s.document.open(),s.document.write(r),s.document.close()},oe=async()=>{if(c!=="cancelled"&&c!=="delivered")return;const e=m.filter(a=>a.status===c&&h.includes(a.id));if(!e.length){d("Please select at least one order to delete");return}const s=c==="cancelled"?"cancelled":"delivered";if(window.confirm(`Are you sure you want to permanently delete ${e.length} ${s} order(s)?`))try{await Promise.all(e.map(r=>q(r.id)));const a=new Set(e.map(r=>r.id));u(r=>r.filter(n=>!a.has(n.id))),v([]),x(`Deleted ${e.length} ${s} order(s)`)}catch(a){console.error("Error deleting selected orders:",a),d("Failed to delete selected orders")}},me=async()=>{if(c!=="shipped")return;const e=m.filter(s=>s.status==="shipped"&&h.includes(s.id));if(!e.length){d("Please select at least one shipped order");return}if(window.confirm(`Mark ${e.length} shipped order(s) as delivered?`))try{await Promise.all(e.map(a=>C(a.id,"delivered")));const s=new Set(e.map(a=>a.id));u(a=>a.map(r=>s.has(r.id)?{...r,status:"delivered"}:r)),v([]),x(`Updated ${e.length} order(s) to delivered`)}catch(s){console.error("Error updating shipped orders to delivered:",s),d("Failed to update selected orders")}},xe=async()=>{if(c!=="pending")return;const e=m.filter(s=>s.status==="pending"&&h.includes(s.id));if(!e.length){d("Please select at least one pending order");return}if(window.confirm(`Mark ${e.length} pending order(s) as confirmed?`))try{await Promise.all(e.map(a=>C(a.id,"confirmed")));const s=new Set(e.map(a=>a.id));u(a=>a.map(r=>s.has(r.id)?{...r,status:"confirmed"}:r)),v([]),x(`Updated ${e.length} order(s) to confirmed`)}catch(s){console.error("Error updating pending orders to confirmed:",s),d("Failed to update selected orders")}},pe=async()=>{if(c!=="pending")return;const e=m.filter(s=>s.status==="pending"&&h.includes(s.id));if(!e.length){d("Please select at least one pending order");return}if(window.confirm(`Mark ${e.length} pending order(s) as cancelled?`))try{await Promise.all(e.map(a=>C(a.id,"cancelled")));const s=new Set(e.map(a=>a.id));u(a=>a.map(r=>s.has(r.id)?{...r,status:"cancelled"}:r)),v([]),x(`Updated ${e.length} order(s) to cancelled`)}catch(s){console.error("Error updating pending orders to cancelled:",s),d("Failed to update selected orders")}},ue=async()=>{if(c!=="confirmed")return;const e=m.filter(s=>s.status==="confirmed"&&h.includes(s.id));if(!e.length){d("Please select at least one confirmed order");return}if(window.confirm(`Mark ${e.length} confirmed order(s) as shipped?`))try{await Promise.all(e.map(a=>C(a.id,"shipped")));const s=new Set(e.map(a=>a.id));u(a=>a.map(r=>s.has(r.id)?{...r,status:"shipped"}:r)),v([]),x(`Updated ${e.length} order(s) to shipped`)}catch(s){console.error("Error updating confirmed orders to shipped:",s),d("Failed to update selected orders")}},he=async e=>{if(window.confirm("Are you sure you want to delete this cancelled order?"))try{await q(e),u(s=>s.filter(a=>a.id!==e)),x("Order deleted")}catch{d("Failed to delete order")}},H=e=>{const s=T[e.productId];return s?P?s.title:s.commonName:e.name},V=e=>{const s=T[e.productId];return s?.plantId?s.plantId:e.productId||""},ge=async e=>{try{const s=parseFloat(B)||0;await je(e,s),u(a=>a.map(r=>r.id===e?{...r,deliveryCharge:s}:r)),F(null),x("Delivery charge updated!")}catch{d("Failed to update delivery charge")}},be=async e=>{try{const s=m.find(r=>r.id===e);if(!s)return;const a={...s.customer,...f};await we(e,a),u(r=>r.map(n=>n.id===e?{...n,customer:a}:n)),A(null),x("Customer details updated!")}catch{d("Failed to update customer details")}},ve=async(e,s)=>{_(!0);try{const a=await Ce(e,s);u(r=>r.map(n=>{if(n.id!==e)return n;const l={...n,items:s,totalItems:a.totalItems,totalAmount:a.totalAmount,originalAmount:a.originalAmount,discountAmount:a.promoRemoved?0:a.discountAmount??n.discountAmount};return a.promoRemoved&&(delete l.promoCode,delete l.discountType,delete l.discountValue,delete l.originalAmount),l})),R(null),a.promoRemoved?x("Items updated. Promo removed — order total is below the minimum."):x("Order items updated!")}catch{d("Failed to update items")}finally{_(!1)}},fe=async e=>{z(e.id);try{const s={orderId:e.orderId||e.id,dateFormatted:E(e.createdAt),customer:e.customer||null,promoCode:e.promoCode,discountAmount:e.discountAmount,discountType:e.discountType,deliveryCharge:e.deliveryCharge||0},a=await Ie(s,e.items||[],H),r=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!0}).replace(/:/g,"-").replace(/ /g,"_"),n=E(e.createdAt).replace(/[:,\s]+/g,"_"),l=`Rosary_Bill_${e.orderId||e.id}_${n}_${r}.pdf`;a.save(l),x("PDF downloaded successfully")}catch(s){console.error("Failed to generate PDF:",s),d("Failed to generate PDF invoice")}finally{z(null)}},g=m.filter(e=>c==="all"?e.status!=="cancelled":e.status===c).filter(e=>{if(!O.trim())return!0;const s=O.toLowerCase();return(e.orderId||"").toLowerCase().includes(s)||(e.customer?.name||"").toLowerCase().includes(s)||(e.customer?.phone||"").toLowerCase().includes(s)||(e.customer?.whatsapp||"").toLowerCase().includes(s)||(e.customer?.address||"").toLowerCase().includes(s)||(e.customer?.district||"").toLowerCase().includes(s)||(e.customer?.state||"").toLowerCase().includes(s)||(e.customer?.pincode||"").toLowerCase().includes(s)}),i=g.some(e=>h.includes(e.id)),p=g.filter(e=>h.includes(e.id)).length;return t.jsxs("div",{className:"animate-fade-in pb-20",children:[t.jsxs("div",{className:"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4",children:[t.jsx("h1",{className:"text-xl font-semibold text-[var(--text-primary)]",children:"Orders"}),t.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[t.jsx(W,{to:"/admin/orders/new",className:"btn btn-primary text-sm",children:"+ New Order"}),t.jsx("button",{onClick:()=>X(e=>!e),className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${P?"bg-[var(--color-forest)] text-white":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
            `,children:P?"📖 Title":"🏷️ Common Name"}),t.jsx(W,{to:"/admin",className:"btn btn-secondary text-sm",children:"← Back"})]})]}),t.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-3 mb-6",children:[t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-[var(--color-forest)]",children:m.filter(e=>e.status!=="cancelled").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Total Orders"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-yellow-600",children:m.filter(e=>e.status==="pending").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Pending"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-blue-600",children:m.filter(e=>e.status==="confirmed").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Confirmed"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-green-600",children:m.filter(e=>e.status==="delivered").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Delivered"})]})]}),t.jsx("div",{className:"flex gap-2 mb-4 overflow-x-auto pb-1",children:["all",...G].map(e=>{const s=e==="all"?m.filter(r=>r.status!=="cancelled").length:m.filter(r=>r.status===e).length,a=c===e;return t.jsxs("button",{onClick:()=>K(e),className:`
                px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap flex items-center gap-1.5
                ${a?"bg-[var(--color-forest)] text-white":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
              `,children:[e==="all"?"All":e,t.jsx("span",{className:`
                text-[10px] px-1.5 py-0.5 rounded-full
                ${a?"bg-white/20":"bg-[var(--bg-secondary)]"}
              `,children:s})]},e)})}),t.jsx("div",{className:"mb-4",children:t.jsx("input",{type:"text",value:O,onChange:e=>se(e.target.value),placeholder:"🔍 Search by Order ID, name, phone, address...",className:"input text-sm w-full"})}),c==="confirmed"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>$(g),disabled:!g.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${i?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:i?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:ce,disabled:!i,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${i?"bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🖨️ Print",p>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:p})]}),t.jsxs("button",{type:"button",onClick:ue,disabled:!i,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${i?"bg-blue-600 text-white hover:bg-blue-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🚚 Shipped",p>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:p})]})]}),c==="pending"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>$(g),disabled:!g.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${i?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:i?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:xe,disabled:!i,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${i?"bg-blue-600 text-white hover:bg-blue-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["✅ Confirm",p>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:p})]}),t.jsxs("button",{type:"button",onClick:pe,disabled:!i,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${i?"bg-red-600 text-white hover:bg-red-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["❌ Cancel",p>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:p})]})]}),c==="shipped"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>$(g),disabled:!g.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${i?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:i?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:me,disabled:!i,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${i?"bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["✅ Delivered",p>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:p})]})]}),(c==="cancelled"||c==="delivered")&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>$(g),disabled:!g.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${i?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:i?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:oe,disabled:!i,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${i?"bg-red-600 text-white hover:bg-red-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🗑️ Delete Selected",p>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:p})]})]}),Q?t.jsx("div",{className:"space-y-3",children:[...Array(3)].map((e,s)=>t.jsxs("div",{className:"card p-4 animate-pulse",children:[t.jsx("div",{className:"h-4 bg-gray-200 rounded w-1/3 mb-2"}),t.jsx("div",{className:"h-3 bg-gray-200 rounded w-1/2"})]},s))}):m.length===0?t.jsxs("div",{className:"text-center py-12",children:[t.jsx("span",{className:"text-5xl",children:"📋"}),t.jsx("h2",{className:"text-lg font-semibold text-[var(--text-primary)] mt-4",children:"No orders yet"}),t.jsx("p",{className:"text-[var(--text-secondary)] mt-2",children:"Orders will appear here when customers checkout."})]}):t.jsx("div",{className:"space-y-3",children:g.map(e=>t.jsxs("div",{className:`card overflow-hidden ${ne(e)?"ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30":""}`,children:[t.jsx("button",{onClick:()=>le(e.id),className:"w-full p-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors",children:t.jsxs("div",{className:"flex items-start justify-between gap-3",children:[["pending","confirmed","shipped","cancelled","delivered"].includes(c)&&e.status===c&&t.jsx("div",{className:"pt-1",children:t.jsx("input",{type:"checkbox",checked:h.includes(e.id),onChange:s=>{s.stopPropagation(),ie(e.id)},className:"w-4 h-4 rounded",onClick:s=>s.stopPropagation()})}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"font-mono text-sm font-semibold text-[var(--color-forest)]",children:e.orderId}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)] mt-1",children:E(e.createdAt)}),t.jsx("p",{className:"text-sm text-[var(--text-primary)] mt-1",children:e.customer?.name||"Guest"})]}),t.jsxs("div",{className:"text-right",children:[t.jsx("span",{className:`badge ${re(e.status)} capitalize text-xs`,children:e.status}),e.promoCode&&e.discountAmount>0&&t.jsxs("p",{className:"text-xs text-green-600 dark:text-green-400 mt-1",children:["🏷️ ",e.promoCode," −",b,e.discountAmount.toLocaleString("en-IN")]}),t.jsxs("p",{className:"font-semibold text-[var(--text-primary)] mt-1",children:[b,((e.totalAmount||0)+(e.deliveryCharge||0)).toLocaleString("en-IN")]}),t.jsxs("p",{className:"text-xs text-[var(--text-secondary)]",children:[e.totalItems," items",e.deliveryCharge?` · +${b}${e.deliveryCharge} delivery`:""]})]})]})}),U===e.id&&t.jsxs("div",{className:"border-t border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)] animate-fade-in",children:[t.jsxs("div",{className:"mb-4",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)]",children:"Customer Details"}),t.jsx("button",{onClick:()=>{if(k===e.id){A(null);return}A(e.id),y({name:e.customer?.name||"",phone:e.customer?.phone||"",whatsapp:e.customer?.whatsapp||"",address:e.customer?.address||"",district:e.customer?.district||"",state:e.customer?.state||"",pincode:e.customer?.pincode||""})},className:`text-xs px-2 py-1 rounded-lg font-medium transition-all ${k===e.id?"bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`,children:k===e.id?"✕ Cancel":"✏️ Edit"})]}),k===e.id?t.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3 text-sm",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Name"}),t.jsx("input",{type:"text",value:f.name,onChange:s=>y(a=>({...a,name:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Phone"}),t.jsx("input",{type:"tel",value:f.phone,onChange:s=>y(a=>({...a,phone:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"WhatsApp"}),t.jsx("input",{type:"tel",value:f.whatsapp,onChange:s=>y(a=>({...a,whatsapp:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{className:"md:col-span-2",children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Address"}),t.jsx("textarea",{value:f.address,onChange:s=>y(a=>({...a,address:s.target.value})),className:"input text-sm w-full min-h-[60px]"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"District"}),t.jsx("input",{type:"text",value:f.district,onChange:s=>y(a=>({...a,district:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"State"}),t.jsx("input",{type:"text",value:f.state,onChange:s=>y(a=>({...a,state:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Pincode"}),t.jsx("input",{type:"text",value:f.pincode,onChange:s=>y(a=>({...a,pincode:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{className:"md:col-span-2 flex gap-2 justify-end",children:[t.jsx("button",{onClick:()=>be(e.id),className:"btn btn-primary text-xs",children:"Save"}),t.jsx("button",{onClick:()=>A(null),className:"btn btn-secondary text-xs",children:"Cancel"})]})]}):t.jsxs("div",{className:"space-y-2 text-sm",children:[t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsxs("p",{children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Phone:"})," ",e.customer?.phone||"N/A"]}),t.jsxs("p",{children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"WhatsApp:"})," ",e.customer?.whatsapp||"N/A"]}),t.jsxs("p",{className:"col-span-2",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Address:"})," ",e.customer?.address||"N/A"]}),t.jsxs("p",{className:"col-span-2",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Location:"})," ",[e.customer?.district,e.customer?.state,e.customer?.pincode].filter(Boolean).join(", ")||"N/A"]}),e.customer?.userId&&t.jsxs("p",{className:"col-span-2 text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"User ID:"})," ",t.jsx("span",{className:"font-mono",children:e.customer.userId})]})]}),t.jsxs("div",{className:"pt-2 border-t border-[var(--border-color)] text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Order Link:"})," ",(()=>{const s=Ne(e.id);return t.jsx("a",{href:s,target:"_blank",rel:"noopener noreferrer",className:"text-[var(--color-forest)] break-all hover:underline",onClick:a=>a.stopPropagation(),children:s})})()]}),t.jsx("div",{className:"pt-4 mt-2 border-t border-[var(--border-color)]",children:t.jsxs("button",{onClick:()=>fe(e),disabled:L===e.id,className:"btn btn-secondary text-xs w-full sm:w-auto flex items-center justify-center gap-2",children:[L===e.id?t.jsx("span",{className:"w-3 h-3 border-2 border-[var(--text-secondary)] border-t-[var(--text-primary)] rounded-full animate-spin"}):"📄",L===e.id?"Generating PDF...":"Download PDF Bill"]})})]})]}),t.jsxs("div",{className:"mb-4",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)]",children:"Items"}),t.jsx("button",{onClick:()=>R(S===e.id?null:e.id),className:`text-xs px-2 py-1 rounded-lg font-medium transition-all ${S===e.id?"bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`,children:S===e.id?"✕ Cancel":"✏️ Edit"})]}),S===e.id?t.jsx(De,{items:e.items,onSave:s=>ve(e.id,s),saving:te}):t.jsx("div",{className:"space-y-2",children:e.items?.map((s,a)=>t.jsxs("div",{className:"flex items-center gap-2 text-sm",children:[s.imageUrl&&t.jsx("img",{src:$e(s.imageUrl),alt:s.name,className:"w-10 h-10 rounded object-cover"}),t.jsxs("div",{className:"flex-1 min-w-0",children:[t.jsxs("p",{className:"truncate text-[var(--text-primary)]",children:[a+1,". ",H(s),V(s)&&t.jsxs("span",{className:"text-[var(--text-secondary)] text-xs ml-1",children:["(ID: ",V(s),")"]})]}),t.jsxs("p",{className:"text-xs text-[var(--text-secondary)]",children:[b,s.price," × ",s.quantity," = ",b,(s.price*s.quantity).toLocaleString("en-IN")]})]})]},a))})]}),t.jsxs("div",{className:"mb-4 pt-3 border-t border-[var(--border-color)] space-y-2 text-sm",children:[t.jsxs("div",{className:"flex justify-between text-[var(--text-secondary)]",children:[t.jsx("span",{children:"Subtotal"}),t.jsxs("span",{children:[b,(e.originalAmount??e.totalAmount)?.toLocaleString("en-IN")]})]}),e.promoCode&&e.discountAmount>0&&t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsxs("span",{className:"flex items-center gap-1.5 text-green-600 dark:text-green-400",children:[t.jsx("span",{children:"🏷️"}),t.jsx("span",{className:"font-mono font-semibold",children:e.promoCode}),t.jsxs("span",{className:"text-xs text-[var(--text-secondary)]",children:["(",e.discountType==="percentage"?`${e.discountValue}% off`:`${b}${e.discountValue} off`,")"]})]}),t.jsxs("span",{className:"font-medium text-green-600 dark:text-green-400",children:["−",b,e.discountAmount.toLocaleString("en-IN")]})]}),t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Delivery"}),ee===e.id?t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:b}),t.jsx("input",{type:"number",value:B,onChange:s=>M(s.target.value),className:"input w-20 py-1 px-2 text-right text-sm",placeholder:"0",min:"0"})]}),t.jsx("button",{onClick:()=>ge(e.id),className:"text-[var(--color-forest)] text-xs font-medium hover:underline",children:"Save"}),t.jsx("button",{onClick:()=>F(null),className:"text-[var(--text-secondary)] text-xs hover:underline",children:"Cancel"})]}):t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx("span",{className:e.deliveryCharge?"text-[var(--text-primary)]":"text-[var(--text-secondary)] italic",children:e.deliveryCharge?`${b}${e.deliveryCharge.toLocaleString("en-IN")}`:"Not set"}),t.jsx("button",{onClick:()=>{F(e.id),M(e.deliveryCharge?.toString()||"")},className:"text-xs text-[var(--color-forest)] hover:underline",children:e.deliveryCharge?"Edit":"Add"})]})]}),t.jsxs("div",{className:"flex justify-between font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]",children:[t.jsx("span",{children:"Total"}),t.jsxs("span",{children:[b,((e.totalAmount||0)+(e.deliveryCharge||0)).toLocaleString("en-IN")]})]})]}),t.jsxs("div",{className:"mt-4 pt-4 border-t border-[var(--border-color)]",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)] mb-2",children:"Update Status"}),t.jsx("div",{className:"flex gap-2 flex-wrap",children:G.map(s=>t.jsx("button",{onClick:async()=>{try{await C(e.id,s),u(a=>a.map(r=>r.id===e.id?{...r,status:s}:r)),x(`Order status updated to ${s}`)}catch{d("Failed to update status")}},disabled:e.status===s,className:`
                            px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                            ${e.status===s?"bg-[var(--color-forest)] text-white cursor-default":"bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]"}
                          `,children:s},s))})]}),e.status==="cancelled"&&t.jsx("div",{className:"mt-4 pt-4 border-t border-[var(--border-color)]",children:t.jsx("button",{onClick:()=>he(e.id),className:"btn bg-red-500 text-white hover:bg-red-600 text-sm w-full",children:"🗑️ Delete This Order"})})]})]},e.id))})]})}export{Te as default};
