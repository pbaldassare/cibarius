import{q as B,a0 as K,aC as b,r as l,j as t,aD as E,ac as O,a1 as $,ab as P,as as D,aF as V,aH as Q,aG as Y,aI as J,aJ as X,aK as ee,aL as te,aO as oe,aP as se,aa as re,aN as ne,aB as ae,a4 as ie,B as v,P as ce}from"./index-CdYyU4Wh.js";import{b as de}from"./browser-CjSdxGTc.js";import{P as y}from"./printer-E-c4lwS_.js";import{M as le}from"./minus-CYxzzIO7.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=B("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);var C="Popover",[T,De]=K(C,[b]),w=b(),[ue,m]=T(C),S=e=>{const{__scopePopover:s,children:o,open:r,defaultOpen:n,onOpenChange:a,modal:i=!1}=e,c=w(s),p=l.useRef(null),[u,h]=l.useState(!1),[f,d]=re({prop:r,defaultProp:n??!1,onChange:a,caller:C});return t.jsx(ne,{...c,children:t.jsx(ue,{scope:s,contentId:ae(),triggerRef:p,open:f,onOpenChange:d,onOpenToggle:l.useCallback(()=>d(g=>!g),[d]),hasCustomAnchor:u,onCustomAnchorAdd:l.useCallback(()=>h(!0),[]),onCustomAnchorRemove:l.useCallback(()=>h(!1),[]),modal:i,children:o})})};S.displayName=C;var _="PopoverAnchor",me=l.forwardRef((e,s)=>{const{__scopePopover:o,...r}=e,n=m(_,o),a=w(o),{onCustomAnchorAdd:i,onCustomAnchorRemove:c}=n;return l.useEffect(()=>(i(),()=>c()),[i,c]),t.jsx(E,{...a,...r,ref:s})});me.displayName=_;var k="PopoverTrigger",I=l.forwardRef((e,s)=>{const{__scopePopover:o,...r}=e,n=m(k,o),a=w(o),i=O(s,n.triggerRef),c=t.jsx($.button,{type:"button","aria-haspopup":"dialog","aria-expanded":n.open,"aria-controls":n.contentId,"data-state":M(n.open),...r,ref:i,onClick:P(e.onClick,n.onOpenToggle)});return n.hasCustomAnchor?c:t.jsx(E,{asChild:!0,...a,children:c})});I.displayName=k;var j="PopoverPortal",[he,fe]=T(j,{forceMount:void 0}),L=e=>{const{__scopePopover:s,forceMount:o,children:r,container:n}=e,a=m(j,s);return t.jsx(he,{scope:s,forceMount:o,children:t.jsx(D,{present:o||a.open,children:t.jsx(oe,{asChild:!0,container:n,children:r})})})};L.displayName=j;var x="PopoverContent",G=l.forwardRef((e,s)=>{const o=fe(x,e.__scopePopover),{forceMount:r=o.forceMount,...n}=e,a=m(x,e.__scopePopover);return t.jsx(D,{present:r||a.open,children:a.modal?t.jsx(ge,{...n,ref:s}):t.jsx(ve,{...n,ref:s})})});G.displayName=x;var xe=se("PopoverContent.RemoveScroll"),ge=l.forwardRef((e,s)=>{const o=m(x,e.__scopePopover),r=l.useRef(null),n=O(s,r),a=l.useRef(!1);return l.useEffect(()=>{const i=r.current;if(i)return V(i)},[]),t.jsx(Q,{as:xe,allowPinchZoom:!0,children:t.jsx(z,{...e,ref:n,trapFocus:o.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:P(e.onCloseAutoFocus,i=>{var c;i.preventDefault(),a.current||(c=o.triggerRef.current)==null||c.focus()}),onPointerDownOutside:P(e.onPointerDownOutside,i=>{const c=i.detail.originalEvent,p=c.button===0&&c.ctrlKey===!0,u=c.button===2||p;a.current=u},{checkForDefaultPrevented:!1}),onFocusOutside:P(e.onFocusOutside,i=>i.preventDefault(),{checkForDefaultPrevented:!1})})})}),ve=l.forwardRef((e,s)=>{const o=m(x,e.__scopePopover),r=l.useRef(!1),n=l.useRef(!1);return t.jsx(z,{...e,ref:s,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:a=>{var i,c;(i=e.onCloseAutoFocus)==null||i.call(e,a),a.defaultPrevented||(r.current||(c=o.triggerRef.current)==null||c.focus(),a.preventDefault()),r.current=!1,n.current=!1},onInteractOutside:a=>{var p,u;(p=e.onInteractOutside)==null||p.call(e,a),a.defaultPrevented||(r.current=!0,a.detail.originalEvent.type==="pointerdown"&&(n.current=!0));const i=a.target;((u=o.triggerRef.current)==null?void 0:u.contains(i))&&a.preventDefault(),a.detail.originalEvent.type==="focusin"&&n.current&&a.preventDefault()}})}),z=l.forwardRef((e,s)=>{const{__scopePopover:o,trapFocus:r,onOpenAutoFocus:n,onCloseAutoFocus:a,disableOutsidePointerEvents:i,onEscapeKeyDown:c,onPointerDownOutside:p,onFocusOutside:u,onInteractOutside:h,...f}=e,d=m(x,o),g=w(o);return Y(),t.jsx(J,{asChild:!0,loop:!0,trapped:r,onMountAutoFocus:n,onUnmountAutoFocus:a,children:t.jsx(X,{asChild:!0,disableOutsidePointerEvents:i,onInteractOutside:h,onEscapeKeyDown:c,onPointerDownOutside:p,onFocusOutside:u,onDismiss:()=>d.onOpenChange(!1),children:t.jsx(ee,{"data-state":M(d.open),role:"dialog",id:d.contentId,...g,...f,ref:s,style:{...f.style,"--radix-popover-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-popover-content-available-width":"var(--radix-popper-available-width)","--radix-popover-content-available-height":"var(--radix-popper-available-height)","--radix-popover-trigger-width":"var(--radix-popper-anchor-width)","--radix-popover-trigger-height":"var(--radix-popper-anchor-height)"}})})})}),F="PopoverClose",Pe=l.forwardRef((e,s)=>{const{__scopePopover:o,...r}=e,n=m(F,o);return t.jsx($.button,{type:"button",...r,ref:s,onClick:P(e.onClick,()=>n.onOpenChange(!1))})});Pe.displayName=F;var Ne="PopoverArrow",we=l.forwardRef((e,s)=>{const{__scopePopover:o,...r}=e,n=w(o);return t.jsx(te,{...n,...r,ref:s})});we.displayName=Ne;function M(e){return e?"open":"closed"}var Ce=S,je=I,ye=L,H=G;const Re=Ce,Ae=je,W=l.forwardRef(({className:e,align:s="center",sideOffset:o=4,...r},n)=>t.jsx(ye,{children:t.jsx(H,{ref:n,align:s,sideOffset:o,className:ie("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",e),...r})}));W.displayName=H.displayName;const U={frigo:"FRIGO (0-4 °C)",freezer:"CONGELATORE (-18 °C)",ambiente:"AMBIENTE"},N=e=>e?new Date(e).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"}):"—",q=(e,s)=>{if(!s.length)return e;let o=e;for(const r of s){const n=new RegExp(`(${r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");o=o.replace(n,"<b>$1</b>")}return o},Z=e=>{const s=(e.ddtType||"ddt").toUpperCase(),o=[];if(e.ddtNumber&&o.push(`n. ${e.ddtNumber}`),e.ddtDate&&o.push(`del ${N(e.ddtDate)}`),!o.length&&!e.ddtSupplier)return null;const r=o.length?`${s} ${o.join(" ")}`:s;return e.ddtSupplier?`${r} — ${e.ddtSupplier}`:r},R=(e,s)=>{var a;const o=e.ingredients?q(e.ingredients,e.allergens||[]):"",r=Z(e),n=(a=e.allergens)!=null&&a.length?`<div class="allergens"><b>ALLERGENI: ${e.allergens.join(", ")}</b></div>`:"";return`
    <div class="label-box">
      <div class="header-row">
        <div class="product-name">${e.name}</div>
        ${e.restaurantName?`<div class="restaurant-name">${e.restaurantName}</div>`:""}
      </div>
      ${o?`<div class="ingredients"><span class="label-title">INGREDIENTI:</span> ${o}</div>`:""}
      ${n}
      <div class="dates-row">
        <div><span class="label-title">DATA PRODUZIONE:</span> ${N(e.productionDate)}</div>
        <div><span class="label-title">DATA SCADENZA:</span> ${N(e.expiryDate)}</div>
      </div>
      <div class="footer-row">
        <div class="footer-left">
          <div><span class="label-title">CONSERVAZIONE:</span> ${U[e.storageType||""]||e.storageType||""}</div>
          ${e.netWeightG?`<div><span class="label-title">PESO NETTO:</span> ${e.netWeightG>=1e3?(e.netWeightG/1e3).toLocaleString("it-IT")+" kg":e.netWeightG+" g"}</div>`:""}
          ${e.chefLifeHours?`<div><span class="label-title">CHEF LIFE:</span> ${e.chefLifeHours}h</div>`:""}
          ${e.lotNumber?`<div><span class="label-title">LOTTO:</span> ${e.lotNumber}</div>`:""}
          ${r?`<div><span class="label-title">DOC. PROVENIENZA:</span> ${r}</div>`:""}
        </div>
        <div class="qr"><img src="${s}" /></div>
      </div>
    </div>
  `},A=`
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
`,Te=({label:e,showActions:s=!0})=>{const[o,r]=l.useState(""),a=`${window.location.origin}/restaurant/item/${e.type==="product"?"inv":"prep"}-${e.id}`;l.useEffect(()=>{de.toDataURL(a,{width:120,margin:1}).then(r)},[a]);const i=e.ingredients?q(e.ingredients,e.allergens||[]):"",c=Z(e),[p,u]=l.useState(21),h=()=>{const d=window.open("","_blank");d&&(d.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichetta - ${e.name}</title>
        <style>
          @page { size: 62mm 40mm; margin: 0; }
          body { margin: 0; padding: 0; }
          ${A}
        </style>
      </head>
      <body>${R(e,o)}</body>
      </html>
    `),d.document.close(),setTimeout(()=>{d.print(),d.close()},500))},f=()=>{const d=window.open("","_blank");if(!d)return;const g=Array.from({length:p},()=>R(e,o)).join("");d.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Griglia etichette - ${e.name}</title>
        <style>
          @page { size: A4 portrait; margin: 4mm 12mm; }
          body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0; align-content: flex-start; }
          ${A}
          .label-box { height: 40mm; page-break-inside: avoid; }
        </style>
      </head>
      <body>${g}</body>
      </html>
    `),d.document.close(),setTimeout(()=>{d.print(),d.close()},500)};return t.jsxs("div",{className:"space-y-3",children:[t.jsxs("div",{className:"border border-border rounded-lg p-3 bg-white overflow-hidden",style:{maxWidth:"340px"},children:[t.jsxs("div",{className:"flex justify-between items-start gap-2",children:[t.jsx("p",{className:"text-xs font-bold text-black uppercase leading-tight flex-1",children:e.name}),e.restaurantName&&t.jsx("p",{className:"text-[7px] text-gray-500 text-right max-w-[30%]",children:e.restaurantName})]}),e.ingredients&&t.jsx("p",{className:"text-[8px] text-black mt-1 leading-tight",dangerouslySetInnerHTML:{__html:`<span class="font-bold uppercase text-[7px]">Ingredienti:</span> ${i}`}}),e.allergens&&e.allergens.length>0&&t.jsxs("p",{className:"text-[8px] font-bold text-red-600 mt-0.5",children:["ALLERGENI: ",e.allergens.join(", ")]}),t.jsxs("div",{className:"flex gap-3 mt-1 text-[8px] text-black",children:[t.jsxs("span",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Prod:"})," ",N(e.productionDate)]}),t.jsxs("span",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Scad:"})," ",N(e.expiryDate)]})]}),t.jsxs("div",{className:"flex justify-between items-end mt-1",children:[t.jsxs("div",{className:"text-[8px] text-black space-y-0.5",children:[t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Conservazione:"})," ",U[e.storageType||""]||""]}),e.netWeightG&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Peso netto:"})," ",e.netWeightG>=1e3?`${(e.netWeightG/1e3).toLocaleString("it-IT")} kg`:`${e.netWeightG} g`]}),e.chefLifeHours&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Chef life:"})," ",e.chefLifeHours,"h"]}),e.lotNumber&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Lotto:"})," ",e.lotNumber]}),c&&t.jsxs("p",{children:[t.jsx("span",{className:"font-bold text-[7px] uppercase",children:"Doc. provenienza:"})," ",c]})]}),o&&t.jsx("img",{src:o,alt:"QR",className:"w-14 h-14 shrink-0"})]})]}),s&&t.jsxs("div",{className:"flex gap-2",children:[t.jsxs(v,{size:"sm",variant:"outline",onClick:h,className:"gap-1.5",children:[t.jsx(y,{className:"h-3.5 w-3.5"}),"Stampa etichetta"]}),t.jsxs(Re,{children:[t.jsx(Ae,{asChild:!0,children:t.jsxs(v,{size:"sm",variant:"outline",className:"gap-1.5",children:[t.jsx(pe,{className:"h-3.5 w-3.5"}),"Griglia A4"]})}),t.jsxs(W,{className:"w-56 p-3",align:"start",children:[t.jsx("p",{className:"text-xs font-medium mb-2",children:"Copie per foglio A4 (max 21)"}),t.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[t.jsx(v,{size:"icon",variant:"outline",className:"h-7 w-7",onClick:()=>u(d=>Math.max(1,d-1)),disabled:p<=1,children:t.jsx(le,{className:"h-3 w-3"})}),t.jsx("span",{className:"text-sm font-semibold w-8 text-center",children:p}),t.jsx(v,{size:"icon",variant:"outline",className:"h-7 w-7",onClick:()=>u(d=>Math.min(21,d+1)),disabled:p>=21,children:t.jsx(ce,{className:"h-3 w-3"})})]}),t.jsxs(v,{size:"sm",className:"w-full gap-1.5",onClick:f,children:[t.jsx(y,{className:"h-3.5 w-3.5"}),"Stampa ",p," etichette"]})]})]})]})]})};export{Te as R};
