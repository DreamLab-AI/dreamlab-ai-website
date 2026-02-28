export interface VerifyOptions {
  url: string;
  method: string;
  rawBody?: ArrayBuffer | Uint8Array | Buffer;
  maxSize?: number;
  allowBasicNostr?: boolean;
  allowMethodWildcard?: boolean;
  allowUrlPrefix?: boolean;
}

export interface VerifyResult {
  pubkey: string;
  didNostr: string;
}

export interface Nip98Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}
