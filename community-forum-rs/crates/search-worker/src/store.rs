//! In-memory vector store with RVF binary format persistence.
//!
//! Stores 384-dim f32 vectors with u64 labels in memory. Persists to R2 as
//! RVF-format segments (SegmentHeader + payload) and id↔label mapping to KV.
//!
//! RVF layout on R2:
//!   [SegmentHeader(Vec, 0)] [f32 vectors packed: label_u64 + dim*f32 each]
//!   [SegmentHeader(Meta, 1)] [JSON id↔label mapping]

use rvf_types::constants::{SEGMENT_HEADER_SIZE, SEGMENT_MAGIC, SEGMENT_VERSION};
use rvf_types::segment::SegmentHeader;
use rvf_types::segment_type::SegmentType;

use crate::embed::DIM;

/// Bytes per stored vector entry: u64 label + DIM * f32.
const ENTRY_SIZE: usize = 8 + DIM * 4; // 1544 bytes

/// In-memory vector store.
pub struct VectorStore {
    /// Packed storage: (label, embedding).
    entries: Vec<(u64, [f32; DIM])>,
}

impl VectorStore {
    /// Create an empty store.
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    /// Number of vectors in the store.
    pub fn count(&self) -> usize {
        self.entries.len()
    }

    /// Insert a vector with the given label. Replaces if label exists.
    pub fn insert(&mut self, label: u64, embedding: &[f32]) {
        debug_assert_eq!(embedding.len(), DIM);
        let mut arr = [0.0f32; DIM];
        arr.copy_from_slice(embedding);

        // Replace existing
        if let Some(entry) = self.entries.iter_mut().find(|(l, _)| *l == label) {
            entry.1 = arr;
            return;
        }
        self.entries.push((label, arr));
    }

    /// Delete vectors by labels. Returns count deleted.
    pub fn delete(&mut self, labels: &[u64]) -> usize {
        let before = self.entries.len();
        self.entries.retain(|(l, _)| !labels.contains(l));
        before - self.entries.len()
    }

    /// Cosine similarity k-NN search. Returns (label, score) pairs sorted by
    /// descending score (1.0 = identical, 0.0 = orthogonal).
    pub fn search(&self, query: &[f32], k: usize, min_score: f32) -> Vec<(u64, f32)> {
        if self.entries.is_empty() || query.len() != DIM {
            return Vec::new();
        }

        let mut results: Vec<(u64, f32)> = self
            .entries
            .iter()
            .map(|(label, vec)| {
                let score = cosine_similarity(query, vec);
                (*label, score)
            })
            .filter(|(_, score)| *score >= min_score)
            .collect();

        // Sort descending by score
        results.sort_unstable_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(k);
        results
    }

    /// Serialize to RVF binary format.
    ///
    /// Layout: Vec segment (vectors) + Meta segment (JSON mapping placeholder).
    /// The Meta segment contains a version tag; actual id↔label mapping goes to KV.
    pub fn to_rvf_bytes(&self) -> Vec<u8> {
        // Vec segment payload: packed entries [u64 label][f32 * DIM] each
        let vec_payload_len = self.entries.len() * ENTRY_SIZE;
        let meta_json = serde_json::json!({
            "format": "rvf-wasm-v1",
            "dimensions": DIM,
            "count": self.entries.len(),
            "metric": "cosine",
        });
        let meta_bytes = serde_json::to_vec(&meta_json).unwrap_or_default();

        // Total: 2 headers + vec payload + meta payload (aligned to 64 bytes)
        let vec_seg_padded = align64(vec_payload_len);
        let meta_seg_padded = align64(meta_bytes.len());
        let total = SEGMENT_HEADER_SIZE + vec_seg_padded + SEGMENT_HEADER_SIZE + meta_seg_padded;
        let mut buf = vec![0u8; total];

        // --- Vec segment header ---
        let now_ns = (js_sys::Date::now() * 1_000_000.0) as u64;
        let vec_hdr = SegmentHeader {
            magic: SEGMENT_MAGIC,
            version: SEGMENT_VERSION,
            seg_type: SegmentType::Vec as u8,
            flags: 0,
            segment_id: 0,
            payload_length: vec_payload_len as u64,
            timestamp_ns: now_ns,
            checksum_algo: 0,
            compression: 0,
            reserved_0: 0,
            reserved_1: 0,
            content_hash: [0u8; 16],
            uncompressed_len: 0,
            alignment_pad: 0,
        };
        write_header(&mut buf[..SEGMENT_HEADER_SIZE], &vec_hdr);

        // --- Vec segment payload ---
        let payload_start = SEGMENT_HEADER_SIZE;
        for (i, (label, emb)) in self.entries.iter().enumerate() {
            let offset = payload_start + i * ENTRY_SIZE;
            buf[offset..offset + 8].copy_from_slice(&label.to_le_bytes());
            for (j, val) in emb.iter().enumerate() {
                let fo = offset + 8 + j * 4;
                buf[fo..fo + 4].copy_from_slice(&val.to_le_bytes());
            }
        }

        // --- Meta segment header ---
        let meta_hdr_start = SEGMENT_HEADER_SIZE + vec_seg_padded;
        let meta_hdr = SegmentHeader {
            magic: SEGMENT_MAGIC,
            version: SEGMENT_VERSION,
            seg_type: SegmentType::Meta as u8,
            flags: 0,
            segment_id: 1,
            payload_length: meta_bytes.len() as u64,
            timestamp_ns: now_ns,
            checksum_algo: 0,
            compression: 0,
            reserved_0: 0,
            reserved_1: 0,
            content_hash: [0u8; 16],
            uncompressed_len: 0,
            alignment_pad: 0,
        };
        write_header(&mut buf[meta_hdr_start..meta_hdr_start + SEGMENT_HEADER_SIZE], &meta_hdr);

        // --- Meta segment payload ---
        let meta_payload_start = meta_hdr_start + SEGMENT_HEADER_SIZE;
        buf[meta_payload_start..meta_payload_start + meta_bytes.len()].copy_from_slice(&meta_bytes);

        buf
    }

    /// Deserialize from RVF binary format. Returns None on invalid data.
    pub fn from_rvf_bytes(data: &[u8]) -> Option<Self> {
        let mut store = Self::new();
        let mut offset = 0;

        while offset + SEGMENT_HEADER_SIZE <= data.len() {
            let hdr = read_header(&data[offset..offset + SEGMENT_HEADER_SIZE])?;
            if !hdr.is_valid_magic() {
                break;
            }

            let payload_start = offset + SEGMENT_HEADER_SIZE;
            let payload_len = hdr.payload_length as usize;
            if payload_start + payload_len > data.len() {
                break;
            }

            let payload = &data[payload_start..payload_start + payload_len];

            if hdr.seg_type == SegmentType::Vec as u8 {
                // Parse packed vector entries
                let mut pos = 0;
                while pos + ENTRY_SIZE <= payload.len() {
                    let label = u64::from_le_bytes(payload[pos..pos + 8].try_into().ok()?);
                    let mut emb = [0.0f32; DIM];
                    for j in 0..DIM {
                        let fo = pos + 8 + j * 4;
                        emb[j] = f32::from_le_bytes(payload[fo..fo + 4].try_into().ok()?);
                    }
                    store.entries.push((label, emb));
                    pos += ENTRY_SIZE;
                }
            }
            // Skip Meta and other segment types (we read mapping from KV)

            // Advance to next segment (aligned to 64 bytes)
            offset = payload_start + align64(payload_len);
        }

        Some(store)
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Cosine similarity between two vectors.
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;
    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }
    let denom = norm_a.sqrt() * norm_b.sqrt();
    if denom == 0.0 {
        0.0
    } else {
        dot / denom
    }
}

/// Round up to next 64-byte boundary.
const fn align64(size: usize) -> usize {
    (size + 63) & !63
}

/// Write a SegmentHeader to a byte buffer (little-endian, matching repr(C) layout).
fn write_header(buf: &mut [u8], hdr: &SegmentHeader) {
    // Safety: SegmentHeader is repr(C) and 64 bytes. We write field by field
    // for portability (no reliance on alignment assumptions in WASM).
    buf[0..4].copy_from_slice(&hdr.magic.to_le_bytes());
    buf[4] = hdr.version;
    buf[5] = hdr.seg_type;
    buf[6..8].copy_from_slice(&hdr.flags.to_le_bytes());
    buf[8..16].copy_from_slice(&hdr.segment_id.to_le_bytes());
    buf[16..24].copy_from_slice(&hdr.payload_length.to_le_bytes());
    buf[24..32].copy_from_slice(&hdr.timestamp_ns.to_le_bytes());
    buf[32] = hdr.checksum_algo;
    buf[33] = hdr.compression;
    buf[34..36].copy_from_slice(&hdr.reserved_0.to_le_bytes());
    buf[36..40].copy_from_slice(&hdr.reserved_1.to_le_bytes());
    buf[40..56].copy_from_slice(&hdr.content_hash);
    buf[56..60].copy_from_slice(&hdr.uncompressed_len.to_le_bytes());
    buf[60..64].copy_from_slice(&hdr.alignment_pad.to_le_bytes());
}

/// Read a SegmentHeader from a byte buffer.
fn read_header(buf: &[u8]) -> Option<SegmentHeader> {
    if buf.len() < SEGMENT_HEADER_SIZE {
        return None;
    }
    Some(SegmentHeader {
        magic: u32::from_le_bytes(buf[0..4].try_into().ok()?),
        version: buf[4],
        seg_type: buf[5],
        flags: u16::from_le_bytes(buf[6..8].try_into().ok()?),
        segment_id: u64::from_le_bytes(buf[8..16].try_into().ok()?),
        payload_length: u64::from_le_bytes(buf[16..24].try_into().ok()?),
        timestamp_ns: u64::from_le_bytes(buf[24..32].try_into().ok()?),
        checksum_algo: buf[32],
        compression: buf[33],
        reserved_0: u16::from_le_bytes(buf[34..36].try_into().ok()?),
        reserved_1: u32::from_le_bytes(buf[36..40].try_into().ok()?),
        content_hash: buf[40..56].try_into().ok()?,
        uncompressed_len: u32::from_le_bytes(buf[56..60].try_into().ok()?),
        alignment_pad: u32::from_le_bytes(buf[60..64].try_into().ok()?),
    })
}
