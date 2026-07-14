/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_POD_API_URL?: string;
  readonly VITE_SEARCH_API_URL?: string;
  readonly VITE_RELAY_URL?: string;
  readonly VITE_EMBEDDING_API_URL?: string;
  readonly VITE_IMAGE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_NDK_DEBUG?: string;
  readonly VITE_ADMIN_PUBKEY?: string;
  readonly VITE_JARVIS_PUBKEY?: string;
  readonly VITE_IMAGE_BUCKET?: string;
  readonly VITE_IMAGE_ENCRYPTION_ENABLED?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
