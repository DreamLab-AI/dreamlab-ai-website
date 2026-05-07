export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".nojekyll",".well-known/security.txt","_headers","favicon.ico","favicon.png","icon-128.png","icon-144.png","icon-152.png","icon-192.png","icon-384.png","icon-512.png","icon-72.png","icon-96.png","images/screenshots/01-landing.png","images/screenshots/02-signup-gateway.png","images/screenshots/03-simple-signup.png","images/screenshots/04-nickname-filled.png","images/screenshots/05-password-shown.png","images/screenshots/06-chat-hub.png","images/screenshots/07-forums.png","images/screenshots/08-events.png","images/screenshots/09-dm.png","images/screenshots/10-login.png","images/screenshots/11-chat-mobile.png","images/screenshots/12-signup-mobile.png","images/screenshots/CHECKLIST.md","images/screenshots/chat-hub-desktop.png","images/screenshots/chat-hub-mobile.png","images/screenshots/chat-hub-tablet.png","images/screenshots/dm-list-desktop.png","images/screenshots/dm-list-mobile.png","images/screenshots/dm-list-tablet.png","images/screenshots/events-page-desktop.png","images/screenshots/events-page-mobile.png","images/screenshots/events-page-tablet.png","images/screenshots/forums-overview-desktop.png","images/screenshots/forums-overview-mobile.png","images/screenshots/forums-overview-tablet.png","images/screenshots/landing-page-desktop.png","images/screenshots/landing-page-mobile.png","images/screenshots/landing-page-tablet.png","images/screenshots/login-simple-desktop.png","images/screenshots/login-simple-mobile.png","images/screenshots/login-simple-tablet.png","images/screenshots/manifest.json","images/screenshots/section-welcome-desktop.png","images/screenshots/section-welcome-mobile.png","images/screenshots/section-welcome-tablet.png","images/screenshots/signup-gateway-desktop.png","images/screenshots/signup-gateway-mobile.png","images/screenshots/signup-gateway-tablet.png","images/screenshots/zone-minimoonoir-desktop.png","images/screenshots/zone-minimoonoir-mobile.png","images/screenshots/zone-minimoonoir-tablet.png","images/zones/.claude-flow/metrics/agent-metrics.json","images/zones/.claude-flow/metrics/performance.json","images/zones/.claude-flow/metrics/task-metrics.json","images/zones/dreamlab-hero.webp","images/zones/dreamlab-logo.webp","images/zones/family-hero.webp","images/zones/family-logo.webp","images/zones/minimoonoir-hero.webp","images/zones/minimoonoir-logo.webp","manifest.json","service-worker.js"]),
	mimeTypes: {".txt":"text/plain",".png":"image/png",".md":"text/markdown",".json":"application/json",".webp":"image/webp"},
	_: {
		client: {start:"_app/immutable/entry/start.BGNn3Pvg.js",app:"_app/immutable/entry/app.DuMmKpM6.js",imports:["_app/immutable/entry/start.BGNn3Pvg.js","_app/immutable/chunks/BZgxvzt3.js","_app/immutable/chunks/D-ho1sXg.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/CEc-lP5l.js","_app/immutable/entry/app.DuMmKpM6.js","_app/immutable/chunks/CmsKOCeN.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/D-vqeeah.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js')),
			__memo(() => import('./nodes/20.js')),
			__memo(() => import('./nodes/21.js')),
			__memo(() => import('./nodes/22.js')),
			__memo(() => import('./nodes/23.js')),
			__memo(() => import('./nodes/24.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/admin/calendar",
				pattern: /^\/admin\/calendar\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/admin/stats",
				pattern: /^\/admin\/stats\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/api/proxy",
				pattern: /^\/api\/proxy\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/proxy/_server.ts.js'))
			},
			{
				id: "/chat",
				pattern: /^\/chat\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/chat/[channelId]",
				pattern: /^\/chat\/([^/]+?)\/?$/,
				params: [{"name":"channelId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/dm",
				pattern: /^\/dm\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/dm/[pubkey]",
				pattern: /^\/dm\/([^/]+?)\/?$/,
				params: [{"name":"pubkey","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/events",
				pattern: /^\/events\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/forums",
				pattern: /^\/forums\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/pending",
				pattern: /^\/pending\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/settings/muted",
				pattern: /^\/settings\/muted\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/setup",
				pattern: /^\/setup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/signup",
				pattern: /^\/signup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/view/[noteId]",
				pattern: /^\/view\/([^/]+?)\/?$/,
				params: [{"name":"noteId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/[category]",
				pattern: /^\/([^/]+?)\/?$/,
				params: [{"name":"category","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/[section]/calendar",
				pattern: /^\/([^/]+?)\/calendar\/?$/,
				params: [{"name":"section","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/[category]/[section]",
				pattern: /^\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"category","optional":false,"rest":false,"chained":false},{"name":"section","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/[category]/[section]/calendar",
				pattern: /^\/([^/]+?)\/([^/]+?)\/calendar\/?$/,
				params: [{"name":"category","optional":false,"rest":false,"chained":false},{"name":"section","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/[category]/[section]/[forumId]",
				pattern: /^\/([^/]+?)\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"category","optional":false,"rest":false,"chained":false},{"name":"section","optional":false,"rest":false,"chained":false},{"name":"forumId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
