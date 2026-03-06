/**
 * NIP-98 HTTP Auth Client Tests
 *
 * Tests for createNip98Token and fetchWithNip98 in the SvelteKit forum's
 * auth module. Verifies token creation, Authorization header injection,
 * and body payload handling for different body types.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the shared nip98/sign module that the client re-exports
const mockCreateNip98Token = vi.fn().mockResolvedValue('mock-base64-token');
vi.mock('../../../packages/nip98/sign.js', () => ({
  createNip98Token: (...args: any[]) => mockCreateNip98Token(...args),
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Capture global fetch calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { fetchWithNip98, createNip98Token } from '$lib/auth/nip98-client';

describe('nip98-client', () => {
  const testPrivkey = new Uint8Array(32).fill(0xab);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNip98Token.mockResolvedValue('mock-base64-token');
    mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNip98Token (re-export)', () => {
    it('should be a re-exported function from packages/nip98', () => {
      expect(typeof createNip98Token).toBe('function');
    });

    it('should delegate to the shared sign module', async () => {
      const result = await createNip98Token(
        testPrivkey,
        'https://api.example.com/data',
        'GET'
      );

      expect(mockCreateNip98Token).toHaveBeenCalledTimes(1);
      const [key, url, method] = mockCreateNip98Token.mock.calls[0];
      expect(key).toEqual(testPrivkey);
      expect(url).toBe('https://api.example.com/data');
      expect(method).toBe('GET');
      expect(result).toBe('mock-base64-token');
    });

    it('should pass body as payload when provided', async () => {
      const body = new TextEncoder().encode('{"data":1}');
      await createNip98Token(testPrivkey, 'https://api.example.com', 'POST', body);

      expect(mockCreateNip98Token).toHaveBeenCalledWith(
        testPrivkey,
        'https://api.example.com',
        'POST',
        body
      );
    });
  });

  describe('fetchWithNip98', () => {
    it('should add Authorization header with Nostr prefix', async () => {
      await fetchWithNip98('https://api.example.com/test', {}, testPrivkey);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/test');
      expect(opts.headers.Authorization).toBe('Nostr mock-base64-token');
    });

    it('should default to GET method', async () => {
      await fetchWithNip98('https://api.example.com/get', {}, testPrivkey);

      // createNip98Token should be called with 'GET'
      expect(mockCreateNip98Token).toHaveBeenCalledWith(
        testPrivkey,
        'https://api.example.com/get',
        'GET',
        undefined
      );
    });

    it('should use the provided HTTP method', async () => {
      await fetchWithNip98(
        'https://api.example.com/update',
        { method: 'PUT' },
        testPrivkey
      );

      expect(mockCreateNip98Token).toHaveBeenCalledWith(
        testPrivkey,
        'https://api.example.com/update',
        'PUT',
        undefined
      );
    });

    it('should encode string body as Uint8Array for token', async () => {
      const bodyStr = '{"key":"value"}';
      await fetchWithNip98(
        'https://api.example.com/post',
        { method: 'POST', body: bodyStr },
        testPrivkey
      );

      const calledBody = mockCreateNip98Token.mock.calls[0][3];
      // jsdom may use a different Uint8Array realm, so check by content
      expect(calledBody).toBeDefined();
      expect(new TextDecoder().decode(calledBody)).toBe(bodyStr);
    });

    it('should pass ArrayBuffer body directly for token', async () => {
      const buffer = new ArrayBuffer(8);
      new Uint8Array(buffer).set([1, 2, 3, 4, 5, 6, 7, 8]);

      await fetchWithNip98(
        'https://api.example.com/binary',
        { method: 'POST', body: buffer },
        testPrivkey
      );

      const calledBody = mockCreateNip98Token.mock.calls[0][3];
      expect(calledBody).toBe(buffer);
    });

    it('should pass Uint8Array body directly for token', async () => {
      const bytes = new Uint8Array([10, 20, 30]);

      await fetchWithNip98(
        'https://api.example.com/bytes',
        { method: 'POST', body: bytes },
        testPrivkey
      );

      const calledBody = mockCreateNip98Token.mock.calls[0][3];
      expect(calledBody).toBe(bytes);
    });

    it('should skip payload hash for null body', async () => {
      await fetchWithNip98(
        'https://api.example.com/empty',
        { method: 'POST', body: null },
        testPrivkey
      );

      const calledBody = mockCreateNip98Token.mock.calls[0][3];
      expect(calledBody).toBeUndefined();
    });

    it('should skip payload hash for undefined body', async () => {
      await fetchWithNip98(
        'https://api.example.com/empty',
        { method: 'GET' },
        testPrivkey
      );

      const calledBody = mockCreateNip98Token.mock.calls[0][3];
      expect(calledBody).toBeUndefined();
    });

    it('should skip payload hash for FormData body', async () => {
      const formData = new FormData();
      formData.append('file', 'content');

      await fetchWithNip98(
        'https://api.example.com/upload',
        { method: 'POST', body: formData },
        testPrivkey
      );

      const calledBody = mockCreateNip98Token.mock.calls[0][3];
      expect(calledBody).toBeUndefined();
    });

    it('should preserve existing headers alongside Authorization', async () => {
      await fetchWithNip98(
        'https://api.example.com/test',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'value'
          },
          body: '{"data":1}'
        },
        testPrivkey
      );

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.headers['X-Custom']).toBe('value');
      expect(opts.headers.Authorization).toBe('Nostr mock-base64-token');
    });

    it('should pass through all fetch options (credentials, cache, etc.)', async () => {
      await fetchWithNip98(
        'https://api.example.com/test',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          body: 'test'
        },
        testPrivkey
      );

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.credentials).toBe('include');
      expect(opts.cache).toBe('no-store');
    });

    it('should return the fetch Response', async () => {
      const mockResponse = new Response('{"result":"ok"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetchWithNip98(
        'https://api.example.com/test',
        {},
        testPrivkey
      );

      expect(response).toBe(mockResponse);
      expect(response.status).toBe(200);
    });

    it('should propagate fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        fetchWithNip98('https://api.example.com/fail', {}, testPrivkey)
      ).rejects.toThrow('Network failure');
    });

    it('should propagate token creation errors', async () => {
      mockCreateNip98Token.mockRejectedValueOnce(new Error('Signing failed'));

      await expect(
        fetchWithNip98('https://api.example.com/fail', {}, testPrivkey)
      ).rejects.toThrow('Signing failed');
    });

    it('should handle empty options object', async () => {
      await fetchWithNip98('https://api.example.com/default', {}, testPrivkey);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/default',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Nostr mock-base64-token'
          })
        })
      );
    });
  });
});
