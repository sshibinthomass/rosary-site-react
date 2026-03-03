import{r as o,j as t,N as z}from"./vendor-react-C9sPtGXN.js";import{b as be,g as ve,u as C,i as H,f as fe,e as ye,h as Ne}from"./orderService-CRaaQO3E.js";import{b as je,v as we,c as Ce,C as y,r as Se}from"./index-DmHEGKHS.js";import{O as ke}from"./OrderItemEditor-BFbFCgQw.js";import"./vendor-firebase-0BeNI5D8.js";const W=["pending","confirmed","shipped","delivered","cancelled"];function Oe(){const{error:c,success:g}=je(),[x,p]=o.useState([]),[_,q]=o.useState(!0),[E,V]=o.useState(null),[d,Q]=o.useState("all"),[P,Y]=o.useState(!1),[F,G]=o.useState({}),[J,O]=o.useState(null),[U,T]=o.useState(""),[S,M]=o.useState(null),[K,B]=o.useState(!1),[L,X]=o.useState(""),[k,$]=o.useState(null),[v,f]=o.useState({name:"",phone:"",whatsapp:"",address:"",district:"",state:"",pincode:""}),[u,b]=o.useState([]);o.useEffect(()=>{Z()},[]),o.useEffect(()=>{b([])},[d]);const Z=async()=>{try{const e=await be();p(e);const s=new Set;e.forEach(r=>r.items?.forEach(n=>s.add(n.productId)));const a={};await Promise.all(Array.from(s).map(async r=>{try{const i=typeof r=="string"&&/^L/i.test(r)?await we(r):await Ce(r);if(i){const I=i.title||i.name||i.commonName,D=i.commonName||i.name||i.title||I,N=i.id||r;a[r]={title:I,commonName:D,plantId:N}}}catch{}})),G(a)}catch(e){console.error("Error loading orders:",e),c("Failed to load orders")}finally{q(!1)}},ee=e=>e?(e.toDate?e.toDate():new Date(e)).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"N/A",te=e=>{switch(e){case"pending":return"bg-yellow-100 text-yellow-700";case"confirmed":return"bg-blue-100 text-blue-700";case"shipped":return"bg-purple-100 text-purple-700";case"delivered":return"bg-green-100 text-green-700";case"cancelled":return"bg-red-100 text-red-700";default:return"bg-gray-100 text-gray-700"}},se=e=>{V(E===e?null:e)},ae=e=>{if(e.status!=="pending"||!e.createdAt)return!1;const s=e.createdAt.toDate?e.createdAt.toDate():new Date(e.createdAt);return(Date.now()-s.getTime())/(1e3*60*60*24)>5},re=e=>{b(s=>s.includes(e)?s.filter(a=>a!==e):[...s,e])},le=e=>{e.length&&b(s=>s.filter(a=>!e.includes(a)))},A=e=>{const s=e.map(r=>r.id);if(!s.length)return;if(s.every(r=>u.includes(r)))le(s);else{const r=new Set([...u,...s]);b(Array.from(r))}},ne=()=>{const e=x.filter(n=>n.status==="confirmed"&&u.includes(n.id));if(!e.length){c("Please select at least one order to print addresses");return}const s=window.open("","_blank");if(!s){c("Please allow pop-ups to print addresses");return}const r=`
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
            ${e.map(n=>{const i=n.customer||{},I=i.name||"Customer",D=[i.address,[i.district,i.state].filter(Boolean).join(", "),i.pincode].filter(Boolean).join("<br />"),N=(i.phone||"").trim(),j=(i.whatsapp||"").trim();let w="";return N&&j&&N!==j?w=`${N}, ${j}`:N||j?w=N||j:i.userId&&(w=`User: ${i.userId}`),`
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
                  <div class="customer-name">${I}</div>
                  ${D?`<div class="customer-address">${D}</div>`:""}
                  <div>
                    <span class="field-label">State :</span> ${i.state||""}
                  </div>
                  <div>
                    <span class="field-label">Pincode :</span> ${i.pincode||""}
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
    `;s.document.open(),s.document.write(r),s.document.close()},ie=async()=>{if(d!=="cancelled"&&d!=="delivered")return;const e=x.filter(a=>a.status===d&&u.includes(a.id));if(!e.length){c("Please select at least one order to delete");return}const s=d==="cancelled"?"cancelled":"delivered";if(window.confirm(`Are you sure you want to permanently delete ${e.length} ${s} order(s)?`))try{await Promise.all(e.map(r=>H(r.id)));const a=new Set(e.map(r=>r.id));p(r=>r.filter(n=>!a.has(n.id))),b([]),g(`Deleted ${e.length} ${s} order(s)`)}catch(a){console.error("Error deleting selected orders:",a),c("Failed to delete selected orders")}},de=async()=>{if(d!=="shipped")return;const e=x.filter(s=>s.status==="shipped"&&u.includes(s.id));if(!e.length){c("Please select at least one shipped order");return}if(window.confirm(`Mark ${e.length} shipped order(s) as delivered?`))try{await Promise.all(e.map(a=>C(a.id,"delivered")));const s=new Set(e.map(a=>a.id));p(a=>a.map(r=>s.has(r.id)?{...r,status:"delivered"}:r)),b([]),g(`Updated ${e.length} order(s) to delivered`)}catch(s){console.error("Error updating shipped orders to delivered:",s),c("Failed to update selected orders")}},ce=async()=>{if(d!=="pending")return;const e=x.filter(s=>s.status==="pending"&&u.includes(s.id));if(!e.length){c("Please select at least one pending order");return}if(window.confirm(`Mark ${e.length} pending order(s) as confirmed?`))try{await Promise.all(e.map(a=>C(a.id,"confirmed")));const s=new Set(e.map(a=>a.id));p(a=>a.map(r=>s.has(r.id)?{...r,status:"confirmed"}:r)),b([]),g(`Updated ${e.length} order(s) to confirmed`)}catch(s){console.error("Error updating pending orders to confirmed:",s),c("Failed to update selected orders")}},oe=async()=>{if(d!=="pending")return;const e=x.filter(s=>s.status==="pending"&&u.includes(s.id));if(!e.length){c("Please select at least one pending order");return}if(window.confirm(`Mark ${e.length} pending order(s) as cancelled?`))try{await Promise.all(e.map(a=>C(a.id,"cancelled")));const s=new Set(e.map(a=>a.id));p(a=>a.map(r=>s.has(r.id)?{...r,status:"cancelled"}:r)),b([]),g(`Updated ${e.length} order(s) to cancelled`)}catch(s){console.error("Error updating pending orders to cancelled:",s),c("Failed to update selected orders")}},xe=async()=>{if(d!=="confirmed")return;const e=x.filter(s=>s.status==="confirmed"&&u.includes(s.id));if(!e.length){c("Please select at least one confirmed order");return}if(window.confirm(`Mark ${e.length} confirmed order(s) as shipped?`))try{await Promise.all(e.map(a=>C(a.id,"shipped")));const s=new Set(e.map(a=>a.id));p(a=>a.map(r=>s.has(r.id)?{...r,status:"shipped"}:r)),b([]),g(`Updated ${e.length} order(s) to shipped`)}catch(s){console.error("Error updating confirmed orders to shipped:",s),c("Failed to update selected orders")}},me=async e=>{if(window.confirm("Are you sure you want to delete this cancelled order?"))try{await H(e),p(s=>s.filter(a=>a.id!==e)),g("Order deleted")}catch{c("Failed to delete order")}},pe=e=>{const s=F[e.productId];return s?P?s.title:s.commonName:e.name},R=e=>{const s=F[e.productId];return s?.plantId?s.plantId:e.productId||""},ue=async e=>{try{const s=parseFloat(U)||0;await fe(e,s),p(a=>a.map(r=>r.id===e?{...r,deliveryCharge:s}:r)),O(null),g("Delivery charge updated!")}catch{c("Failed to update delivery charge")}},he=async e=>{try{const s=x.find(r=>r.id===e);if(!s)return;const a={...s.customer,...v};await ye(e,a),p(r=>r.map(n=>n.id===e?{...n,customer:a}:n)),$(null),g("Customer details updated!")}catch{c("Failed to update customer details")}},ge=async(e,s)=>{B(!0);try{const a=await Ne(e,s);p(r=>r.map(n=>n.id===e?{...n,items:s,totalAmount:a.totalAmount,totalItems:a.totalItems}:n)),M(null),g("Order items updated!")}catch{c("Failed to update items")}finally{B(!1)}},h=x.filter(e=>d==="all"?e.status!=="cancelled":e.status===d).filter(e=>{if(!L.trim())return!0;const s=L.toLowerCase();return(e.orderId||"").toLowerCase().includes(s)||(e.customer?.name||"").toLowerCase().includes(s)||(e.customer?.phone||"").toLowerCase().includes(s)||(e.customer?.whatsapp||"").toLowerCase().includes(s)||(e.customer?.address||"").toLowerCase().includes(s)||(e.customer?.district||"").toLowerCase().includes(s)||(e.customer?.state||"").toLowerCase().includes(s)||(e.customer?.pincode||"").toLowerCase().includes(s)}),l=h.some(e=>u.includes(e.id)),m=h.filter(e=>u.includes(e.id)).length;return t.jsxs("div",{className:"animate-fade-in pb-20",children:[t.jsxs("div",{className:"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4",children:[t.jsx("h1",{className:"text-xl font-semibold text-[var(--text-primary)]",children:"Orders"}),t.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[t.jsx(z,{to:"/admin/orders/new",className:"btn btn-primary text-sm",children:"+ New Order"}),t.jsx("button",{onClick:()=>Y(e=>!e),className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${P?"bg-[var(--color-forest)] text-white":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
            `,children:P?"📖 Title":"🏷️ Common Name"}),t.jsx(z,{to:"/admin",className:"btn btn-secondary text-sm",children:"← Back"})]})]}),t.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-3 mb-6",children:[t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-[var(--color-forest)]",children:x.filter(e=>e.status!=="cancelled").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Total Orders"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-yellow-600",children:x.filter(e=>e.status==="pending").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Pending"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-blue-600",children:x.filter(e=>e.status==="confirmed").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Confirmed"})]}),t.jsxs("div",{className:"card p-3 text-center",children:[t.jsx("p",{className:"text-2xl font-bold text-green-600",children:x.filter(e=>e.status==="delivered").length}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)]",children:"Delivered"})]})]}),t.jsx("div",{className:"flex gap-2 mb-4 overflow-x-auto pb-1",children:["all",...W].map(e=>{const s=e==="all"?x.filter(r=>r.status!=="cancelled").length:x.filter(r=>r.status===e).length,a=d===e;return t.jsxs("button",{onClick:()=>Q(e),className:`
                px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap flex items-center gap-1.5
                ${a?"bg-[var(--color-forest)] text-white":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
              `,children:[e==="all"?"All":e,t.jsx("span",{className:`
                text-[10px] px-1.5 py-0.5 rounded-full
                ${a?"bg-white/20":"bg-[var(--bg-secondary)]"}
              `,children:s})]},e)})}),t.jsx("div",{className:"mb-4",children:t.jsx("input",{type:"text",value:L,onChange:e=>X(e.target.value),placeholder:"🔍 Search by Order ID, name, phone, address...",className:"input text-sm w-full"})}),d==="confirmed"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>A(h),disabled:!h.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${l?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:l?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:ne,disabled:!l,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${l?"bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🖨️ Print",m>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:m})]}),t.jsxs("button",{type:"button",onClick:xe,disabled:!l,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${l?"bg-blue-600 text-white hover:bg-blue-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🚚 Shipped",m>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:m})]})]}),d==="pending"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>A(h),disabled:!h.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${l?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:l?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:ce,disabled:!l,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${l?"bg-blue-600 text-white hover:bg-blue-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["✅ Confirm",m>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:m})]}),t.jsxs("button",{type:"button",onClick:oe,disabled:!l,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${l?"bg-red-600 text-white hover:bg-red-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["❌ Cancel",m>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:m})]})]}),d==="shipped"&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>A(h),disabled:!h.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${l?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:l?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:de,disabled:!l,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${l?"bg-[var(--color-forest)] text-white hover:bg-[var(--color-forest-dark)]":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["✅ Delivered",m>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:m})]})]}),(d==="cancelled"||d==="delivered")&&t.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[t.jsx("button",{type:"button",onClick:()=>A(h),disabled:!h.length,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all
              ${l?"bg-[var(--bg-tertiary)] text-[var(--text-primary)]":"bg-[var(--bg-secondary)] text-[var(--text-secondary)]"}
            `,children:l?"Unselect visible":"Select visible"}),t.jsxs("button",{type:"button",onClick:ie,disabled:!l,className:`
              text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1
              ${l?"bg-red-600 text-white hover:bg-red-700":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed"}
            `,children:["🗑️ Delete Selected",m>0&&t.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-black/10",children:m})]})]}),_?t.jsx("div",{className:"space-y-3",children:[...Array(3)].map((e,s)=>t.jsxs("div",{className:"card p-4 animate-pulse",children:[t.jsx("div",{className:"h-4 bg-gray-200 rounded w-1/3 mb-2"}),t.jsx("div",{className:"h-3 bg-gray-200 rounded w-1/2"})]},s))}):x.length===0?t.jsxs("div",{className:"text-center py-12",children:[t.jsx("span",{className:"text-5xl",children:"📋"}),t.jsx("h2",{className:"text-lg font-semibold text-[var(--text-primary)] mt-4",children:"No orders yet"}),t.jsx("p",{className:"text-[var(--text-secondary)] mt-2",children:"Orders will appear here when customers checkout."})]}):t.jsx("div",{className:"space-y-3",children:h.map(e=>t.jsxs("div",{className:`card overflow-hidden ${ae(e)?"ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30":""}`,children:[t.jsx("button",{onClick:()=>se(e.id),className:"w-full p-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors",children:t.jsxs("div",{className:"flex items-start justify-between gap-3",children:[["pending","confirmed","shipped","cancelled","delivered"].includes(d)&&e.status===d&&t.jsx("div",{className:"pt-1",children:t.jsx("input",{type:"checkbox",checked:u.includes(e.id),onChange:s=>{s.stopPropagation(),re(e.id)},className:"w-4 h-4 rounded",onClick:s=>s.stopPropagation()})}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"font-mono text-sm font-semibold text-[var(--color-forest)]",children:e.orderId}),t.jsx("p",{className:"text-xs text-[var(--text-secondary)] mt-1",children:ee(e.createdAt)}),t.jsx("p",{className:"text-sm text-[var(--text-primary)] mt-1",children:e.customer?.name||"Guest"})]}),t.jsxs("div",{className:"text-right",children:[t.jsx("span",{className:`badge ${te(e.status)} capitalize text-xs`,children:e.status}),t.jsxs("p",{className:"font-semibold text-[var(--text-primary)] mt-2",children:[y,((e.totalAmount||0)+(e.deliveryCharge||0)).toLocaleString("en-IN")]}),t.jsxs("p",{className:"text-xs text-[var(--text-secondary)]",children:[e.totalItems," items",e.deliveryCharge?` · +${y}${e.deliveryCharge} delivery`:""]})]})]})}),E===e.id&&t.jsxs("div",{className:"border-t border-[var(--border-color)] p-4 bg-[var(--bg-tertiary)] animate-fade-in",children:[t.jsxs("div",{className:"mb-4",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)]",children:"Customer Details"}),t.jsx("button",{onClick:()=>{if(k===e.id){$(null);return}$(e.id),f({name:e.customer?.name||"",phone:e.customer?.phone||"",whatsapp:e.customer?.whatsapp||"",address:e.customer?.address||"",district:e.customer?.district||"",state:e.customer?.state||"",pincode:e.customer?.pincode||""})},className:`text-xs px-2 py-1 rounded-lg font-medium transition-all ${k===e.id?"bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`,children:k===e.id?"✕ Cancel":"✏️ Edit"})]}),k===e.id?t.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3 text-sm",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Name"}),t.jsx("input",{type:"text",value:v.name,onChange:s=>f(a=>({...a,name:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Phone"}),t.jsx("input",{type:"tel",value:v.phone,onChange:s=>f(a=>({...a,phone:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"WhatsApp"}),t.jsx("input",{type:"tel",value:v.whatsapp,onChange:s=>f(a=>({...a,whatsapp:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{className:"md:col-span-2",children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Address"}),t.jsx("textarea",{value:v.address,onChange:s=>f(a=>({...a,address:s.target.value})),className:"input text-sm w-full min-h-[60px]"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"District"}),t.jsx("input",{type:"text",value:v.district,onChange:s=>f(a=>({...a,district:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"State"}),t.jsx("input",{type:"text",value:v.state,onChange:s=>f(a=>({...a,state:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[var(--text-secondary)] text-xs mb-1",children:"Pincode"}),t.jsx("input",{type:"text",value:v.pincode,onChange:s=>f(a=>({...a,pincode:s.target.value})),className:"input text-sm w-full"})]}),t.jsxs("div",{className:"md:col-span-2 flex gap-2 justify-end",children:[t.jsx("button",{onClick:()=>he(e.id),className:"btn btn-primary text-xs",children:"Save"}),t.jsx("button",{onClick:()=>$(null),className:"btn btn-secondary text-xs",children:"Cancel"})]})]}):t.jsxs("div",{className:"space-y-2 text-sm",children:[t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsxs("p",{children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Phone:"})," ",e.customer?.phone||"N/A"]}),t.jsxs("p",{children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"WhatsApp:"})," ",e.customer?.whatsapp||"N/A"]}),t.jsxs("p",{className:"col-span-2",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Address:"})," ",e.customer?.address||"N/A"]}),t.jsxs("p",{className:"col-span-2",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Location:"})," ",[e.customer?.district,e.customer?.state,e.customer?.pincode].filter(Boolean).join(", ")||"N/A"]}),e.customer?.userId&&t.jsxs("p",{className:"col-span-2 text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"User ID:"})," ",t.jsx("span",{className:"font-mono",children:e.customer.userId})]})]}),t.jsxs("div",{className:"pt-2 border-t border-[var(--border-color)] text-xs",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Order Link:"})," ",(()=>{const s=ve(e.id);return t.jsx("a",{href:s,target:"_blank",rel:"noopener noreferrer",className:"text-[var(--color-forest)] break-all hover:underline",onClick:a=>a.stopPropagation(),children:s})})()]})]})]}),t.jsxs("div",{className:"mb-4",children:[t.jsxs("div",{className:"flex items-center justify-between mb-2",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)]",children:"Items"}),t.jsx("button",{onClick:()=>M(S===e.id?null:e.id),className:`text-xs px-2 py-1 rounded-lg font-medium transition-all ${S===e.id?"bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400":"bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`,children:S===e.id?"✕ Cancel":"✏️ Edit"})]}),S===e.id?t.jsx(ke,{items:e.items,onSave:s=>ge(e.id,s),saving:K}):t.jsx("div",{className:"space-y-2",children:e.items?.map((s,a)=>t.jsxs("div",{className:"flex items-center gap-2 text-sm",children:[s.imageUrl&&t.jsx("img",{src:Se(s.imageUrl),alt:s.name,className:"w-10 h-10 rounded object-cover"}),t.jsxs("div",{className:"flex-1 min-w-0",children:[t.jsxs("p",{className:"truncate text-[var(--text-primary)]",children:[a+1,". ",pe(s),R(s)&&t.jsxs("span",{className:"text-[var(--text-secondary)] text-xs ml-1",children:["(ID: ",R(s),")"]})]}),t.jsxs("p",{className:"text-xs text-[var(--text-secondary)]",children:[y,s.price," × ",s.quantity," = ",y,(s.price*s.quantity).toLocaleString("en-IN")]})]})]},a))})]}),t.jsxs("div",{className:"mb-4 pt-3 border-t border-[var(--border-color)] space-y-2 text-sm",children:[t.jsxs("div",{className:"flex justify-between text-[var(--text-secondary)]",children:[t.jsx("span",{children:"Subtotal"}),t.jsxs("span",{children:[y,e.totalAmount?.toLocaleString("en-IN")]})]}),t.jsxs("div",{className:"flex justify-between items-center",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:"Delivery"}),J===e.id?t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("span",{className:"text-[var(--text-secondary)]",children:y}),t.jsx("input",{type:"number",value:U,onChange:s=>T(s.target.value),className:"input w-20 py-1 px-2 text-right text-sm",placeholder:"0",min:"0"})]}),t.jsx("button",{onClick:()=>ue(e.id),className:"text-[var(--color-forest)] text-xs font-medium hover:underline",children:"Save"}),t.jsx("button",{onClick:()=>O(null),className:"text-[var(--text-secondary)] text-xs hover:underline",children:"Cancel"})]}):t.jsxs("span",{className:"flex items-center gap-2",children:[t.jsx("span",{className:e.deliveryCharge?"text-[var(--text-primary)]":"text-[var(--text-secondary)] italic",children:e.deliveryCharge?`${y}${e.deliveryCharge.toLocaleString("en-IN")}`:"Not set"}),t.jsx("button",{onClick:()=>{O(e.id),T(e.deliveryCharge?.toString()||"")},className:"text-xs text-[var(--color-forest)] hover:underline",children:e.deliveryCharge?"Edit":"Add"})]})]}),t.jsxs("div",{className:"flex justify-between font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]",children:[t.jsx("span",{children:"Total"}),t.jsxs("span",{children:[y,((e.totalAmount||0)+(e.deliveryCharge||0)).toLocaleString("en-IN")]})]})]}),t.jsxs("div",{className:"mt-4 pt-4 border-t border-[var(--border-color)]",children:[t.jsx("h4",{className:"font-medium text-[var(--text-primary)] mb-2",children:"Update Status"}),t.jsx("div",{className:"flex gap-2 flex-wrap",children:W.map(s=>t.jsx("button",{onClick:async()=>{try{await C(e.id,s),p(a=>a.map(r=>r.id===e.id?{...r,status:s}:r)),g(`Order status updated to ${s}`)}catch{c("Failed to update status")}},disabled:e.status===s,className:`
                            px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                            ${e.status===s?"bg-[var(--color-forest)] text-white cursor-default":"bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-forest)]"}
                          `,children:s},s))})]}),e.status==="cancelled"&&t.jsx("div",{className:"mt-4 pt-4 border-t border-[var(--border-color)]",children:t.jsx("button",{onClick:()=>me(e.id),className:"btn bg-red-500 text-white hover:bg-red-600 text-sm w-full",children:"🗑️ Delete This Order"})})]})]},e.id))})]})}export{Oe as default};
