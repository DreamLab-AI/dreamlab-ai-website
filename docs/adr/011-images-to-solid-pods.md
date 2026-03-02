---
title: "ADR-011: Images and Media Storage in Solid Pods"
description: "Decision to store user-uploaded images and media in per-user Solid pods on R2 via pod-api Worker"
category: reference
tags: [adr, images, media, solid-pods, r2, cloudflare, workers]
difficulty: intermediate
last-updated: 2026-03-02
---

# ADR-011: Images and Media Storage in Solid Pods

## Status

Accepted

## Date

2026-03-02

## Context

DreamLab's image upload system previously relied on a GCP Cloud Run `image-api` service that stored files in a Google Cloud Storage (GCS) bucket (`minimoonoir-images`). This required:

- A separate Docker container running Express + Sharp for image processing
- GCS bucket with public-read ACL for serving images
- `VITE_IMAGE_API_URL` and `VITE_IMAGE_BUCKET` environment variables
- A GCP service account with `storage.objectViewer` role

With the Zero-GCP migration (ADR-010), all infrastructure is moving to Cloudflare Workers. The `pod-api` Worker already provides per-user Solid pod storage on R2 with NIP-98 authentication and WAC-based access control. Images are a natural fit for pod storage.

## Decision

Store all user-uploaded images and media in per-user Solid pods via the existing `pod-api` Worker, eliminating the need for a dedicated image service.

### Storage layout

```
pods/{pubkey}/
  media/
    public/          # Public images (forum posts, avatars)
      {uuid}.jpg
      {uuid}_thumb.jpg
    private/         # Encrypted images (DMs, private channels)
      {uuid}.enc
  profile/
    card             # JSON-LD profile document
```

### Access control

- `./media/public/` has a public-read ACL rule (`#media-public` in the pod's WAC document), allowing anyone to fetch images without authentication
- `./media/private/` requires NIP-98 authentication and WAC authorization (owner-only by default)
- Image uploads always require NIP-98 authentication (PUT to pod-api)

### Client-side processing

Image compression, resizing, and thumbnail generation remain client-side using Canvas API:
- Max dimension: 1920px (400px for avatars)
- JPEG quality: 0.85 (0.9 for avatars)
- Thumbnails: 200x200 center-cropped squares
- Client-side AES-256-GCM encryption for private channels/DMs

### Upload flow

```
1. Client compresses image via Canvas API
2. Client generates UUID for imageId
3. Client creates NIP-98 auth header for PUT URL
4. PUT blob to pod-api /pods/{pubkey}/media/public/{uuid}.jpg
5. (Optional) PUT thumbnail to /pods/{pubkey}/media/public/{uuid}_thumb.jpg
6. Return public URL: https://pods.dreamlab-ai.com/{pubkey}/media/public/{uuid}.jpg
```

## Consequences

### Positive

- **Zero additional services**: no image-api container, no GCS bucket
- **Per-user ownership**: images live in the user's pod, enabling data portability
- **Consistent auth**: NIP-98 for all mutations, WAC for access control
- **R2 durability**: 99.999999999% durability, same as GCS
- **Edge-served**: R2 serves directly from Cloudflare's edge network
- **Cost reduction**: R2 free tier includes 10GB storage + 10M reads/month

### Negative

- **No server-side transforms**: Sharp-based resizing no longer available; client must compress before upload
- **50MB limit**: pod-api enforces Content-Length limit (sufficient for compressed images)
- **No CDN cache headers**: images served directly from R2 without custom cache-control (pod-api could add this later)

### Neutral

- Client-side compression was already the primary path; server-side Sharp was a fallback
- Encrypted image flow unchanged (client encrypts, uploads opaque blob)

## References

- ADR-010: Return to Cloudflare Platform
- `workers/pod-api/index.ts`: Pod storage Worker
- `workers/auth-api/index.ts`: Pod provisioning with media ACL
- `community-forum/src/lib/utils/imageUpload.ts`: Client upload logic
