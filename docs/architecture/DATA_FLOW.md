# Data Flow Architecture - DreamLab AI

**Last Updated**: 2026-01-25
**Status**: Production

## Overview

This document describes how data flows through the DreamLab AI system, from user interactions to backend services and back to the user interface.

---

## System Data Flow

### High-Level Data Movement

```mermaid
flowchart TB
    subgraph User["User Layer"]
        Browser["Web Browser"]
    end

    subgraph Frontend["Frontend Layer (GitHub Pages)"]
        React["React Application"]
        StaticData["Static JSON/Markdown"]
    end

    subgraph Backend["Backend Layer"]
        Supabase["Supabase<br/>Database/Auth"]
        Relay["Nostr Relay<br/>WebSocket"]
        EmbedAPI["Embedding API"]
        ImageAPI["Image API"]
    end

    subgraph Storage["Storage Layer"]
        CloudSQL["Cloud SQL<br/>PostgreSQL"]
        CloudStorage["Cloud Storage<br/>Media/Vectors"]
        SupabaseDB["Supabase DB<br/>PostgreSQL"]
    end

    Browser -->|HTTP GET| React
    React -->|Fetch| StaticData
    React -->|HTTPS| Supabase
    React -->|WSS| Relay
    React -->|HTTPS| EmbedAPI
    React -->|HTTPS| ImageAPI

    Supabase --> SupabaseDB
    Relay --> CloudSQL
    EmbedAPI --> CloudStorage
    ImageAPI --> CloudStorage
```

---

## 1. Page Load Flow (Main Site)

### Initial Page Request

```mermaid
sequenceDiagram
    participant B as Browser
    participant CDN as GitHub Pages CDN
    participant React as React App
    participant Static as Static Assets

    Note over B: User navigates to dreamlab-ai.com
    B->>CDN: 1. GET /
    CDN->>B: 2. Return index.html (5 KB)

    Note over B: Parse HTML, discover resources
    B->>CDN: 3. GET /assets/main.js
    B->>CDN: 4. GET /assets/vendor.js
    B->>CDN: 5. GET /assets/ui.js
    B->>CDN: 6. GET /assets/three.js

    CDN->>B: 7. Return JS bundles (300 KB total, gzipped)

    Note over B: Execute React, hydrate DOM
    React->>Static: 8. GET /workshops.json
    Static->>React: 9. Return workshop data

    React->>B: 10. Render final page

    Note over B: FCP: ~1.5s, LCP: ~2.1s, TTI: ~3.2s
```

**Performance Characteristics**:

| Metric | Time | Description |
|--------|------|-------------|
| **TTFB** | ~100ms | GitHub Pages CDN response |
| **FCP** | ~1.5s | First Contentful Paint |
| **LCP** | ~2.1s | Largest Contentful Paint (hero image) |
| **TTI** | ~3.2s | Time to Interactive (React hydrated) |

---

## 2. Workshop Page Data Flow

### Dynamic Route Loading

```mermaid
sequenceDiagram
    participant U as User
    participant Router as React Router
    participant Lazy as Lazy Component
    participant API as Workshop API
    participant CDN as GitHub Pages

    U->>Router: 1. Click "View Workshop"
    Router->>Router: 2. Match route /workshops/:id
    Router->>Lazy: 3. Trigger lazy import

    Note over Lazy: Dynamic import() for WorkshopPage.tsx
    Lazy->>CDN: 4. GET /assets/WorkshopPage.js
    CDN->>Lazy: 5. Return component bundle

    Lazy->>API: 6. GET /workshops.json
    API->>Lazy: 7. Return workshop catalog

    Note over Lazy: Filter by workshopId
    Lazy->>U: 8. Render workshop page

    Note over U: Page ready in ~800ms (route prefetched)
```

**Data Structure**:

```json
// /workshops.json
[
  {
    "id": "ai-agent-masterclass",
    "title": "AI Agent Masterclass",
    "description": "2-day residential training...",
    "duration": "2 days",
    "price": "£4,500",
    "pages": [
      {
        "slug": "overview",
        "title": "Course Overview",
        "content": "..."
      },
      {
        "slug": "curriculum",
        "title": "Curriculum",
        "content": "..."
      }
    ]
  }
]
```

---

## 3. Team Page Data Flow

### Team Member Loading

```mermaid
sequenceDiagram
    participant U as User
    participant Team as Team.tsx
    participant Manifest as /data/team/manifest.json
    participant Profiles as /data/team/{id}.md
    participant Images as /data/team/{id}.webp

    U->>Team: 1. Navigate to /team
    Team->>Manifest: 2. GET /data/team/manifest.json
    Manifest->>Team: 3. Return team IDs [01, 02, ..., 44]

    Note over Team: For each ID in manifest
    loop For each team member
        Team->>Profiles: 4. GET /data/team/{id}.md
        Profiles->>Team: 5. Return markdown content
        Team->>Images: 6. GET /data/team/{id}.webp
        Images->>Team: 7. Return profile image
    end

    Team->>U: 8. Render team grid

    Note over U: Progressive loading<br/>First 6 members: ~2s<br/>All 44 members: ~5s
```

**Optimization Strategy**:

1. **Virtual scrolling**: Only render visible members
2. **Lazy loading**: Load images on scroll
3. **Batch requests**: Request 6 profiles at a time
4. **Image optimization**: WebP format (30% smaller)

**Data Flow**:

```
manifest.json (5 KB)
  → team IDs [01, 02, 03, ...]
  → Parallel fetch:
     - 01.md (2 KB) + 01.webp (20 KB)
     - 02.md (3 KB) + 02.webp (18 KB)
     - ...
```

---

## 4. Contact Form Submission Flow

### Form Data to Supabase

```mermaid
sequenceDiagram
    participant U as User
    participant Form as Contact Form
    participant Zod as Zod Validator
    participant Supabase as Supabase Client
    participant DB as Supabase DB

    U->>Form: 1. Fill form fields
    U->>Form: 2. Click "Submit"

    Form->>Zod: 3. Validate form data

    alt Validation fails
        Zod->>Form: 4a. Return errors
        Form->>U: 5a. Show validation errors
    else Validation passes
        Zod->>Supabase: 4b. Valid data
        Supabase->>DB: 5b. INSERT into contact_forms

        Note over DB: Row Level Security check<br/>Public can insert

        DB->>Supabase: 6b. Success + row data
        Supabase->>Form: 7b. Return inserted data
        Form->>U: 8b. Show success message

        Note over Form: Optional: Send email notification
    end
```

**Form Validation (Zod Schema)**:

```typescript
import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  selected_team_members: z.array(z.string()).optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;
```

**Supabase Insertion**:

```typescript
async function submitContactForm(data: ContactFormData) {
  const validated = contactFormSchema.parse(data);

  const { data: result, error } = await supabase
    .from('contact_forms')
    .insert({
      name: validated.name,
      email: validated.email,
      company: validated.company,
      message: validated.message,
      selected_team_members: validated.selected_team_members,
      status: 'pending',
    })
    .select();

  if (error) throw error;
  return result;
}
```

---

## 5. Community Forum Message Flow (Nostr)

### Real-Time Messaging

```mermaid
sequenceDiagram
    participant U as User
    participant App as Forum App
    participant NDK as NDK Library
    participant Relay as Nostr Relay
    participant DB as Cloud SQL
    participant SUB as Subscribers

    Note over U,SUB: Message Publishing Flow

    U->>App: 1. Type message
    App->>NDK: 2. Create event (kind 9)

    Note over NDK: Build event object<br/>- Add channel tag<br/>- Add timestamp<br/>- Sign with privkey

    NDK->>Relay: 3. ["EVENT", {event}]

    Note over Relay: NIP-42 Authentication
    Relay->>Relay: 4. Verify signature
    Relay->>DB: 5. Check pubkey whitelist
    DB->>Relay: 6. Return auth status

    alt Unauthorized
        Relay->>NDK: 7a. ["NOTICE", "Not authorized"]
        NDK->>App: 8a. Show error
    else Authorized
        Relay->>DB: 7b. INSERT into events
        DB->>Relay: 8b. Success

        Relay->>SUB: 9b. Broadcast to subscribers
        SUB->>SUB: 10b. Render message

        Relay->>NDK: 11b. ["OK", event_id, true]
        NDK->>App: 12b. Message confirmed
        App->>U: 13b. Show checkmark
    end
```

**Event Structure**:

```json
{
  "id": "abc123...",
  "pubkey": "user_pubkey_hex",
  "created_at": 1706112000,
  "kind": 9,
  "tags": [
    ["h", "channel_id"],
    ["p", "mentioned_pubkey"]
  ],
  "content": "Hello, world!",
  "sig": "signature_hex"
}
```

---

## 6. Semantic Search Flow (Embedding API)

### Vector-Based Search

```mermaid
sequenceDiagram
    participant U as User
    participant Search as Search Component
    participant Embed as Embedding API
    participant Storage as Cloud Storage
    participant DB as Cloud SQL

    U->>Search: 1. Enter search query
    Search->>Embed: 2. POST /embed {"texts": ["query"]}

    Embed->>Embed: 3. Load model (cached)
    Embed->>Embed: 4. Generate 384-dim vector

    Embed->>Search: 5. Return embedding [0.123, -0.456, ...]

    Search->>DB: 6. SELECT * FROM events<br/>ORDER BY embedding <-> query_vector<br/>LIMIT 10

    Note over DB: pgvector extension<br/>Cosine similarity search

    DB->>Search: 7. Return top 10 similar messages
    Search->>U: 8. Display search results

    Note over U: Latency: ~300ms total
```

**Implementation**:

```typescript
async function semanticSearch(query: string) {
  // 1. Generate embedding for query
  const response = await fetch('https://embed.dreamlab-ai.com/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [query] }),
  });
  const { embeddings } = await response.json();
  const queryVector = embeddings[0];

  // 2. Search database with pgvector
  const { data } = await supabase.rpc('search_messages', {
    query_embedding: queryVector,
    similarity_threshold: 0.7,
    limit: 10,
  });

  return data;
}
```

**PostgreSQL Function**:

```sql
CREATE FUNCTION search_messages(
  query_embedding vector(384),
  similarity_threshold float,
  limit int
)
RETURNS TABLE (
  id text,
  content text,
  similarity float
)
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM events
  WHERE 1 - (embedding <=> query_embedding) > similarity_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT limit;
$$ LANGUAGE SQL;
```

---

## 7. Image Upload Flow (Image API)

### Media Processing Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant App as Forum App
    participant API as Image API
    participant Sharp as Image Processor
    participant Crypto as Encryption
    participant Storage as Cloud Storage

    U->>App: 1. Select image file
    App->>API: 2. POST /upload<br/>(multipart/form-data)

    API->>Sharp: 3. Resize to 1200x1200
    Sharp->>API: 4. Return optimized JPEG

    API->>Crypto: 5. Encrypt with AES-256-GCM
    Crypto->>API: 6. Return encrypted blob

    API->>Storage: 7. Upload to GCS bucket
    Storage->>API: 8. Return object URL

    API->>App: 9. {image_id, url, encrypted: true}
    App->>U: 10. Display uploaded image

    Note over U: Total time: ~800ms<br/>(2 MB image → 150 KB optimized)
```

**Size Optimization**:

| Original | Resized | Encrypted | Final Size |
|----------|---------|-----------|------------|
| 2 MB PNG | 1200x1200 | AES-256-GCM | 150 KB |
| 5 MB JPG | 1200x1200 | AES-256-GCM | 180 KB |
| 10 MB HEIC | 1200x1200 | AES-256-GCM | 200 KB |

**Encryption Process**:

```javascript
function encryptImage(buffer, channelKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', channelKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Format: [IV (16) | AuthTag (16) | Encrypted Data]
  return Buffer.concat([iv, authTag, encrypted]);
}
```

---

## 8. Deployment Data Flow

### CI/CD Pipeline

```mermaid
flowchart TB
    Push["Push to main branch"] --> GHA["GitHub Actions<br/>Workflow Trigger"]

    GHA --> Checkout["Checkout code"]
    Checkout --> Install["npm install"]

    Install --> GenWorkshops["Generate workshops.json<br/>from /workshops-builder"]
    GenWorkshops --> BuildMain["Build main site<br/>npm run build"]
    BuildMain --> BuildCommunity["Build community app<br/>BASE_PATH=/community"]

    BuildCommunity --> Copy["Copy builds to dist/<br/>├── main site<br/>└── community/"]
    Copy --> Assets["Copy static assets<br/>├── team data<br/>└── media files"]

    Assets --> Deploy["Deploy to gh-pages<br/>peaceiris/actions-gh-pages"]
    Deploy --> CDN["GitHub Pages CDN<br/>Propagate globally"]

    CDN --> DNS["dreamlab-ai.com<br/>CNAME resolution"]
    DNS --> Live["Live site available"]

    Note over Push,Live: Total time: ~5 minutes
```

**Build Output Structure**:

```
dist/
├── index.html                  # Main site entry
├── assets/
│   ├── main-abc123.js         # App code (40 KB gzip)
│   ├── vendor-def456.js       # React, Router (120 KB gzip)
│   ├── three-ghi789.js        # Three.js (80 KB gzip)
│   ├── ui-jkl012.js           # Radix UI (60 KB gzip)
│   └── main-mno345.css        # Styles (10 KB gzip)
├── data/
│   ├── team/
│   │   ├── manifest.json
│   │   ├── 01.md
│   │   ├── 01.webp
│   │   └── ... (44 members)
│   ├── workshops.json
│   └── media/
│       └── videos/
└── community/                  # Fairfield forum app
    ├── index.html
    └── assets/
```

---

## 9. Error Handling Data Flow

### Error Propagation

```mermaid
flowchart TB
    Error["Error Occurs"] --> Type{Error Type?}

    Type -->|Network Error| NetworkHandler["Network Error Handler"]
    Type -->|Validation Error| ValidationHandler["Validation Error Handler"]
    Type -->|Authentication Error| AuthHandler["Auth Error Handler"]
    Type -->|Server Error| ServerHandler["Server Error Handler"]

    NetworkHandler --> Retry["Retry Logic<br/>Max 3 attempts"]
    Retry -->|Success| Success["Continue Flow"]
    Retry -->|Failure| Fallback["Fallback UI<br/>Offline mode"]

    ValidationHandler --> Form["Show Field Errors<br/>Red underlines + messages"]

    AuthHandler --> Redirect["Redirect to Login<br/>Clear session"]

    ServerHandler --> Log["Log to Console<br/>(Dev) / Sentry (Prod)"]
    Log --> Toast["Show Error Toast<br/>'Something went wrong'"]

    Toast --> ErrorBoundary["Error Boundary<br/>Fallback UI"]
```

**Error Handling Example**:

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status >= 500 && i < retries - 1) {
          // Server error, retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## 10. Caching Strategy

### Multi-Layer Caching

```mermaid
graph TB
    Request["User Request"] --> Browser["Browser Cache<br/>HTTP caching headers"]

    Browser -->|Cache Miss| CDN["GitHub Pages CDN<br/>Edge caching"]
    Browser -->|Cache Hit| BrowserServe["Serve from memory<br/>0ms latency"]

    CDN -->|Cache Miss| Origin["Origin Server<br/>GitHub Pages"]
    CDN -->|Cache Hit| CDNServe["Serve from edge<br/>~50ms latency"]

    Origin --> OriginServe["Generate response<br/>~100ms latency"]

    OriginServe --> ReactQuery["React Query Cache<br/>In-memory, 5-10 min stale time"]

    ReactQuery -->|Fresh| ReactServe["Serve from memory"]
    ReactQuery -->|Stale| Background["Background refetch<br/>Update cache"]
```

**Cache Headers** (set by GitHub Pages):

```
Cache-Control: public, max-age=3600        # 1 hour
ETag: "abc123"
Last-Modified: Thu, 25 Jan 2026 10:00:00 GMT
```

**React Query Configuration**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});
```

---

## 11. Performance Monitoring Data Flow

### Metrics Collection

```mermaid
sequenceDiagram
    participant Page as Web Page
    participant PerfAPI as Performance API
    participant Analytics as Analytics Service
    participant Monitor as Monitoring Dashboard

    Note over Page: Page load complete
    Page->>PerfAPI: 1. Get Web Vitals
    PerfAPI->>Page: 2. Return metrics<br/>(FCP, LCP, CLS, FID)

    Page->>Analytics: 3. Send metrics<br/>navigator.sendBeacon()

    Note over Analytics: Aggregate metrics
    Analytics->>Monitor: 4. Store in time-series DB

    Monitor->>Monitor: 5. Generate reports<br/>P50, P75, P90, P95

    Note over Monitor: Alert if:<br/>- LCP > 2.5s<br/>- CLS > 0.1<br/>- FID > 100ms
```

**Web Vitals Collection**:

```typescript
import { onLCP, onFID, onCLS } from 'web-vitals';

onLCP((metric) => {
  sendToAnalytics({
    name: 'LCP',
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    page: window.location.pathname,
  });
});

onFID((metric) => {
  sendToAnalytics({
    name: 'FID',
    value: metric.value,
    rating: metric.rating,
    page: window.location.pathname,
  });
});

onCLS((metric) => {
  sendToAnalytics({
    name: 'CLS',
    value: metric.value,
    rating: metric.rating,
    page: window.location.pathname,
  });
});
```

---

## Data Flow Summary

### Key Characteristics

| Flow Type | Latency | Caching | Optimization |
|-----------|---------|---------|--------------|
| **Page Load** | 1.5-3.2s | CDN + Browser | Code splitting, lazy loading |
| **Workshop Data** | 100-300ms | React Query 5min | Static JSON, prefetching |
| **Team Profiles** | 2-5s (44 members) | Browser cache | Virtual scrolling, lazy images |
| **Form Submission** | 200-500ms | None | Optimistic updates |
| **Real-Time Messages** | 50-150ms | None (real-time) | WebSocket, binary protocol |
| **Semantic Search** | 300-500ms | Vector index | Pre-computed embeddings |
| **Image Upload** | 800-2000ms | None | Progressive compression |

---

## Related Documentation

- [System Overview](SYSTEM_OVERVIEW.md) - High-level architecture
- [Frontend Architecture](FRONTEND_ARCHITECTURE.md) - React component patterns
- [Backend Services](BACKEND_SERVICES.md) - API and database architecture
- [Deployment Guide](DEPLOYMENT.md) - CI/CD pipeline details

---

**Document Owner**: Architecture Team
**Review Cycle**: Quarterly
**Last Review**: 2026-01-25
