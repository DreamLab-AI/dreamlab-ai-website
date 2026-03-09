# ADR-022: NIP-29 Group-Based Access Control Model

[Back to ADR Index](README.md) | [Back to Documentation Index](../README.md)

| Field     | Value                                     |
|-----------|-------------------------------------------|
| Status    | Accepted                                  |
| Date      | 2026-03-09                                |
| Deciders  | DreamLab Engineering                      |
| Related   | PRD v4.0.0, ADR-016, ADR-012              |

## Context

The SvelteKit forum implements a 4-zone BBS access model with cohort-based
gating. The Rust forum has basic whitelist + cohort assignment but no client-side
enforcement of zone visibility or NIP-29 relay-side group management.

## Decision

Implement NIP-29 group protocol for relay-side access enforcement, with a
client-side zone model that maps cohorts to visibility tiers.

### Zone Model
| Zone | Visibility | Auth Required | Cohort Required | NIP-29 Kind |
|------|-----------|---------------|-----------------|-------------|
| 0 | Public | No | No | — (NIP-01) |
| 1 | Registered | Yes (whitelist) | No | 39000 (open) |
| 2 | Cohort | Yes | Yes | 39000 (closed) |
| 3 | Private | Yes | Invite-only | 39000 (closed) |

### NIP-29 Event Kinds
| Kind | Purpose | Direction |
|------|---------|-----------|
| 9 | Group chat message | Client → Relay |
| 9000 | Add user to group | Admin → Relay |
| 9001 | Remove user from group | Admin → Relay |
| 9005 | Delete event in group | Admin → Relay |
| 9021 | Join request | Client → Relay |
| 9024 | Registration request | Client → Relay |
| 39000 | Group metadata | Relay → Client |
| 39002 | Group members | Relay → Client |

### Client-Side Enforcement
```rust
pub struct ZoneAccess {
    user_cohorts: Vec<String>,
    is_whitelisted: bool,
}

impl ZoneAccess {
    pub fn can_access(&self, zone: u8, required_cohort: Option<&str>) -> bool {
        match zone {
            0 => true,
            1 => self.is_whitelisted,
            2 => required_cohort.map_or(false, |c| self.user_cohorts.contains(&c.to_string())),
            3 => required_cohort.map_or(false, |c| self.user_cohorts.contains(&c.to_string())),
            _ => false,
        }
    }
}
```

## Consequences

### Positive
- Relay-enforced access prevents unauthorized reads
- Consistent with Nostr ecosystem standards
- Admin can manage groups via standard NIP-29 tooling
- Zone model maps cleanly to existing cohort system

### Negative
- NIP-29 requires relay-side implementation (relay-worker update)
- Dual enforcement (client + relay) increases complexity
- Group metadata events add subscription overhead

### Mitigations
- Relay-worker already has whitelist/cohort tables — extend, don't replace
- Client-side enforcement is a UX optimization, relay is source of truth
- Cache group metadata locally to reduce subscription churn
