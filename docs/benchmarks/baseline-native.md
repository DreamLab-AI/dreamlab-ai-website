# nostr-core Native Benchmark Baseline

**Date**: 2026-03-08
**Platform**: Linux 6.18.6-2-cachyos (x86_64)
**Profile**: release (optimized)
**Toolchain**: Rust stable
**Crate**: nostr-core v0.1.0

## NIP-44 Encryption/Decryption

| Benchmark | Payload | Time | Throughput |
|-----------|---------|------|------------|
| nip44_encrypt | 1 KB | 90.8–97.3 µs | 10.0–10.8 MiB/s |
| nip44_encrypt | 10 KB | 146.9 µs | 66.5 MiB/s |
| nip44_encrypt | 60 KB | 497.1 µs | 115.0 MiB/s |
| nip44_decrypt | 1 KB | 117.2–146.4 µs | 6.7–8.3 MiB/s |
| nip44_decrypt | 10 KB | 149.6–153.8 µs | 63.5–65.3 MiB/s |
| nip44_decrypt | 60 KB | 522.7–544.6 µs | 105.1–109.5 MiB/s |
| nip44_conversation_key | — | 65.8 µs | — |

## Key Operations

| Benchmark | Time |
|-----------|------|
| keys_generate_keypair | 250–278 µs |
| keys_derive_from_prf (HKDF) | 231.0 µs |
| keys_schnorr_sign | 235–249 µs |
| keys_schnorr_verify | 93.6–94.6 µs |
| keys_pubkey_hex | 237–259 µs |

## Event Operations

| Benchmark | Time |
|-----------|------|
| event_deserialize_1k (1000 events) | 694.5–708.7 µs |
| event_id_compute (SHA-256 canonical) | 1.96–2.07 µs |
| event_sign | 119.8–122.8 µs |
| event_verify | 96.2–101.2 µs |

## Key Observations

- **Signature verification (93.6 µs)** is ~2.5x faster than signing (235 µs), as expected for Schnorr BIP-340
- **ECDH conversation key (65.8 µs)** dominates NIP-44 encrypt/decrypt cost at small payloads
- **Event deserialization** is fast: ~0.7 µs per event (1000 events in 700 µs)
- **Event ID computation** is extremely fast at ~2 µs (SHA-256 of canonical JSON)
- **NIP-44 throughput** scales well: 10.4 MiB/s at 1KB → 115 MiB/s at 60KB (amortized ECDH)
- **HKDF PRF derivation (231 µs)** is dominated by the secp256k1 scalar multiplication for pubkey derivation

## Comparison Target

These native baselines will be compared against WASM performance in Tranche 1 to quantify the WASM overhead for each operation.
