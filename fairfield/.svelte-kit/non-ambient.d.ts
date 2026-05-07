
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/admin/calendar" | "/admin/stats" | "/api" | "/api/proxy" | "/chat" | "/chat/[channelId]" | "/dm" | "/dm/[pubkey]" | "/events" | "/forums" | "/login" | "/pending" | "/settings" | "/settings/muted" | "/setup" | "/signup" | "/view" | "/view/[noteId]" | "/[section]" | "/[category]" | "/[section]/calendar" | "/[category]/[section]" | "/[category]/[section]/calendar" | "/[category]/[section]/[forumId]";
		RouteParams(): {
			"/chat/[channelId]": { channelId: string };
			"/dm/[pubkey]": { pubkey: string };
			"/view/[noteId]": { noteId: string };
			"/[section]": { section: string };
			"/[category]": { category: string };
			"/[section]/calendar": { section: string };
			"/[category]/[section]": { category: string; section: string };
			"/[category]/[section]/calendar": { category: string; section: string };
			"/[category]/[section]/[forumId]": { category: string; section: string; forumId: string }
		};
		LayoutParams(): {
			"/": { channelId?: string; pubkey?: string; noteId?: string; section?: string; category?: string; forumId?: string };
			"/admin": Record<string, never>;
			"/admin/calendar": Record<string, never>;
			"/admin/stats": Record<string, never>;
			"/api": Record<string, never>;
			"/api/proxy": Record<string, never>;
			"/chat": { channelId?: string };
			"/chat/[channelId]": { channelId: string };
			"/dm": { pubkey?: string };
			"/dm/[pubkey]": { pubkey: string };
			"/events": Record<string, never>;
			"/forums": Record<string, never>;
			"/login": Record<string, never>;
			"/pending": Record<string, never>;
			"/settings": Record<string, never>;
			"/settings/muted": Record<string, never>;
			"/setup": Record<string, never>;
			"/signup": Record<string, never>;
			"/view": { noteId?: string };
			"/view/[noteId]": { noteId: string };
			"/[section]": { section: string };
			"/[category]": { category: string; section?: string; forumId?: string };
			"/[section]/calendar": { section: string };
			"/[category]/[section]": { category: string; section: string; forumId?: string };
			"/[category]/[section]/calendar": { category: string; section: string };
			"/[category]/[section]/[forumId]": { category: string; section: string; forumId: string }
		};
		Pathname(): "/" | "/admin" | "/admin/" | "/admin/calendar" | "/admin/calendar/" | "/admin/stats" | "/admin/stats/" | "/api" | "/api/" | "/api/proxy" | "/api/proxy/" | "/chat" | "/chat/" | `/chat/${string}` & {} | `/chat/${string}/` & {} | "/dm" | "/dm/" | `/dm/${string}` & {} | `/dm/${string}/` & {} | "/events" | "/events/" | "/forums" | "/forums/" | "/login" | "/login/" | "/pending" | "/pending/" | "/settings" | "/settings/" | "/settings/muted" | "/settings/muted/" | "/setup" | "/setup/" | "/signup" | "/signup/" | "/view" | "/view/" | `/view/${string}` & {} | `/view/${string}/` & {} | `/${string}` & {} | `/${string}/` & {} | `/${string}/calendar` & {} | `/${string}/calendar/` & {} | `/${string}/${string}` & {} | `/${string}/${string}/` & {} | `/${string}/${string}/calendar` & {} | `/${string}/${string}/calendar/` & {} | `/${string}/${string}/${string}` & {} | `/${string}/${string}/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.nojekyll" | "/.well-known/security.txt" | "/_headers" | "/favicon.ico" | "/favicon.png" | "/icon-128.png" | "/icon-144.png" | "/icon-152.png" | "/icon-192.png" | "/icon-384.png" | "/icon-512.png" | "/icon-72.png" | "/icon-96.png" | "/images/screenshots/01-landing.png" | "/images/screenshots/02-signup-gateway.png" | "/images/screenshots/03-simple-signup.png" | "/images/screenshots/04-nickname-filled.png" | "/images/screenshots/05-password-shown.png" | "/images/screenshots/06-chat-hub.png" | "/images/screenshots/07-forums.png" | "/images/screenshots/08-events.png" | "/images/screenshots/09-dm.png" | "/images/screenshots/10-login.png" | "/images/screenshots/11-chat-mobile.png" | "/images/screenshots/12-signup-mobile.png" | "/images/screenshots/CHECKLIST.md" | "/images/screenshots/chat-hub-desktop.png" | "/images/screenshots/chat-hub-mobile.png" | "/images/screenshots/chat-hub-tablet.png" | "/images/screenshots/dm-list-desktop.png" | "/images/screenshots/dm-list-mobile.png" | "/images/screenshots/dm-list-tablet.png" | "/images/screenshots/events-page-desktop.png" | "/images/screenshots/events-page-mobile.png" | "/images/screenshots/events-page-tablet.png" | "/images/screenshots/forums-overview-desktop.png" | "/images/screenshots/forums-overview-mobile.png" | "/images/screenshots/forums-overview-tablet.png" | "/images/screenshots/landing-page-desktop.png" | "/images/screenshots/landing-page-mobile.png" | "/images/screenshots/landing-page-tablet.png" | "/images/screenshots/login-simple-desktop.png" | "/images/screenshots/login-simple-mobile.png" | "/images/screenshots/login-simple-tablet.png" | "/images/screenshots/manifest.json" | "/images/screenshots/section-welcome-desktop.png" | "/images/screenshots/section-welcome-mobile.png" | "/images/screenshots/section-welcome-tablet.png" | "/images/screenshots/signup-gateway-desktop.png" | "/images/screenshots/signup-gateway-mobile.png" | "/images/screenshots/signup-gateway-tablet.png" | "/images/screenshots/zone-minimoonoir-desktop.png" | "/images/screenshots/zone-minimoonoir-mobile.png" | "/images/screenshots/zone-minimoonoir-tablet.png" | "/images/zones/.claude-flow/metrics/agent-metrics.json" | "/images/zones/.claude-flow/metrics/performance.json" | "/images/zones/.claude-flow/metrics/task-metrics.json" | "/images/zones/dreamlab-hero.webp" | "/images/zones/dreamlab-logo.webp" | "/images/zones/family-hero.webp" | "/images/zones/family-logo.webp" | "/images/zones/minimoonoir-hero.webp" | "/images/zones/minimoonoir-logo.webp" | "/manifest.json" | string & {};
	}
}