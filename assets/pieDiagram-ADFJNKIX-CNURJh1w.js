import{a1 as S,a4 as z,aB as j,g as q,s as H,a as Z,b as J,q as K,p as Q,_ as u,l as F,c as X,D as Y,H as tt,N as et,e as at,y as rt,E as nt}from"./mermaid.core-CEWd5eM9.js";import{p as it}from"./chunk-4BX2VUAB-dVex1_HS.js";import{p as st}from"./treemap-KMMF4GRG-DwDFPBhr.js";import{d as I}from"./arc-CH5nk8g2.js";import{o as ot}from"./ordinal-Cboi1Yqb.js";import"./three-B8BJtqwY.js";import"./ui-yh-qgxH4.js";import"./WorkshopPage-C-c1G7WG.js";import"./vendor-BkNSrfR2.js";import"./markdown-B5SzRL8a.js";import"./Header-DU7ovN2S.js";import"./button-BNQytKCK.js";import"./index-CRR85PwD.js";import"./badge-BW-3bR_O.js";import"./cpu-B1f4RFW3.js";import"./clock-CTVwmHbn.js";import"./og-meta-DYOSMNZX.js";import"./min-D-YR7n_0.js";import"./_baseUniq-D83tEbti.js";import"./init-Gi6I4Gst.js";function lt(t,a){return a<t?-1:a>t?1:a>=t?0:NaN}function ct(t){return t}function pt(){var t=ct,a=lt,f=null,y=S(0),s=S(z),l=S(0);function o(e){var n,c=(e=j(e)).length,g,x,h=0,p=new Array(c),i=new Array(c),v=+y.apply(this,arguments),w=Math.min(z,Math.max(-z,s.apply(this,arguments)-v)),m,C=Math.min(Math.abs(w)/c,l.apply(this,arguments)),$=C*(w<0?-1:1),d;for(n=0;n<c;++n)(d=i[p[n]=n]=+t(e[n],n,e))>0&&(h+=d);for(a!=null?p.sort(function(A,D){return a(i[A],i[D])}):f!=null&&p.sort(function(A,D){return f(e[A],e[D])}),n=0,x=h?(w-c*$)/h:0;n<c;++n,v=m)g=p[n],d=i[g],m=v+(d>0?d*x:0)+$,i[g]={data:e[g],index:n,value:d,startAngle:v,endAngle:m,padAngle:C};return i}return o.value=function(e){return arguments.length?(t=typeof e=="function"?e:S(+e),o):t},o.sortValues=function(e){return arguments.length?(a=e,f=null,o):a},o.sort=function(e){return arguments.length?(f=e,a=null,o):f},o.startAngle=function(e){return arguments.length?(y=typeof e=="function"?e:S(+e),o):y},o.endAngle=function(e){return arguments.length?(s=typeof e=="function"?e:S(+e),o):s},o.padAngle=function(e){return arguments.length?(l=typeof e=="function"?e:S(+e),o):l},o}var ut=nt.pie,N={sections:new Map,showData:!1},T=N.sections,G=N.showData,gt=structuredClone(ut),dt=u(()=>structuredClone(gt),"getConfig"),ft=u(()=>{T=new Map,G=N.showData,rt()},"clear"),mt=u(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(t)||(T.set(t,a),F.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),ht=u(()=>T,"getSections"),vt=u(t=>{G=t},"setShowData"),St=u(()=>G,"getShowData"),L={getConfig:dt,clear:ft,setDiagramTitle:Q,getDiagramTitle:K,setAccTitle:J,getAccTitle:Z,setAccDescription:H,getAccDescription:q,addSection:mt,getSections:ht,setShowData:vt,getShowData:St},yt=u((t,a)=>{it(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),xt={parse:u(async t=>{const a=await st("pie",t);F.debug(a),yt(a,L)},"parse")},wt=u(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),At=wt,Dt=u(t=>{const a=[...t.values()].reduce((s,l)=>s+l,0),f=[...t.entries()].map(([s,l])=>({label:s,value:l})).filter(s=>s.value/a*100>=1).sort((s,l)=>l.value-s.value);return pt().value(s=>s.value)(f)},"createPieArcs"),Ct=u((t,a,f,y)=>{F.debug(`rendering pie chart
`+t);const s=y.db,l=X(),o=Y(s.getConfig(),l.pie),e=40,n=18,c=4,g=450,x=g,h=tt(a),p=h.append("g");p.attr("transform","translate("+x/2+","+g/2+")");const{themeVariables:i}=l;let[v]=et(i.pieOuterStrokeWidth);v??(v=2);const w=o.textPosition,m=Math.min(x,g)/2-e,C=I().innerRadius(0).outerRadius(m),$=I().innerRadius(m*w).outerRadius(m*w);p.append("circle").attr("cx",0).attr("cy",0).attr("r",m+v/2).attr("class","pieOuterCircle");const d=s.getSections(),A=Dt(d),D=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let E=0;d.forEach(r=>{E+=r});const W=A.filter(r=>(r.data.value/E*100).toFixed(0)!=="0"),b=ot(D);p.selectAll("mySlices").data(W).enter().append("path").attr("d",C).attr("fill",r=>b(r.data.label)).attr("class","pieCircle"),p.selectAll("mySlices").data(W).enter().append("text").text(r=>(r.data.value/E*100).toFixed(0)+"%").attr("transform",r=>"translate("+$.centroid(r)+")").style("text-anchor","middle").attr("class","slice"),p.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText");const O=[...d.entries()].map(([r,M])=>({label:r,value:M})),k=p.selectAll(".legend").data(O).enter().append("g").attr("class","legend").attr("transform",(r,M)=>{const R=n+c,B=R*O.length/2,V=12*n,U=M*R-B;return"translate("+V+","+U+")"});k.append("rect").attr("width",n).attr("height",n).style("fill",r=>b(r.label)).style("stroke",r=>b(r.label)),k.append("text").attr("x",n+c).attr("y",n-c).text(r=>s.getShowData()?`${r.label} [${r.value}]`:r.label);const _=Math.max(...k.selectAll("text").nodes().map(r=>(r==null?void 0:r.getBoundingClientRect().width)??0)),P=x+e+n+c+_;h.attr("viewBox",`0 0 ${P} ${g}`),at(h,g,P,o.useMaxWidth)},"draw"),$t={draw:Ct},qt={parser:xt,db:L,renderer:$t,styles:At};export{qt as diagram};
