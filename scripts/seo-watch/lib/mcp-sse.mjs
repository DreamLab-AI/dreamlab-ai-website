// Minimal MCP client over the SSE transport, enough to drive the
// browsercontainer sidecar (chrome-devtools-mcp at http://browsercontainer:8931)
// from a cron job without pulling an SDK into the repo.
//
// Protocol: GET /sse opens an event stream whose first `endpoint` event names
// the POST URL for this session; every JSON-RPC request is POSTed there and its
// response arrives as a `message` event on the stream. Frames are split on a
// blank line; a frame's `data:` lines are joined with "\n".
//
// Fail-open by construction: every call has a deadline, and the audit treats a
// rejected promise from here as "no browser tonight", never as a crash.

export function parseSseFrames(buffer) {
  const frames = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf('\n\n')) >= 0) {
    const chunk = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let event = 'message';
    const data = [];
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) frames.push({ event, data: data.join('\n') });
  }
  return { frames, rest };
}

export class McpSseClient {
  constructor(base, { timeoutMs = 60_000, fetchImpl = globalThis.fetch, log = () => {} } = {}) {
    this.base = base.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
    this.log = log;
    this.endpoint = null;
    this.pending = new Map();
    this.nextId = 1;
    this.controller = new AbortController();
    this.closed = false;
  }

  async connect({ connectTimeoutMs = 15_000 } = {}) {
    const res = await this.fetch(`${this.base}/sse`, { signal: this.controller.signal, headers: { accept: 'text/event-stream' } });
    if (!res.ok || !res.body) throw new Error(`sse: HTTP ${res.status} from ${this.base}/sse`);
    const endpointReady = new Promise((resolve, reject) => {
      this.resolveEndpoint = resolve;
      this.rejectEndpoint = reject;
    });
    this.pump(res.body).catch((err) => {
      if (!this.closed) this.failAll(err);
    });
    const timer = setTimeout(() => this.rejectEndpoint?.(new Error('sse: no endpoint event before deadline')), connectTimeoutMs);
    try {
      await endpointReady;
    } finally {
      clearTimeout(timer);
    }
    await this.call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'dreamlab-seo-watch', version: '1' },
    });
    await this.notify('notifications/initialized');
    return this;
  }

  async pump(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { frames, rest } = parseSseFrames(buffer);
      buffer = rest;
      for (const frame of frames) this.onFrame(frame);
    }
    if (!this.closed) this.failAll(new Error('sse: stream ended'));
  }

  onFrame({ event, data }) {
    if (event === 'endpoint') {
      this.endpoint = data.startsWith('http') ? data : `${this.base}${data.startsWith('/') ? '' : '/'}${data}`;
      this.resolveEndpoint?.();
      return;
    }
    if (event !== 'message') return;
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg && msg.id !== undefined && this.pending.has(msg.id)) {
      const { resolve, reject, timer } = this.pending.get(msg.id);
      clearTimeout(timer);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(`mcp ${msg.error.code ?? ''}: ${msg.error.message ?? JSON.stringify(msg.error)}`));
      else resolve(msg.result);
    }
  }

  failAll(err) {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
    this.rejectEndpoint?.(err);
  }

  async post(payload) {
    if (!this.endpoint) throw new Error('mcp: not connected');
    const res = await this.fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok && res.status !== 202) throw new Error(`mcp: POST ${res.status}`);
  }

  async notify(method, params) {
    await this.post({ jsonrpc: '2.0', method, ...(params ? { params } : {}) });
  }

  call(method, params = {}, timeoutMs = this.timeoutMs) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`mcp: ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.post({ jsonrpc: '2.0', id, method, params }).catch((err) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      });
    });
  }

  // Calls a tool and returns its text content. A tool-level error (isError)
  // becomes a thrown Error so callers can treat it like a transport failure.
  async tool(name, args = {}, timeoutMs = this.timeoutMs) {
    const result = await this.call('tools/call', { name, arguments: args }, timeoutMs);
    const text = (result?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    if (result?.isError) throw new Error(`tool ${name}: ${text.slice(0, 300)}`);
    return text;
  }

  close() {
    this.closed = true;
    this.controller.abort();
    this.failAll(new Error('mcp: closed'));
  }
}
