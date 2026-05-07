import{Z as l,_ as x}from"./CwRy9Tox.js";function $(o){const t=o-1;return t*t*t+1}function S(o,{delay:t=0,duration:n=400,easing:c=x}={}){const a=+getComputedStyle(o).opacity;return{delay:t,duration:n,easing:c,css:r=>`opacity: ${r*a}`}}function U(o,{delay:t=0,duration:n=400,easing:c=$,x:a=0,y:r=0,opacity:e=0}={}){const s=getComputedStyle(o),i=+s.opacity,y=s.transform==="none"?"":s.transform,u=i*(1-e),[p,f]=l(a),[d,_]=l(r);return{delay:t,duration:n,easing:c,css:(m,g)=>`
			transform: ${y} translate(${(1-m)*p}${f}, ${(1-m)*d}${_});
			opacity: ${i-u*g}`}}function V(o,{delay:t=0,duration:n=400,easing:c=$,start:a=0,opacity:r=0}={}){const e=getComputedStyle(o),s=+e.opacity,i=e.transform==="none"?"":e.transform,y=1-a,u=s*(1-r);return{delay:t,duration:n,easing:c,css:(p,f)=>`
			transform: ${i} scale(${1-y*f});
			opacity: ${s-u*f}
		`}}export{S as a,$ as c,U as f,V as s};
