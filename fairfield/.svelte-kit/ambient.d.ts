
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const GOOGLE_CLOUD_PROJECT: string;
	export const VITE_RELAY_URL: string;
	export const VITE_EMBEDDING_API_URL: string;
	export const VITE_IMAGE_API_URL: string;
	export const VITE_APP_NAME: string;
	export const VITE_APP_VERSION: string;
	export const VITE_NDK_DEBUG: string;
	export const VITE_ADMIN_PUBKEY: string;
	export const VITE_IMAGE_BUCKET: string;
	export const VITE_IMAGE_ENCRYPTION_ENABLED: string;
	export const SHELL: string;
	export const npm_command: string;
	export const LSCOLORS: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const NVIDIA_VISIBLE_DEVICES: string;
	export const npm_config_userconfig: string;
	export const SUPERVISOR_GROUP_NAME: string;
	export const BLENDER_WS_HOST: string;
	export const COLORTERM: string;
	export const CSF_MDTVTexturesDirectory: string;
	export const LIBGL_ALWAYS_INDIRECT: string;
	export const npm_config_cache: string;
	export const MANAGEMENT_API_PORT: string;
	export const TERM_PROGRAM_VERSION: string;
	export const CSF_DrawPluginDefaults: string;
	export const TMUX: string;
	export const LOG_LEVEL: string;
	export const SUPERVISOR_SERVER_URL: string;
	export const HOSTNAME: string;
	export const NODE: string;
	export const CSF_LANGUAGE: string;
	export const SSH_AUTH_SOCK: string;
	export const CSF_MIGRATION_TYPES: string;
	export const ANTHROPIC_API_KEY: string;
	export const COLOR: string;
	export const OPENAI_API_KEY: string;
	export const npm_config_local_prefix: string;
	export const SSH_AGENT_PID: string;
	export const CSF_OCCTResourcePath: string;
	export const npm_config_globalconfig: string;
	export const CSF_STEPDefaults: string;
	export const EDITOR: string;
	export const ENABLE_DESKTOP: string;
	export const PWD: string;
	export const LOGNAME: string;
	export const DRAWHOME: string;
	export const NVIDIA_DRIVER_CAPABILITIES: string;
	export const npm_config_init_module: string;
	export const PERPLEXITY_API_KEY: string;
	export const VIPSHOME: string;
	export const MCP_TCP_HOST: string;
	export const NODE_ENV: string;
	export const _: string;
	export const CSF_StandardLiteDefaults: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const ENABLE_MCP_BRIDGE: string;
	export const MANAGEMENT_API_HOST: string;
	export const CLAUDECODE: string;
	export const ZAI_API_KEY: string;
	export const HOME: string;
	export const LANG: string;
	export const ZAI_ANTHROPIC_API_KEY: string;
	export const GITHUB_TOKEN: string;
	export const LS_COLORS: string;
	export const NVCC_PREPEND_FLAGS: string;
	export const npm_package_version: string;
	export const CLAUDE_MAX_QUEUE_SIZE: string;
	export const CUDA_VERSION: string;
	export const OPENAI_CODEX_SOCKET: string;
	export const ENABLE_SSH: string;
	export const BRAVE_API_KEY: string;
	export const GOOGLE_GEMINI_API_KEY: string;
	export const GPU_ACCELERATION: string;
	export const ENABLE_MANAGEMENT_API: string;
	export const INIT_CWD: string;
	export const CSF_ShadersDirectory: string;
	export const CSF_EXCEPTION_PROMPT: string;
	export const CSF_XmlOcafResource: string;
	export const WORKSPACE: string;
	export const npm_lifecycle_script: string;
	export const BLENDER_WS_URL: string;
	export const CONTEXT7_API_KEY: string;
	export const CUDA_VISIBLE_DEVICES: string;
	export const DEVPOD_WORKSPACE_FOLDER: string;
	export const CSF_SHMessage: string;
	export const npm_config_npm_version: string;
	export const PYTHONPATH: string;
	export const TERM: string;
	export const npm_package_name: string;
	export const ZSH: string;
	export const npm_config_prefix: string;
	export const USER: string;
	export const TMUX_PANE: string;
	export const CUDA_PATH: string;
	export const CSF_StandardDefaults: string;
	export const CSF_IGESDefaults: string;
	export const DISPLAY: string;
	export const CSF_XCAFDefaults: string;
	export const npm_lifecycle_event: string;
	export const ZAI_API_URL: string;
	export const SHLVL: string;
	export const GIT_EDITOR: string;
	export const PAGER: string;
	export const CSF_PluginDefaults: string;
	export const CSF_TObjMessage: string;
	export const HOST_GATEWAY_IP: string;
	export const npm_config_user_agent: string;
	export const CASROOT: string;
	export const ZAI_CONTAINER_URL: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const npm_execpath: string;
	export const LD_LIBRARY_PATH: string;
	export const LC_CTYPE: string;
	export const CLAUDE_WORKER_POOL_SIZE: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const GOOGLE_API_KEY: string;
	export const DEBUGINFOD_URLS: string;
	export const NVCC_CCBIN: string;
	export const OPENAI_ORG_ID: string;
	export const npm_package_json: string;
	export const NVIDIA_CTK_LIBCUDA_DIR: string;
	export const SUPERVISOR_PROCESS_NAME: string;
	export const MANAGEMENT_API_KEY: string;
	export const CUDA_HOME: string;
	export const CSF_XSMessage: string;
	export const MMGT_CLEAR: string;
	export const npm_config_noproxy: string;
	export const PATH: string;
	export const CSF_TObjDefaults: string;
	export const __GLX_VENDOR_LIBRARY_NAME: string;
	export const MCP_TCP_PORT: string;
	export const npm_config_node_gyp: string;
	export const ENABLE_VNC: string;
	export const npm_config_global_prefix: string;
	export const __VK_LAYER_NV_optimus: string;
	export const AGENTS_DIR: string;
	export const __NV_PRIME_RENDER_OFFLOAD: string;
	export const ZAI_BASE_URL: string;
	export const DRAWDEFAULT: string;
	export const npm_node_execpath: string;
	export const OLDPWD: string;
	export const SUPERVISOR_ENABLED: string;
	export const GEMINI_MCP_SOCKET: string;
	export const TERM_PROGRAM: string;
	export const BLENDER_WS_PORT: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		GOOGLE_CLOUD_PROJECT: string;
		VITE_RELAY_URL: string;
		VITE_EMBEDDING_API_URL: string;
		VITE_IMAGE_API_URL: string;
		VITE_APP_NAME: string;
		VITE_APP_VERSION: string;
		VITE_NDK_DEBUG: string;
		VITE_ADMIN_PUBKEY: string;
		VITE_IMAGE_BUCKET: string;
		VITE_IMAGE_ENCRYPTION_ENABLED: string;
		SHELL: string;
		npm_command: string;
		LSCOLORS: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		NVIDIA_VISIBLE_DEVICES: string;
		npm_config_userconfig: string;
		SUPERVISOR_GROUP_NAME: string;
		BLENDER_WS_HOST: string;
		COLORTERM: string;
		CSF_MDTVTexturesDirectory: string;
		LIBGL_ALWAYS_INDIRECT: string;
		npm_config_cache: string;
		MANAGEMENT_API_PORT: string;
		TERM_PROGRAM_VERSION: string;
		CSF_DrawPluginDefaults: string;
		TMUX: string;
		LOG_LEVEL: string;
		SUPERVISOR_SERVER_URL: string;
		HOSTNAME: string;
		NODE: string;
		CSF_LANGUAGE: string;
		SSH_AUTH_SOCK: string;
		CSF_MIGRATION_TYPES: string;
		ANTHROPIC_API_KEY: string;
		COLOR: string;
		OPENAI_API_KEY: string;
		npm_config_local_prefix: string;
		SSH_AGENT_PID: string;
		CSF_OCCTResourcePath: string;
		npm_config_globalconfig: string;
		CSF_STEPDefaults: string;
		EDITOR: string;
		ENABLE_DESKTOP: string;
		PWD: string;
		LOGNAME: string;
		DRAWHOME: string;
		NVIDIA_DRIVER_CAPABILITIES: string;
		npm_config_init_module: string;
		PERPLEXITY_API_KEY: string;
		VIPSHOME: string;
		MCP_TCP_HOST: string;
		NODE_ENV: string;
		_: string;
		CSF_StandardLiteDefaults: string;
		NoDefaultCurrentDirectoryInExePath: string;
		ENABLE_MCP_BRIDGE: string;
		MANAGEMENT_API_HOST: string;
		CLAUDECODE: string;
		ZAI_API_KEY: string;
		HOME: string;
		LANG: string;
		ZAI_ANTHROPIC_API_KEY: string;
		GITHUB_TOKEN: string;
		LS_COLORS: string;
		NVCC_PREPEND_FLAGS: string;
		npm_package_version: string;
		CLAUDE_MAX_QUEUE_SIZE: string;
		CUDA_VERSION: string;
		OPENAI_CODEX_SOCKET: string;
		ENABLE_SSH: string;
		BRAVE_API_KEY: string;
		GOOGLE_GEMINI_API_KEY: string;
		GPU_ACCELERATION: string;
		ENABLE_MANAGEMENT_API: string;
		INIT_CWD: string;
		CSF_ShadersDirectory: string;
		CSF_EXCEPTION_PROMPT: string;
		CSF_XmlOcafResource: string;
		WORKSPACE: string;
		npm_lifecycle_script: string;
		BLENDER_WS_URL: string;
		CONTEXT7_API_KEY: string;
		CUDA_VISIBLE_DEVICES: string;
		DEVPOD_WORKSPACE_FOLDER: string;
		CSF_SHMessage: string;
		npm_config_npm_version: string;
		PYTHONPATH: string;
		TERM: string;
		npm_package_name: string;
		ZSH: string;
		npm_config_prefix: string;
		USER: string;
		TMUX_PANE: string;
		CUDA_PATH: string;
		CSF_StandardDefaults: string;
		CSF_IGESDefaults: string;
		DISPLAY: string;
		CSF_XCAFDefaults: string;
		npm_lifecycle_event: string;
		ZAI_API_URL: string;
		SHLVL: string;
		GIT_EDITOR: string;
		PAGER: string;
		CSF_PluginDefaults: string;
		CSF_TObjMessage: string;
		HOST_GATEWAY_IP: string;
		npm_config_user_agent: string;
		CASROOT: string;
		ZAI_CONTAINER_URL: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		npm_execpath: string;
		LD_LIBRARY_PATH: string;
		LC_CTYPE: string;
		CLAUDE_WORKER_POOL_SIZE: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		GOOGLE_API_KEY: string;
		DEBUGINFOD_URLS: string;
		NVCC_CCBIN: string;
		OPENAI_ORG_ID: string;
		npm_package_json: string;
		NVIDIA_CTK_LIBCUDA_DIR: string;
		SUPERVISOR_PROCESS_NAME: string;
		MANAGEMENT_API_KEY: string;
		CUDA_HOME: string;
		CSF_XSMessage: string;
		MMGT_CLEAR: string;
		npm_config_noproxy: string;
		PATH: string;
		CSF_TObjDefaults: string;
		__GLX_VENDOR_LIBRARY_NAME: string;
		MCP_TCP_PORT: string;
		npm_config_node_gyp: string;
		ENABLE_VNC: string;
		npm_config_global_prefix: string;
		__VK_LAYER_NV_optimus: string;
		AGENTS_DIR: string;
		__NV_PRIME_RENDER_OFFLOAD: string;
		ZAI_BASE_URL: string;
		DRAWDEFAULT: string;
		npm_node_execpath: string;
		OLDPWD: string;
		SUPERVISOR_ENABLED: string;
		GEMINI_MCP_SOCKET: string;
		TERM_PROGRAM: string;
		BLENDER_WS_PORT: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
