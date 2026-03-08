/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Nostr relay WebSocket URL (CF Workers + D1 + DO) */
  readonly VITE_RELAY_URL?: string;
  /** Admin public key (hex, 64 chars) */
  readonly VITE_ADMIN_PUBKEY?: string;
  /** Enable NDK debug logging */
  readonly VITE_NDK_DEBUG?: string;
  /** Auth API Worker URL */
  readonly VITE_AUTH_API_URL?: string;
  /** Pod API Worker URL (R2 storage, images, media) */
  readonly VITE_POD_API_URL?: string;
  /** Search API Worker URL (RuVector WASM, embeddings) */
  readonly VITE_SEARCH_API_URL?: string;
  /** Link Preview API Worker URL */
  readonly VITE_LINK_PREVIEW_API_URL?: string;
  /** Public relay for VisionFlow agent DMs */
  readonly VITE_AGENT_RELAY_URL?: string;
  /** Enable client-side encryption for private channel/DM images */
  readonly VITE_IMAGE_ENCRYPTION_ENABLED?: string;
  /** Enable Rust WASM crypto (nostr-core-wasm) instead of JS fallback */
  readonly VITE_USE_WASM_CRYPTO?: string;
  readonly PUBLIC_DEFAULT_RELAYS?: string;
  readonly PUBLIC_AI_ENABLED?: string;
  readonly PUBLIC_APP_NAME?: string;
  readonly PUBLIC_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
