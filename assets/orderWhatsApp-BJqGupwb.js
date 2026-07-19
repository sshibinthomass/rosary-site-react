const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-7bMzG9ih.js","assets/index-Dl9SXq_g.js","assets/vendor-react--rIqVvME.js","assets/index-DHeJHdOb.css"])))=>i.map(i=>d[i]);
import{w as C,_ as P,x as _,y as v,C as R}from"./index-Dl9SXq_g.js";const U=C("AppLauncher",{web:()=>P(()=>import("./web-7bMzG9ih.js"),__vite__mapDeps([0,1,2,3])).then(t=>new t.AppLauncherWeb)});async function O(t){if(!t)throw new Error("Cannot open an empty URL.");if(_.isNativePlatform()){await U.openUrl({url:t});return}window.open(t,"_blank","noopener,noreferrer")}function q(t,u,s={},i="",l="",e=null,o="INR "){const{name:r="Customer",address:p="",phone:c="",whatsapp:d="",pincode:$="",district:m="",state:h=""}=s,L=t.map((n,a)=>{const N=n.price*n.quantity;return`${n.productId||n.id||a+1}. ${n.name}- ${o}${n.price} * ${n.quantity} = ${o}${N}`}).join(`
`),g=t.reduce((n,a)=>n+a.quantity,0),w=t.reduce((n,a)=>n+a.price*a.quantity,0),y=t.map((n,a)=>`${n.productId||n.id||a+1}-${n.quantity}`).join(",");let b=p;if(m||h||$){const n=[m,h,$].filter(Boolean).join(", ");n&&(b+=`
${n}`)}let A="";if(e&&e.discount>0){const n=e.type==="percentage"?`${e.value}% off`:`${o}${e.value} off`;A=`
Subtotal= ${o}${w.toLocaleString("en-IN")}
Promo Code: ${e.code} (${n}) -${o}${e.discount.toLocaleString("en-IN")}`}const f=[`Order ID: ${l}`];return i&&f.push(`*View Order:* ${i}`),`Hello, I have chosen the following plants from your site

${L}

Total Plants= ${g}${A}
Total Price=${o}${u.toLocaleString("en-IN")} (delivery additional)

${y}

*Customer Details:*
Name: ${r}
${c?`Phone: ${c}`:""}
${d?`WhatsApp: ${d}`:""}
${p?`Address:
${b}`:""}

---
${f.join(`
`)}`}function I(t,u,s={},i="",l="",e=null){const o=q(t,u,s,i,l,e,R),r=encodeURIComponent(o);return`https://wa.me/${v}?text=${r}`}function S(t={},u=""){const s=Array.isArray(t.items)?t.items:[],i=Number.isFinite(Number(t.totalAmount))?Number(t.totalAmount):s.reduce((e,o)=>e+(Number(o.price)||0)*(Number(o.quantity)||0),0),l=t.promoCode?{code:t.promoCode,discount:Number(t.discountAmount)||0,type:t.discountType||null,value:Number(t.discountValue)||0}:null;return I(s,i,t.customer||{},u||t.orderUrl||"",t.orderId||t.id||"",l)}export{S as b,I as g,O as o};
