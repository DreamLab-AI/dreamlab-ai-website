/**
 * DreamLab Forum API client — TypeScript bindings for nostr-bbs worker endpoints.
 *
 * Worker URLs are read from Vite environment variables:
 *   - VITE_AUTH_API_URL  (auth-worker)
 *   - VITE_POD_API_URL   (pod-worker — hosts /pay/ routes)
 *   - VITE_SEARCH_API_URL (search-worker)
 *
 * Payment routes follow the Web Ledgers spec:
 *   - GET  /pay/.info     — payment gateway metadata (chains, cost, unit)
 *   - GET  /pay/.balance  — authenticated user's balance (NIP-98 required)
 *   - POST /pay/.deposit  — deposit via TXO URI (NIP-98 required)
 *
 * @see https://webledgers.org
 * @see nostr-bbs-pod-worker/src/payments.rs
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POD_API_URL =
  import.meta.env.VITE_POD_API_URL ||
  "https://dreamlab-pod-api.solitary-paper-764d.workers.dev";

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL ||
  "https://dreamlab-auth-api.solitary-paper-764d.workers.dev";

const SEARCH_API_URL =
  import.meta.env.VITE_SEARCH_API_URL ||
  "https://dreamlab-search-api.solitary-paper-764d.workers.dev";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payment gateway metadata returned by GET /pay/.info. */
export interface PayInfo {
  name: string;
  description: string;
  unit: string;
  cost_sats: number;
  chains: ChainInfo[];
  enabled: boolean;
}

/** Supported blockchain configuration. */
export interface ChainInfo {
  id: string;
  name: string;
  explorer_api: string;
}

/** Balance response returned by GET /pay/.balance. */
export interface PayBalance {
  did: string;
  balance: number;
  cost_per_request: number;
  unit: string;
  requests_remaining: number;
}

/** Deposit response returned by POST /pay/.deposit. */
export interface PayDeposit {
  status: "deposited";
  did: string;
  credited: number;
  balance: number;
  unit: string;
}

/** Resource access response after successful debit. */
export interface PayResource {
  resource: string;
  charged: number;
  balance: number;
  unit: string;
}

/** Error response from payment endpoints. */
export interface PayError {
  error: string;
}

/** HTTP 402 Payment Required response body. */
export interface PaymentRequired {
  type: "PaymentRequired";
  balance: number;
  cost: number;
  unit: string;
}

/** MRC20 token metadata returned inside PayInfo when token config exists. */
export interface TokenInfo {
  ticker: string;
  rate: number;
  buy: string;
  withdraw: string;
  supply: number;
  issuer: string;
}

/** Extended PayInfo that includes optional token metadata. */
export interface PayInfoExtended extends PayInfo {
  token?: TokenInfo;
  pool?: string;
}

/** Response from POST /pay/.buy (purchase tokens with sat balance). */
export interface TokenBuyResponse {
  status: "bought";
  did: string;
  ticker: string;
  amount: number;
  cost_sats: number;
  balance_sats: number;
}

/** Response from POST /pay/.withdraw (redeem tokens for sats). */
export interface TokenWithdrawResponse {
  status: "withdrawn";
  did: string;
  ticker: string;
  amount: number;
  credited_sats: number;
  balance_sats: number;
}

// ---------------------------------------------------------------------------
// API error handling
// ---------------------------------------------------------------------------

export class ForumApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ForumApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }
    const msg =
      body && typeof body === "object" && "error" in body
        ? (body as PayError).error
        : `HTTP ${response.status}`;
    throw new ForumApiError(msg, response.status, body);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Payment API (Web Ledgers spec — pod-worker /pay/ routes)
// ---------------------------------------------------------------------------

/**
 * Fetch payment gateway metadata.
 * No authentication required.
 */
export async function getPayInfo(): Promise<PayInfo> {
  const resp = await fetch(`${POD_API_URL}/pay/.info`);
  return handleResponse<PayInfo>(resp);
}

/**
 * Fetch the authenticated user's balance.
 * Requires a NIP-98 Authorization header.
 */
export async function getPayBalance(
  nip98AuthHeader: string,
): Promise<PayBalance> {
  const resp = await fetch(`${POD_API_URL}/pay/.balance`, {
    headers: {
      Authorization: nip98AuthHeader,
    },
  });
  return handleResponse<PayBalance>(resp);
}

/**
 * Deposit funds via a Bitcoin TXO URI.
 * Requires a NIP-98 Authorization header.
 *
 * @param nip98AuthHeader - NIP-98 `Nostr <base64-event>` authorization header
 * @param txoUri - Bitcoin TXO URI (e.g. `bitcoin:<txid>?vout=0`)
 */
export async function postPayDeposit(
  nip98AuthHeader: string,
  txoUri: string,
): Promise<PayDeposit> {
  const resp = await fetch(`${POD_API_URL}/pay/.deposit`, {
    method: "POST",
    headers: {
      Authorization: nip98AuthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ txo: txoUri }),
  });
  return handleResponse<PayDeposit>(resp);
}

/**
 * Deposit funds by specifying a satoshi amount directly (testnet/dev only).
 * Requires a NIP-98 Authorization header.
 */
export async function postPayDepositSats(
  nip98AuthHeader: string,
  amountSats: number,
): Promise<PayDeposit> {
  const resp = await fetch(`${POD_API_URL}/pay/.deposit`, {
    method: "POST",
    headers: {
      Authorization: nip98AuthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount_sats: amountSats }),
  });
  return handleResponse<PayDeposit>(resp);
}

/**
 * Access a paid resource. Debits the user's balance by `cost_sats`.
 * Requires a NIP-98 Authorization header.
 * Throws `ForumApiError` with status 402 if balance is insufficient.
 */
export async function getPayResource(
  nip98AuthHeader: string,
  resourcePath: string,
): Promise<PayResource> {
  const path = resourcePath.startsWith("/") ? resourcePath.slice(1) : resourcePath;
  const resp = await fetch(`${POD_API_URL}/pay/${path}`, {
    headers: {
      Authorization: nip98AuthHeader,
    },
  });
  return handleResponse<PayResource>(resp);
}

/**
 * Check if a 402 response indicates insufficient balance.
 */
export function isPaymentRequired(error: unknown): error is ForumApiError {
  return error instanceof ForumApiError && error.status === 402;
}

/**
 * Fetch extended payment gateway metadata (includes token info if configured).
 * No authentication required.
 */
export async function getPayInfoExtended(): Promise<PayInfoExtended> {
  const resp = await fetch(`${POD_API_URL}/pay/.info`);
  return handleResponse<PayInfoExtended>(resp);
}

// ---------------------------------------------------------------------------
// MRC20 Token API (pod-worker /pay/.buy and /pay/.withdraw routes)
// ---------------------------------------------------------------------------

/**
 * Buy MRC20 tokens with sat balance.
 * Requires a NIP-98 Authorization header.
 *
 * @param nip98AuthHeader - NIP-98 `Nostr <base64-event>` authorization header
 * @param amount - Number of tokens to purchase
 */
export async function postTokenBuy(
  nip98AuthHeader: string,
  amount: number,
): Promise<TokenBuyResponse> {
  const resp = await fetch(`${POD_API_URL}/pay/.buy`, {
    method: "POST",
    headers: {
      Authorization: nip98AuthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  return handleResponse<TokenBuyResponse>(resp);
}

/**
 * Withdraw (redeem) MRC20 tokens back to sat balance.
 * Requires a NIP-98 Authorization header.
 *
 * @param nip98AuthHeader - NIP-98 `Nostr <base64-event>` authorization header
 * @param amount - Number of tokens to redeem
 */
export async function postTokenWithdraw(
  nip98AuthHeader: string,
  amount: number,
): Promise<TokenWithdrawResponse> {
  const resp = await fetch(`${POD_API_URL}/pay/.withdraw`, {
    method: "POST",
    headers: {
      Authorization: nip98AuthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });
  return handleResponse<TokenWithdrawResponse>(resp);
}

// ---------------------------------------------------------------------------
// Auth API helpers
// ---------------------------------------------------------------------------

/** Base URL for the auth-worker. */
export function getAuthApiUrl(): string {
  return AUTH_API_URL;
}

// ---------------------------------------------------------------------------
// Search API helpers
// ---------------------------------------------------------------------------

/** Base URL for the search-worker. */
export function getSearchApiUrl(): string {
  return SEARCH_API_URL;
}

// ---------------------------------------------------------------------------
// Pod API helpers
// ---------------------------------------------------------------------------

/** Base URL for the pod-worker. */
export function getPodApiUrl(): string {
  return POD_API_URL;
}

/**
 * Fetch the Web Ledgers discovery document.
 * Available at `/.well-known/webledgers/webledgers.json` on the pod-worker.
 */
export async function getWebLedgersDiscovery(): Promise<unknown> {
  const resp = await fetch(
    `${POD_API_URL}/.well-known/webledgers/webledgers.json`,
  );
  return handleResponse<unknown>(resp);
}
