# Supabase Database API

## Overview

The Nostr BBS application uses Supabase as a supplementary database for structured data storage, user management, and real-time features. The primary data store is the Nostr relay, while Supabase provides additional functionality.

**Platform**: Supabase (PostgreSQL + PostgREST + Realtime)
**Authentication**: API Key + JWT
**Transport**: HTTPS REST + WebSocket (Realtime)

## Connection Configuration

### Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Client Initialization

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
});

export { supabase };
```

## Authentication API

### No Built-in Auth

The application does not use Supabase authentication. Instead, it relies on:

- **NIP-07** browser extension (Alby, nos2x)
- **NIP-42** relay authentication
- **Nostr keypairs** for identity

Supabase is used in **anonymous mode** with the anon key for public data access.

## REST API

### Base URL

```
https://your-project.supabase.co/rest/v1/
```

### Authentication

All requests require the API key header:

```http
apikey: your-anon-key
Authorization: Bearer your-anon-key
```

### Common Headers

```http
Content-Type: application/json
apikey: your-anon-key
Authorization: Bearer your-anon-key
Prefer: return=representation  # Return full object after insert/update
```

## Database Schema

### Tables Overview

The current implementation uses Supabase primarily for:

1. **User profiles** (supplementary to Nostr kind 0)
2. **Application metadata**
3. **Analytics and metrics**
4. **Caching layer** for frequently accessed data

### Typical Schema (Example)

```sql
-- User profiles (supplementary to Nostr)
CREATE TABLE profiles (
  pubkey TEXT PRIMARY KEY,
  display_name TEXT,
  about TEXT,
  picture TEXT,
  banner TEXT,
  nip05 TEXT,
  lud16 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_display_name ON profiles(display_name);
CREATE INDEX idx_profiles_nip05 ON profiles(nip05);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);
```

### Metadata Table

```sql
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Examples:
-- key: 'relay_stats', value: { "total_events": 150000, ... }
-- key: 'app_config', value: { "maintenance_mode": false, ... }
```

## REST API Operations

### Select (Query)

**Endpoint**: `GET /rest/v1/profiles`

**Query Parameters**:
- `select` - Columns to select
- `order` - Sort order
- `limit` - Result limit
- `offset` - Pagination offset

**Example**:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('pubkey, display_name, picture')
  .order('created_at', { ascending: false })
  .limit(50);
```

**Response**:
```json
[
  {
    "pubkey": "pubkey_hex",
    "display_name": "Alice",
    "picture": "https://example.com/avatar.jpg"
  }
]
```

### Insert

**Endpoint**: `POST /rest/v1/profiles`

**Example**:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .insert({
    pubkey: 'pubkey_hex',
    display_name: 'Alice',
    picture: 'https://example.com/avatar.jpg'
  })
  .select();
```

**Request Body**:
```json
{
  "pubkey": "pubkey_hex",
  "display_name": "Alice",
  "picture": "https://example.com/avatar.jpg"
}
```

**Response**:
```json
[
  {
    "pubkey": "pubkey_hex",
    "display_name": "Alice",
    "picture": "https://example.com/avatar.jpg",
    "created_at": "2024-01-25T10:00:00Z"
  }
]
```

### Update

**Endpoint**: `PATCH /rest/v1/profiles`

**Example**:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({ display_name: 'Alice Smith' })
  .eq('pubkey', 'pubkey_hex')
  .select();
```

**Request Body**:
```json
{
  "display_name": "Alice Smith"
}
```

### Delete

**Endpoint**: `DELETE /rest/v1/profiles`

**Example**:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .delete()
  .eq('pubkey', 'pubkey_hex');
```

### Filters

```typescript
// Equal
.eq('pubkey', 'pubkey_hex')

// Not equal
.neq('display_name', 'Anonymous')

// Greater than
.gt('created_at', '2024-01-01')

// Less than
.lt('created_at', '2024-12-31')

// In array
.in('pubkey', ['pubkey1', 'pubkey2'])

// Like (pattern matching)
.like('display_name', '%Alice%')

// Is null
.is('banner', null)

// Not null
.not('picture', 'is', null)

// Full-text search
.textSearch('about', 'bitcoin & nostr')
```

## Realtime API

### Subscribe to Changes

```typescript
const channel = supabase
  .channel('profiles-changes')
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE, or *
      schema: 'public',
      table: 'profiles'
    },
    (payload) => {
      console.log('Change received:', payload);
    }
  )
  .subscribe();
```

### Realtime Events

```typescript
{
  commit_timestamp: '2024-01-25T10:00:00Z',
  eventType: 'INSERT',  // or UPDATE, DELETE
  new: {
    pubkey: 'pubkey_hex',
    display_name: 'Alice',
    // ... full row data
  },
  old: {},  // For UPDATE/DELETE only
  schema: 'public',
  table: 'profiles'
}
```

### Unsubscribe

```typescript
await supabase.removeChannel(channel);
```

### Presence (Realtime Users)

```typescript
const channel = supabase.channel('online-users', {
  config: {
    presence: {
      key: userPubkey
    }
  }
});

// Track user presence
await channel.track({
  user_pubkey: userPubkey,
  online_at: new Date().toISOString()
});

// Listen to presence changes
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', state);
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('User joined:', key);
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('User left:', key);
  })
  .subscribe();
```

## Storage API (Optional)

### Upload File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${pubkey}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true
  });
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${pubkey}/avatar.jpg`);

console.log(data.publicUrl);
```

### Download File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .download(`${pubkey}/avatar.jpg`);
```

### Delete File

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .remove([`${pubkey}/avatar.jpg`]);
```

## RPC Functions

### Create Function

```sql
CREATE OR REPLACE FUNCTION get_user_stats(user_pubkey TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_posts', COUNT(*) FILTER (WHERE kind = 1),
    'total_replies', COUNT(*) FILTER (WHERE kind = 1 AND tags @> '[["e"]]'::jsonb)
  )
  INTO result
  FROM events
  WHERE pubkey = user_pubkey;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Call Function

```typescript
const { data, error } = await supabase
  .rpc('get_user_stats', {
    user_pubkey: 'pubkey_hex'
  });

console.log(data);
// { total_posts: 42, total_replies: 15 }
```

## Error Handling

### Error Response Format

```typescript
{
  error: {
    message: 'Error message',
    details: 'Additional details',
    hint: 'Suggestion to fix',
    code: 'PGRST116'
  }
}
```

### Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| `PGRST116` | The result contains 0 rows | No matching rows found |
| `PGRST301` | JWT expired | Authentication token expired |
| `23505` | Duplicate key value | Primary key conflict |
| `23503` | Foreign key violation | Referenced row doesn't exist |
| `42P01` | Relation does not exist | Table doesn't exist |

### Error Handling Example

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('pubkey', pubkey);

if (error) {
  if (error.code === 'PGRST116') {
    console.log('Profile not found');
  } else {
    console.error('Database error:', error.message);
  }
  return null;
}

return data;
```

## Performance Optimization

### Indexes

```sql
-- B-tree index for exact matches
CREATE INDEX idx_profiles_pubkey ON profiles(pubkey);

-- Partial index for filtered queries
CREATE INDEX idx_active_profiles ON profiles(pubkey) WHERE updated_at > NOW() - INTERVAL '30 days';

-- GIN index for JSONB
CREATE INDEX idx_profiles_metadata ON profiles USING GIN(metadata);

-- Full-text search index
CREATE INDEX idx_profiles_search ON profiles USING GIN(to_tsvector('english', display_name || ' ' || about));
```

### Query Optimization

```typescript
// Bad: Select all columns
const { data } = await supabase
  .from('profiles')
  .select('*');

// Good: Select specific columns
const { data } = await supabase
  .from('profiles')
  .select('pubkey, display_name, picture');

// Good: Use single query for pagination
const { data, count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact' })
  .range(0, 49);
```

### Caching

```typescript
// Cache-Control header
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('pubkey', pubkey)
  .maybeSingle();

// Client-side caching
const cache = new Map();

async function getProfile(pubkey: string) {
  if (cache.has(pubkey)) {
    return cache.get(pubkey);
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('pubkey', pubkey)
    .maybeSingle();

  if (data) {
    cache.set(pubkey, data);
  }

  return data;
}
```

## Row Level Security (RLS)

### Enable RLS

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Public Read Policy

```sql
CREATE POLICY "Public read access"
  ON profiles FOR SELECT
  USING (true);
```

### Authenticated Write Policy

```sql
-- Example for authenticated users (if using Supabase Auth)
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid()::TEXT = pubkey)
  WITH CHECK (auth.uid()::TEXT = pubkey);
```

### Admin Policy

```sql
CREATE POLICY "Admins can do anything"
  ON profiles
  USING (auth.jwt() ->> 'role' = 'admin');
```

## Best Practices

1. **Use specific column selection** instead of `SELECT *`
2. **Enable RLS** on all tables
3. **Create indexes** for frequently queried columns
4. **Use transactions** for multiple operations
5. **Implement pagination** for large datasets
6. **Cache frequently accessed data**
7. **Handle errors gracefully**
8. **Use RPC functions** for complex queries
9. **Monitor query performance** with `EXPLAIN ANALYZE`
10. **Validate input data** on client and server

## Security Considerations

1. **Never expose service_role key** in client code
2. **Use RLS policies** to restrict access
3. **Validate JWT tokens** for authenticated requests
4. **Sanitize user input** to prevent SQL injection
5. **Use HTTPS only** for all requests
6. **Rotate API keys** regularly
7. **Monitor for suspicious activity**
8. **Implement rate limiting** on sensitive endpoints
9. **Use environment variables** for credentials
10. **Enable audit logging** for compliance

## Monitoring and Analytics

### Query Performance

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Connection Pool

```typescript
// Supabase automatically manages connection pooling
// Default settings:
// - Pool size: Based on plan (Free: 60, Pro: 100+)
// - Timeout: 15 seconds
// - Idle timeout: 10 minutes
```

## Migration Strategy

### From Nostr to Supabase

1. **Fetch events** from Nostr relay
2. **Transform data** to match Supabase schema
3. **Batch insert** into Supabase tables
4. **Validate** data integrity
5. **Create indexes** for performance

```typescript
async function migrateProfile(nostrEvent: NostrEvent) {
  const profile = JSON.parse(nostrEvent.content);

  const { error } = await supabase
    .from('profiles')
    .upsert({
      pubkey: nostrEvent.pubkey,
      display_name: profile.display_name || profile.name,
      about: profile.about,
      picture: profile.picture,
      banner: profile.banner,
      nip05: profile.nip05,
      lud16: profile.lud16
    }, {
      onConflict: 'pubkey'
    });

  if (error) {
    console.error('Migration error:', error);
  }
}
```

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgREST API](https://postgrest.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
