import{r as c,j as t,N as $}from"./vendor-react-Drkgvv_v.js";import{b as N,i as _,C as b,G as z}from"./index-DMF0d0n5.js";import"./vendor-firebase-lKfkPGEE.js";function R(){const{error:n}=N(),[d,u]=c.useState([]),[l,w]=c.useState(!0);c.useEffect(()=>{(async()=>{try{const a=await _();u(a)}catch{n("Failed to load products for export")}finally{w(!1)}})()},[n]);const v=()=>{const o=d.filter(e=>e.available);if(!o.length){n("No available products to export");return}const a=window.open("","_blank");if(!a){n("Please allow pop-ups to export the PDF");return}const y=new Date().toLocaleString("en-IN"),p=window.location.origin,f=o.map(e=>{const s=e.title||e.commonName||e.name||"",h=s.length>20?s.slice(0,20):s,r=e.imageUrl||"/placeholder-plant.jpg";let i;r.startsWith("http://")||r.startsWith("https://")?i=r:r.startsWith("public/")?i=p+"/"+r.slice(7):i=p+(r.startsWith("/")?"":"/")+r;const P=(e.salesPrice||e.price||"").toString(),x=e.originalPrice?e.originalPrice.toString():"",j=`${p}/plant/${e.id}`;return`
        <div class="product-card">
          <div class="product-image-wrapper">
            <img
              src="${i}"
              alt="${h}"
              class="product-image"
            />
          </div>
          <div class="product-info">
            <div class="product-id">ID: ${e.id}</div>
            <div class="product-name">
              <a href="${j}" target="_blank" rel="noopener noreferrer">${h}</a>
            </div>
            <div class="product-price">
              ${x?`<span class="price-original">${b}${x}</span>`:""}
              <span class="price-sales">${b}${P}</span>
            </div>
          </div>
        </div>
      `}),g=12,m=[];for(let e=0;e<f.length;e+=g){const s=f.slice(e,e+g).join("");m.push(s)}const k=`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>RPH_catalog</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              padding: 24px;
              color: #111827;
              background: #ffffff;
            }
            h1 {
              font-size: 20px;
              margin-bottom: 4px;
            }
            p {
              margin: 0 0 16px 0;
              font-size: 12px;
              color: #4b5563;
            }
            .page {
              page-break-after: always;
            }
            .page:last-of-type {
              page-break-after: auto;
            }
            .cover-page {
              background: #ffffff;
            }
            .cover-card {
              background: white;
              border-radius: 24px;
              padding: 48px 64px;
              box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
              max-width: 720px;
              width: 100%;
              text-align: center;
              display: flex;
              flex-direction: column;
            }
            .brand-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 24px;
            }
            .brand-logo {
              width: 40px;
              height: 40px;
              border-radius: 12px;
              object-fit: contain;
              box-shadow: 0 8px 16px rgba(15, 23, 42, 0.35);
            }
            .brand-name {
              font-size: 16px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #111827;
            }
            .cover-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 6px 14px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 600;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              background: linear-gradient(to right, #22c55e, #16a34a);
              color: white;
              margin-bottom: 18px;
            }
            .cover-title {
              font-size: 34px;
              font-weight: 700;
              color: #064e3b;
              margin-bottom: 18px;
            }
            .cover-subtitle {
              font-size: 18px;
              color: #047857;
              margin-bottom: 24px;
            }
            .cover-meta {
              font-size: 14px;
              color: #4b5563;
              margin-bottom: 16px;
            }
            .cover-note {
              font-size: 14px;
              color: #6b21a8;
              margin-bottom: 32px;
            }
            .footer {
              margin-top: auto;
              padding-top: 8px;
              border-top: 1px dashed #d1d5db;
              font-size: 10px;
              color: #4b5563;
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              justify-content: center;
            }
            .footer--cover {
              font-size: 11px;
            }
            .footer strong {
              color: #065f46;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 16px;
              margin-top: 8px;
            }
            .product-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
            }
            .product-image-wrapper {
              width: 96px;
              height: 96px;
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid #e5e7eb;
              background-color: #f9fafb;
            }
            .product-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .product-info {
              text-align: center;
              font-size: 12px;
            }
            .product-id {
              color: #6b7280;
              margin-bottom: 2px;
            }
            .product-name {
              font-weight: 600;
              margin-bottom: 4px;
            }
            .product-name a {
              color: #064e3b;
              text-decoration: underline;
            }
            .product-price {
              font-size: 12px;
            }
            .price-original {
              text-decoration: line-through;
              color: #9ca3af;
              margin-right: 4px;
            }
            .price-sales {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="page cover-page">
            <div class="cover-card">
              <div class="brand-row">
                <img src="${z}" alt="Rosary Plant House logo" class="brand-logo" />
                <div class="brand-name">Rosary Plant House®</div>
              </div>
              <div class="cover-pill">Plant Catalog</div>
              <h1 class="cover-title">RPH_catalog</h1>
              <p class="cover-subtitle">A snapshot of plants currently available for you.</p>
              <p class="cover-meta">
                Generated on: ${y} · Currently available products: ${o.length}
              </p>
              <p class="cover-note">
                If this catalog is older than 3 days, please reach us to get the latest plants.
                Click on the plant name to view the plant details.
              </p>
              <div class="footer footer--cover">
                <div>
                  <span><strong>Reach us:</strong></span>
                  <span>
                    <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer">WhatsApp: 7904050237</a>
                  </span>
                  <span>· <a href="https://www.instagram.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer">Instagram</a></span>
                  <span>· <a href="https://www.facebook.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer">Facebook</a></span>
                  <span>· <a href="https://www.rosaryplanthouse.com" target="_blank" rel="noopener noreferrer">www.rosaryplanthouse.com</a></span>
                </div>
                <div>
                  Please send the screenshot or ID for the required plants over WhatsApp. Or select from our website
                  <a href="https://www.rosaryplanthouse.com" target="_blank" rel="noopener noreferrer"> www.rosaryplanthouse.com</a>
                  for the latest collection.
                </div>
              </div>
            </div>
          </div>
          ${m.map(e=>`
            <div class="page">
              <div class="grid">
                ${e}
              </div>
              <div class="footer">
                <div>
                  <span><strong>Reach us:</strong></span>
                  <span>
                    <a href="https://wa.me/917904050237" target="_blank" rel="noopener noreferrer">WhatsApp: 7904050237</a>
                  </span>
                  <span>· <a href="https://www.instagram.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer">Instagram</a></span>
                  <span>· <a href="https://www.facebook.com/rosaryplanthouse" target="_blank" rel="noopener noreferrer">Facebook</a></span>
                  <span>· <a href="https://www.rosaryplanthouse.com" target="_blank" rel="noopener noreferrer">www.rosaryplanthouse.com</a></span>
                </div>
                <div>
                  Please send the screenshot or ID for the required plants over WhatsApp. Or select from our website
                  <a href="https://www.rosaryplanthouse.com" target="_blank" rel="noopener noreferrer"> www.rosaryplanthouse.com</a>
                  for the latest collection.
                </div>
              </div>
            </div>
          `).join("")}
          <script>
            window.onload = function () {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `;a.document.open(),a.document.write(k),a.document.close()};return t.jsxs("div",{className:"animate-fade-in pb-20 max-w-2xl mx-auto",children:[t.jsxs("div",{className:"flex items-center justify-between mb-4",children:[t.jsxs("div",{children:[t.jsx("h1",{className:"text-xl font-semibold text-[var(--color-forest)]",children:"Export Catalog"}),t.jsx("p",{className:"text-sm text-[var(--text-secondary)]",children:"Generate a printable PDF catalog of all currently available products."})]}),t.jsx($,{to:"/admin",className:"btn btn-secondary text-sm",children:"← Back"})]}),t.jsxs("div",{className:"card p-5 flex flex-col gap-3",children:[t.jsxs("p",{className:"text-sm text-[var(--text-secondary)]",children:["Available products found:"," ",t.jsx("span",{className:"font-semibold text-[var(--text-primary)]",children:l?"…":d.filter(o=>o.available).length})]}),t.jsx("button",{type:"button",onClick:v,disabled:l,className:"btn btn-primary self-start",children:l?"Loading products…":"Export available as PDF"})]})]})}export{R as default};
