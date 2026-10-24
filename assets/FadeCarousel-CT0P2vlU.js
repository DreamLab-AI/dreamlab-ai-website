import{c as h}from"./index-BUrskpse.js";import{r as i,j as a}from"./ui-BdDKx2Gz.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M4.5 3h15",key:"c7n0jr"}],["path",{d:"M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3",key:"m1uhx7"}],["path",{d:"M6 14h12",key:"4cwo0f"}]],d=h("beaker",p),y=({images:o,index:t,alt:r})=>{const[e,u]=i.useState(()=>new Set([0,1])),s=(t+1)%o.length;return(!e.has(t)||!e.has(s))&&u(new Set([...e,t,s])),a.jsx(a.Fragment,{children:o.map((n,c)=>e.has(c)?a.jsx("img",{src:n,alt:r,decoding:"async",className:`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${c===t?"opacity-100":"opacity-0"}`},n):null)})};export{d as B,y as F};
