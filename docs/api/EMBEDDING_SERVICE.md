# Embedding Service API

## Overview

The Embedding Service provides lazy-loaded vector embeddings for semantic search capabilities. Embeddings are stored in Google Cloud Storage and synced to client devices over WiFi to minimize data usage.

**Storage**: Google Cloud Storage (Public Bucket)
**Bucket**: `Nostr-BBS-vectors`
**Base URL**: `https://storage.googleapis.com/Nostr-BBS-vectors`
**Model**: all-MiniLM-L6-v2 (384 dimensions)
**Quantization**: int8 or float32

## Architecture

```
┌─────────────┐      WiFi      ┌─────────────┐      HTTPS     ┌─────────────┐
│   Client    │ ────────────► │  Sync Layer │ ──────────────► │     GCS     │
│  (Browser)  │                │ (Service)   │                 │   Bucket    │
└─────────────┘                └─────────────┘                 └─────────────┘
      │                               │                               │
      │ IndexedDB                     │ Manifest                      │ Files
      ▼                               ▼                               ▼
┌─────────────┐                ┌─────────────┐                ┌─────────────┐
│   Local     │                │   metadata  │                │  index.bin  │
│   Storage   │                │   table     │                │  mapping    │
└─────────────┘                └─────────────┘                │  manifest   │
                                                               └─────────────┘
```

## Manifest API

### Get Latest Manifest

**Endpoint**: `GET https://storage.googleapis.com/Nostr-BBS-vectors/latest/manifest.json`

**Response**:
```json
{
  "version": 2,
  "updated_at": "2024-01-25T10:00:00Z",
  "total_vectors": 150000,
  "dimensions": 384,
  "model": "all-MiniLM-L6-v2",
  "quantize_type": "int8",
  "index_size_bytes": 52428800,
  "embeddings_size_bytes": 209715200,
  "latest": {
    "index": "latest/index.bin",
    "index_mapping": "latest/index_mapping.json",
    "embeddings": "latest/embeddings.bin",
    "manifest": "latest/manifest.json"
  }
}
```

### Manifest Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Manifest version number |
| `updated_at` | string | ISO 8601 timestamp |
| `total_vectors` | integer | Total number of embeddings |
| `dimensions` | integer | Vector dimensions (384) |
| `model` | string | Embedding model name |
| `quantize_type` | string | Quantization type (int8 or float32) |
| `index_size_bytes` | integer | HNSW index file size |
| `embeddings_size_bytes` | integer | Embeddings file size |
| `latest` | object | Latest file paths |

## File API

### Download HNSW Index

**Endpoint**: `GET https://storage.googleapis.com/Nostr-BBS-vectors/{path}`

**Example**:
```
GET https://storage.googleapis.com/Nostr-BBS-vectors/latest/index.bin
```

**Response**: Binary file (HNSW index)

**Size**: ~50 MB (varies by index size)

### Download Index Mapping

**Endpoint**: `GET https://storage.googleapis.com/Nostr-BBS-vectors/latest/index_mapping.json`

**Response**:
```json
{
  "0": "event_id_1",
  "1": "event_id_2",
  "2": "event_id_3",
  ...
}
```

Maps HNSW index positions to Nostr event IDs.

### Download Embeddings

**Endpoint**: `GET https://storage.googleapis.com/Nostr-BBS-vectors/latest/embeddings.bin`

**Response**: Binary file (raw embeddings)

**Format**:
- int8: 1 byte per dimension (384 bytes per vector)
- float32: 4 bytes per dimension (1536 bytes per vector)

## Client Sync API

### Check Sync Status

```typescript
import { getLocalSyncState, getConnectionStatus } from '$lib/semantic/embeddings-sync';

// Get local sync state
const syncState = await getLocalSyncState();
console.log(syncState);
// {
//   version: 2,
//   lastSynced: 1706180400000,
//   indexLoaded: false
// }

// Check if should sync
const status = getConnectionStatus();
console.log(status);
// {
//   canSync: true,
//   reason: 'Connected via wifi',
//   platform: 'wifi'
// }
```

### Sync Embeddings

```typescript
import { syncEmbeddings } from '$lib/semantic/embeddings-sync';

// Auto-sync (only on WiFi)
const result = await syncEmbeddings();
console.log(result);
// { synced: true, version: 2 }

// Force sync (bypass WiFi check)
const forceResult = await syncEmbeddings(true);
console.log(forceResult);
// { synced: true, version: 2 }
```

### Initialize Sync

```typescript
import { initEmbeddingSync } from '$lib/semantic/embeddings-sync';

// Initialize on app start (non-blocking)
await initEmbeddingSync();
// Syncs in background after 5-second delay
```

## User Preferences API

### Get User Preference

```typescript
import { getUserSyncPreference } from '$lib/semantic/embeddings-sync';

const preference = getUserSyncPreference();
// Returns: 'wifi-only' | 'always' | 'manual' | null
```

### Set User Preference

```typescript
import { setUserSyncPreference } from '$lib/semantic/embeddings-sync';

// WiFi only (default)
setUserSyncPreference('wifi-only');

// Always sync (even on mobile data)
setUserSyncPreference('always');

// Manual sync only
setUserSyncPreference('manual');
```

## Connection Detection

### Network Types

| Type | Description | Auto-Sync |
|------|-------------|-----------|
| `wifi` | WiFi connection | ✅ Yes |
| `ethernet` | Wired connection | ✅ Yes |
| `4g` | Fast 4G (not metered) | ✅ Yes |
| `3g` | 3G connection | ❌ No |
| `2g` | 2G connection | ❌ No |
| `cellular` | Mobile data (metered) | ❌ No |
| `unknown` | Unknown connection | ✅ Yes (desktop) |

### Platform Detection

| Platform | Auto-Sync | Notes |
|----------|-----------|-------|
| iOS | ❌ No | Defaults to manual sync (navigator.connection unavailable) |
| macOS Safari | ✅ Yes | Assumes WiFi connection |
| Desktop Chrome | ✅ Yes | Uses navigator.connection |
| Android Chrome | ✅ Yes | Uses navigator.connection |

### Connection API

```typescript
import { shouldSync, getConnectionStatus } from '$lib/semantic/embeddings-sync';

// Check if should sync
if (shouldSync()) {
  console.log('Ready to sync');
}

// Get detailed status
const status = getConnectionStatus();
console.log(status);
// {
//   canSync: false,
//   reason: 'iOS detected - enable "Always sync" in settings',
//   platform: 'ios'
// }
```

## IndexedDB Schema

### Metadata Table

**Table**: `metadata`

| Key | Value Type | Description |
|-----|------------|-------------|
| `embedding_sync_state` | `SyncState` | Sync state object |

**SyncState Structure**:
```typescript
{
  version: number;        // Current version
  lastSynced: number;     // Unix timestamp (ms)
  indexLoaded: boolean;   // Whether index is loaded in memory
}
```

### Embeddings Table

**Table**: `embeddings`

| Key | Data | Version | Description |
|-----|------|---------|-------------|
| `hnsw_index` | ArrayBuffer | integer | HNSW index binary |
| `index_mapping` | ArrayBuffer | integer | ID mapping binary |

## Error Handling

### Common Errors

```typescript
// Network error
try {
  await syncEmbeddings();
} catch (error) {
  console.error('Sync failed:', error);
  // Retry with exponential backoff
}

// Manifest not found
const manifest = await fetchManifest();
if (!manifest) {
  console.warn('Failed to fetch manifest');
  // Use cached version
}

// Storage quota exceeded
try {
  await db.table('embeddings').put({ ... });
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.error('Storage quota exceeded');
    // Clear old data or prompt user
  }
}
```

### Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `Failed to fetch manifest` | Network error or bucket unavailable | Retry with backoff |
| `Failed to download index` | Large file download failed | Retry or check connection |
| `QuotaExceededError` | IndexedDB storage full | Clear old embeddings |
| `Not on WiFi` | Mobile data connection | Wait for WiFi or enable "Always sync" |

## Performance Optimization

### File Sizes

- **Manifest**: ~1 KB
- **HNSW Index**: ~50 MB (varies)
- **Index Mapping**: ~10 MB (varies)
- **Embeddings**: ~200 MB (varies)

### Caching Strategy

1. **Check local version** before downloading
2. **Download only if new version** available
3. **Store in IndexedDB** for offline access
4. **Lazy load** into memory when needed
5. **Background sync** 5 seconds after app start

### Bandwidth Optimization

- **WiFi-only default** to minimize data usage
- **Quantized embeddings** (int8) reduce size by 75%
- **HNSW indexing** enables fast similarity search
- **Progressive loading** for large datasets
- **Delta updates** for incremental syncs (future)

## Integration Examples

### Basic Integration

```typescript
import {
  initEmbeddingSync,
  syncEmbeddings,
  getConnectionStatus
} from '$lib/semantic/embeddings-sync';

// Initialize on app mount
onMount(async () => {
  await initEmbeddingSync();

  // Check connection status
  const status = getConnectionStatus();
  if (status.canSync) {
    console.log('Syncing embeddings...');
  }
});
```

### Manual Sync with Progress

```typescript
import { fetchManifest, syncEmbeddings } from '$lib/semantic/embeddings-sync';

async function manualSync() {
  try {
    // Show loading indicator
    loading = true;

    // Fetch manifest
    const manifest = await fetchManifest();
    if (!manifest) throw new Error('Failed to fetch manifest');

    console.log(`Downloading ${manifest.index_size_bytes / 1024 / 1024} MB...`);

    // Sync embeddings
    const result = await syncEmbeddings(true); // Force sync

    if (result.synced) {
      console.log(`Synced to version ${result.version}`);
    }
  } catch (error) {
    console.error('Manual sync failed:', error);
  } finally {
    loading = false;
  }
}
```

### Settings UI Integration

```typescript
import {
  getUserSyncPreference,
  setUserSyncPreference
} from '$lib/semantic/embeddings-sync';

let syncPreference = getUserSyncPreference() || 'wifi-only';

function updatePreference(newPref: 'wifi-only' | 'always' | 'manual') {
  setUserSyncPreference(newPref);
  syncPreference = newPref;

  // Trigger sync if changed to 'always'
  if (newPref === 'always') {
    syncEmbeddings();
  }
}
```

## Best Practices

1. **Always check connection** before syncing
2. **Respect user preferences** for data usage
3. **Use background sync** to avoid blocking UI
4. **Handle errors gracefully** with retry logic
5. **Show sync progress** to users
6. **Cache locally** for offline access
7. **Validate manifest** before downloading
8. **Clean up old versions** to save space
9. **Monitor storage quota** usage
10. **Implement exponential backoff** for retries

## Security Considerations

1. **Public bucket** - No authentication required
2. **HTTPS only** - Encrypted in transit
3. **CORS enabled** - Cross-origin requests allowed
4. **No sensitive data** - Only vector embeddings
5. **Client-side validation** - Verify file integrity
6. **Rate limiting** - Implement on client side
7. **Storage isolation** - IndexedDB per origin

## Future Enhancements

- **Delta updates** for incremental syncs
- **Compression** for smaller file sizes
- **CDN distribution** for faster downloads
- **Version pinning** for stable deployments
- **Webhook notifications** for new versions
- **Background sync API** for PWAs
- **Service Worker caching** for offline support

## References

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Sentence Transformers](https://www.sbert.net/)
