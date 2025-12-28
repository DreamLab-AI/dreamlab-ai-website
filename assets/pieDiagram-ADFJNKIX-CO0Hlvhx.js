import{a4 as S,a7 as F,aB as j,_ as u,g as q,s as H,a as Z,b as J,q as K,p as Q,l as z,c as X,D as Y,H as tt,N as et,e as at,y as rt,F as nt}from"./WorkshopPage-BtX_EenU.js";import{p as it}from"./chunk-4BX2VUAB-Ci4xwbsK.js";import{p as st}from"./treemap-KMMF4GRG-5dldooQP.js";import{d as I}from"./arc-DPSL7QMJ.js";import{o as ot}from"./ordinal-Cboi1Yqb.js";import"./three-ke42F0_o.js";import"./vendor-DLXM1qRr.js";import"./markdown-B5SzRL8a.js";import"./Header-e8avVfPu.js";import"./button-Oxph8pSR.js";import"./ui-UVhBxcbM.js";import"./index-mZPe6Nmp.js";import"./badge-C6uDHSQR.js";import"./cpu-CfSBx9P7.js";import"./clock-DA3UkpT5.js";import"./og-meta-DYOSMNZX.js";import"./min-ReJPcuzA.js";import"./_baseUniq-C2OjvXVi.js";import"./init-Gi6I4Gst.js";function lt(t,a){return a<t?-1:a>t?1:a>=t?0:NaN}function ct(t){return t}function pt(){var t=ct,a=lt,f=null,y=S(0),s=S(F),l=S(0);function o(e){var n,c=(e=j(e)).length,g,x,h=0,p=new Array(c),i=new Array(c),v=+y.apply(this,arguments),w=Math.min(F,Math.max(-F,s.apply(this,arguments)-v)),m,C=Math.min(Math.abs(w)/c,l.apply(this,arguments)),$=C*(w<0?-1:1),d;for(n=0;n<c;++n)(d=i[p[n]=n]=+t(e[n],n,e))>0&&(h+=d);for(a!=null?p.sort(function(A,D){return a(i[A],i[D])}):f!=null&&p.sort(function(A,D){return f(e[A],e[D])}),n=0,x=h?(w-c*$)/h:0;n<c;++n,v=m)g=p[n],d=i[g],m=v+(d>0?d*x:0)+$,i[g]={data:e[g],index:n,value:d,startAngle:v,endAngle:m,padAngle:C};return i}return o.value=function(e){return arguments.length?(t=typeof e=="function"?e:S(+e),o):t},o.sortValues=function(e){return arguments.length?(a=e,f=null,o):a},o.sort=function(e){return arguments.length?(f=e,a=null,o):f},o.startAngle=function(e){return arguments.length?(y=typeof e=="function"?e:S(+e),o):y},o.endAngle=function(e){return arguments.length?(s=typeof e=="function"?e:S(+e),o):s},o.padAngle=function(e){return arguments.length?(l=typeof e=="function"?e:S(+e),o):l},o}var ut=nt.pie,N={sections:new Map,showData:!1},T=N.sections,G=N.showData,gt=structuredClone(ut),dt=u(()=>structuredClone(gt),"getConfig"),ft=u(()=>{T=new Map,G=N.showData,rt()},"clear"),mt=u(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(t)||(T.set(t,a),z.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),ht=u(()=>T,"getSections"),vt=u(t=>{G=t},"setShowData"),St=u(()=>G,"getShowData"),L={getConfig:dt,clear:ft,setDiagramTitle:Q,getDiagramTitle:K,setAccTitle:J,getAccTitle:Z,setAccDescription:H,getAccDescription:q,addSection:mt,getSections:ht,setShowData:vt,getShowData:St},yt=u((t,a)=>{it(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),xt={parse:u(async t=>{const a=await st("pie",t);z.debug(a),yt(a,L)},"parse")},wt=u(t=>`
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
`,"getStyles"),At=wt,Dt=u(t=>{const a=[...t.values()].reduce((s,l)=>s+l,0),f=[...t.entries()].map(([s,l])=>({label:s,value:l})).filter(s=>s.value/a*100>=1).sort((s,l)=>l.value-s.value);return pt().value(s=>s.value)(f)},"createPieArcs"),Ct=u((t,a,f,y)=>{z.debug(`rendering pie chart
`+t);const s=y.db,l=X(),o=Y(s.getConfig(),l.pie),e=40,n=18,c=4,g=450,x=g,h=tt(a),p=h.append("g");p.attr("transform","translate("+x/2+","+g/2+")");const{themeVariables:i}=l;let[v]=et(i.pieOuterStrokeWidth);v??(v=2);const w=o.textPosition,m=Math.min(x,g)/2-e,C=I().innerRadius(0).outerRadius(m),$=I().innerRadius(m*w).outerRadius(m*w);p.append("circle").attr("cx",0).attr("cy",0).attr("r",m+v/2).attr("class","pieOuterCircle");const d=s.getSections(),A=Dt(d),D=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let b=0;d.forEach(r=>{b+=r});const W=A.filter(r=>(r.data.value/b*100).toFixed(0)!=="0"),E=ot(D);p.selectAll("mySlices").data(W).enter().append("path").attr("d",C).attr("fill",r=>E(r.data.label)).attr("class","pieCircle"),p.selectAll("mySlices").data(W).enter().append("text").text(r=>(r.data.value/b*100).toFixed(0)+"%").attr("transform",r=>"translate("+$.centroid(r)+")").style("text-anchor","middle").attr("class","slice"),p.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText");const O=[...d.entries()].map(([r,M])=>({label:r,value:M})),k=p.selectAll(".legend").data(O).enter().append("g").attr("class","legend").attr("transform",(r,M)=>{const R=n+c,B=R*O.length/2,V=12*n,U=M*R-B;return"translate("+V+","+U+")"});k.append("rect").attr("width",n).attr("height",n).style("fill",r=>E(r.label)).style("stroke",r=>E(r.label)),k.append("text").attr("x",n+c).attr("y",n-c).text(r=>s.getShowData()?`${r.label} [${r.value}]`:r.label);const _=Math.max(...k.selectAll("text").nodes().map(r=>(r==null?void 0:r.getBoundingClientRect().width)??0)),P=x+e+n+c+_;h.attr("viewBox",`0 0 ${P} ${g}`),at(h,g,P,o.useMaxWidth)},"draw"),$t={draw:Ct},jt={parser:xt,db:L,renderer:$t,styles:At};export{jt as diagram};
