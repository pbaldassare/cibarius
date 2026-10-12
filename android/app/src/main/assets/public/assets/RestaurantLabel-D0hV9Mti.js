import{t as b,r as p,j as t,B as d,P as E}from"./index-CPp3vvts.js";import{b as T}from"./browser-CjSdxGTc.js";import{P as L,a as C,b as D}from"./popover-CHn60ovL.js";import{P as h}from"./printer-CyDAONgX.js";import{M as k}from"./minus-CfJhkifL.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=b("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]),u={frigo:"FRIGO (0-4 °C)",freezer:"CONGELATORE (-18 °C)",ambiente:"AMBIENTE"},c=e=>e?new Date(e).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"}):"—",v=(e,n)=>{if(!n.length)return e;let s=e;for(const a of n){const l=new RegExp(`(${a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");s=s.replace(l,"<b>$1</b>")}return s},N=e=>{const n=(e.ddtType||"ddt").toUpperCase(),s=[];if(e.ddtNumber&&s.push(`n. ${e.ddtNumber}`),e.ddtDate&&s.push(`del ${c(e.ddtDate)}`),!s.length&&!e.ddtSupplier)return null;const a=s.length?`${n} ${s.join(" ")}`:n;return e.ddtSupplier?`${a} — ${e.ddtSupplier}`:a},g=(e,n)=>{var r;const s=e.ingredients?v(e.ingredients,e.allergens||[]):"",a=N(e),l=(r=e.allergens)!=null&&r.length?`<div class="allergens"><b>ALLERGENI: ${e.allergens.join(", ")}</b></div>`:"";return`
    <div class="label-box">
      <div class="header-row">
        <div class="product-name">${e.name}</div>
        ${e.restaurantName?`<div class="restaurant-name">${e.restaurantName}</div>`:""}
      </div>
      ${s?`<div class="ingredients"><span class="label-title">INGREDIENTI:</span> ${s}</div>`:""}
      ${l}
      <div class="dates-row">
        <div><span class="label-title">DATA PRODUZIONE:</span> ${c(e.productionDate)}</div>
        <div><span class="label-title">DATA SCADENZA:</span> ${c(e.expiryDate)}</div>
      </div>
      <div class="footer-row">
        <div class="footer-left">
          <div><span class="label-title">CONSERVAZIONE:</span> ${u[e.storageType||""]||e.storageType||""}</div>
          ${e.netWeightG?`<div><span class="label-title">PESO NETTO:</span> ${e.netWeightG>=1e3?(e.netWeightG/1e3).toLocaleString("it-IT")+" kg":e.netWeightG+" g"}</div>`:""}
          ${e.chefLifeHours?`<div><span class="label-title">CHEF LIFE:</span> ${e.chefLifeHours}h</div>`:""}
          ${e.lotNumber?`<div><span class="label-title">LOTTO:</span> ${e.lotNumber}</div>`:""}
          ${a?`<div><span class="label-title">DOC. PROVENIENZA:</span> ${a}</div>`:""}
        </div>
        <div class="qr"><img src="${n}" /></div>
      </div>
    </div>
  `},f=`
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .label-box {
    width: 62mm; min-height: 40mm; font-family: Arial, Helvetica, sans-serif;
    border: 0.5pt solid #000; padding: 2mm; display: flex; flex-direction: column; gap: 1mm;
    font-size: 6pt; line-height: 1.3; color: #000;
  }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; }
  .product-name { font-size: 8pt; font-weight: bold; text-transform: uppercase; flex: 1; }
  .restaurant-name { font-size: 5pt; text-align: right; max-width: 30%; color: #333; }
  .ingredients { font-size: 5.5pt; line-height: 1.2; }
  .allergens { font-size: 5.5pt; color: #c00; }
  .label-title { font-weight: bold; font-size: 5pt; text-transform: uppercase; }
  .dates-row { display: flex; gap: 4mm; font-size: 5.5pt; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
  .footer-left { font-size: 5.5pt; display: flex; flex-direction: column; gap: 0.5mm; }
  .qr { width: 14mm; height: 14mm; flex-shrink: 0; }
  .qr img { width: 100%; height: 100%; }
`,S=({label:e,showActions:n=!0})=>{const[s,a]=p.useState(""),r=`${window.location.origin}/restaurant/item/${e.type==="product"?"inv":"prep"}-${e.id}`;p.useEffect(()=>{T.toDataURL(r,{width:120,margin:1}).then(a)},[r]);const j=e.ingredients?v(e.ingredients,e.allergens||[]):"",m=N(e),[o,x]=p.useState(21),w=()=>{const i=window.open("","_blank");i&&(i.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichetta - ${e.name}</title>
        <style>
          @page { size: 62mm 40mm; margin: 0; }
          body { margin: 0; padding: 0; }
          ${f}
        </style>
      </head>
      <body>${g(e,s)}</body>
      </html>
    `),i.document.close(),setTimeout(()=>{i.print(),i.close()},500))},y=()=>{const i=window.open("","_blank");if(!i)return;const $=Array.from({length:o},()=>g(e,s)).join("");i.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Griglia etichette - ${e.name}</title>
        <style>
          @page { size: A4 portrait; margin: 4mm 12mm; }
          body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0; align-content: flex-start; }
          ${f}
          .label-box { height: 40mm; page-break-inside: avoid; }
        </style>
      </head>
      <body>${$}</body>
      </html>
    `),i.document.close(),setTimeout(()=>{i.print(),i.close()},500)};return t.jsxs("div",{className:"space-y-3",children:[t.jsxs("div",{className:"border border-border rounded-lg p-3 bg-white overflow-hidden",style:{maxWidth:"340px"},children:[t.jsxs("div",{className:"flex justify-between items-start gap-2",children:[t.jsx("p",{className:"text-xs font-bold text-black uppercase leading-tight flex-1",children:e.name}),e.restaurantName&&t.jsx("p",{className:"text-[7px] text-gray-500 text-right max-w-[30%]",children:e.restaurantName})]}),e.ingredients&&t.jsx("p",{className:"text-[8px] text-black mt-1 leading-tight",dangerouslySetInnerHTML:{__html:`<span class="font-bold uppercase text-[7px]">Ingredienti:</span> ${j}`}}),e.allergens&&e.allergens.length>0&&t.jsxs("p",{className:"text-[8px] font-bold text-red-600 mt-0.5",children:["ALLERGENI: ",e.allergens.join(", ")]}),t.jsxs("div",{className:"flex gap-3 mt-1 text-[8px] text-black",children:[t.jsxs("span",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Prod:"})," ",c(e.productionDate)]}),t.jsxs("span",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Scad:"})," ",c(e.expiryDate)]})]}),t.jsxs("div",{className:"flex justify-between items-end mt-1",children:[t.jsxs("div",{className:"text-[8px] text-black space-y-0.5",children:[t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Conservazione:"})," ",u[e.storageType||""]||""]}),e.netWeightG&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Peso netto:"})," ",e.netWeightG>=1e3?`${(e.netWeightG/1e3).toLocaleString("it-IT")} kg`:`${e.netWeightG} g`]}),e.chefLifeHours&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Chef life:"})," ",e.chefLifeHours,"h"]}),e.lotNumber&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Lotto:"})," ",e.lotNumber]}),m&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Doc. provenienza:"})," ",m]})]}),s&&t.jsx("img",{src:s,alt:"QR",className:"w-14 h-14 shrink-0"})]})]}),n&&t.jsxs("div",{className:"flex gap-2",children:[t.jsxs(d,{size:"sm",variant:"outline",onClick:w,className:"gap-1.5",children:[t.jsx(h,{className:"h-3.5 w-3.5"}),"Stampa etichetta"]}),t.jsxs(L,{children:[t.jsx(C,{asChild:!0,children:t.jsxs(d,{size:"sm",variant:"outline",className:"gap-1.5",children:[t.jsx(z,{className:"h-3.5 w-3.5"}),"Griglia A4"]})}),t.jsxs(D,{className:"w-56 p-3",align:"start",children:[t.jsx("p",{className:"text-xs font-medium mb-2",children:"Copie per foglio A4 (max 21)"}),t.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[t.jsx(d,{size:"icon",variant:"outline",className:"h-7 w-7",onClick:()=>x(i=>Math.max(1,i-1)),disabled:o<=1,children:t.jsx(k,{className:"h-3 w-3"})}),t.jsx("span",{className:"text-sm font-semibold w-8 text-center",children:o}),t.jsx(d,{size:"icon",variant:"outline",className:"h-7 w-7",onClick:()=>x(i=>Math.min(21,i+1)),disabled:o>=21,children:t.jsx(E,{className:"h-3 w-3"})})]}),t.jsxs(d,{size:"sm",className:"w-full gap-1.5",onClick:y,children:[t.jsx(h,{className:"h-3.5 w-3.5"}),"Stampa ",o," etichette"]})]})]})]})]})};export{S as R};
