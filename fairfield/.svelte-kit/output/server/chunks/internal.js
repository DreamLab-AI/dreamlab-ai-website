import{c as g,s as y,v as m,m as d}from"./ssr.js";import{a as b}from"./ssr2.js";import"./environment.js";import"./server.js";let k={};function F(n){}function I(n){k=n}let w=null;function N(n){w=n}function O(n){}const x=g((n,t,e,p)=>{let{stores:r}=t,{page:s}=t,{constructors:o}=t,{components:a=[]}=t,{form:c}=t,{data_0:f=null}=t,{data_1:h=null}=t,{data_2:v=null}=t;y("__svelte__",r),b(r.page.notify),t.stores===void 0&&e.stores&&r!==void 0&&e.stores(r),t.page===void 0&&e.page&&s!==void 0&&e.page(s),t.constructors===void 0&&e.constructors&&o!==void 0&&e.constructors(o),t.components===void 0&&e.components&&a!==void 0&&e.components(a),t.form===void 0&&e.form&&c!==void 0&&e.form(c),t.data_0===void 0&&e.data_0&&f!==void 0&&e.data_0(f),t.data_1===void 0&&e.data_1&&h!==void 0&&e.data_1(h),t.data_2===void 0&&e.data_2&&v!==void 0&&e.data_2(v);let l,_,u=n.head;do l=!0,n.head=u,r.page.set(s),_=`  ${o[1]?`${m(o[0]||d,"svelte:component").$$render(n,{data:f,params:s.params,this:a[0]},{this:i=>{a[0]=i,l=!1}},{default:()=>`${o[2]?`${m(o[1]||d,"svelte:component").$$render(n,{data:h,params:s.params,this:a[1]},{this:i=>{a[1]=i,l=!1}},{default:()=>`${m(o[2]||d,"svelte:component").$$render(n,{data:v,form:c,params:s.params,this:a[2]},{this:i=>{a[2]=i,l=!1}},{})}`})}`:`${m(o[1]||d,"svelte:component").$$render(n,{data:h,form:c,params:s.params,this:a[1]},{this:i=>{a[1]=i,l=!1}},{})}`}`})}`:`${m(o[0]||d,"svelte:component").$$render(n,{data:f,form:c,params:s.params,this:a[0]},{this:i=>{a[0]=i,l=!1}},{})}`} `;while(!l);return _}),j={app_template_contains_nonce:!1,async:!1,csp:{mode:"auto",directives:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1},reportOnly:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1}},csrf_check_origin:!0,csrf_trusted_origins:[],embedded:!1,env_public_prefix:"PUBLIC_",env_private_prefix:"",hash_routing:!1,hooks:null,preload_strategy:"modulepreload",root:x,service_worker:!0,service_worker_options:void 0,templates:{app:({head:n,body:t,assets:e,nonce:p,env:r})=>`<!doctype html>
<html lang="en" data-theme="dark">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		<meta name="description" content="Secure Nostr messaging application" />
		<meta name="theme-color" content="#16213e" />
		<meta name="mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		<meta name="apple-mobile-web-app-title" content="Nostr BBS" />

		<link rel="icon" href="`+e+`/favicon.png" />
		<link rel="apple-touch-icon" href="`+e+`/icon-192.png" />
		<link rel="manifest" href="`+e+`/manifest.json" />

		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />

		`+n+`
	</head>
	<body data-sveltekit-preload-data="hover" class="bg-base-100 text-base-content">
		<div style="display: contents">`+t+`</div>
	</body>
</html>
`,error:({status:n,message:t})=>`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>`+t+`</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">`+n+`</span>
			<div class="message">
				<h1>`+t+`</h1>
			</div>
		</div>
	</body>
</html>
`},version_hash:"11eu9fc"};async function q(){let n,t,e,p,r;return{handle:n,handleFetch:t,handleError:e,handleValidationError:p,init:r}=await import("./hooks.server.js"),{handle:n,handleFetch:t,handleError:e,handleValidationError:p,init:r,reroute:void 0,transport:void 0}}export{I as a,N as b,O as c,q as g,j as o,k as p,w as r,F as s};
