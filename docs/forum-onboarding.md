# Forum Onboarding & Agent Operations (DreamLab overlay)

**Last updated:** 2026-06-11 | [Back to Documentation Index](README.md)

DreamLab AI runs the [nostr-rust-forum](https://github.com/DreamLab-AI/nostr-rust-forum)
kit with the `forum-config/` operator overlay. This note records three upstream
kit capabilities that changed signup and agent operations for the DreamLab
deployment as of the June 2026 kit wave. It is operator-facing; the normative
detail lives in the kit ADRs linked below.

---

## Signup now issues a recovery / device-onboarding sheet (ADR-095)

New members no longer leave signup with only a plain `nsec` text download. The
client now renders a **recovery & device-onboarding sheet** — a printable,
one-page layout with QR codes for the secret key (`nsec`), public identity
(`npub`), and the DreamLab relay URL, plus restore steps and an optional relay
"sweep" block. A **Download / Print sheet** button saves it as a PDF.

Operator-relevant properties:

- **100% client-side.** The sheet is generated in-browser (QR codes in WASM, no
  JS QR dependency); the secret key never leaves the browser or touches our
  Workers. No server round-trip ever sees the `nsec`.
- **Insist-with-override gate.** The signup exit control is disabled until the
  user prints the sheet *and* confirms they saved it, with an explicit
  "advanced" override link. Members can be guided to keep the printed sheet as
  cold storage.
- **Mobile on-ramp is 0xchat.** The `nsec` QR is the 0xchat login payload
  (NIP-17 DMs, NIP-28 channels, NIP-42 AUTH); the DreamLab relay is added
  separately from the relay QR. This is the recommended phone path for
  DreamLab members.

ncryptsec (NIP-49 passphrase-encrypted key) is deferred upstream; the printed
`nsec` is plaintext, same threat model as the prior backup card.

Reference: [nostr-rust-forum ADR-095](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-095-recovery-device-onboarding-sheet.md).

## Agent provisioning is now a single kit endpoint (ADR-097)

Bringing a DreamLab agent/bot identity online is now **one** admin call instead
of a four-step seed script:

```
POST /api/governance/agents/provision        (NIP-98 admin, auth-worker)
{ "pubkey": "<64-hex>", "name": "scribe-bot",
  "cohorts": ["ai-agents", "members"], "rate_limit_per_min": 60 }
→ 200 { "pubkey": "<64-hex>", "cohorts": [...], "registered": true }
```

The endpoint performs the whitelist (cohort) write and the `agent_registry`
write **atomically** in one D1 batch — no more partial-provisioning windows
where an agent is whitelisted but unregistered (or vice versa) and no bespoke
retry glue per deployment. It is idempotent on `pubkey`, so re-provisioning is a
safe way to update an agent's cohorts or rate limit. The granular
`/api/whitelist/add` and `/api/governance/agents/register` routes still work for
callers that want them.

The endpoint never receives the agent private key: key material (commonly an
[ADR-094](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-094-deterministic-subkey-derivation.md)
derived subkey) and the agent's own kind-0 profile + NIP-65 relay list stay
client-side, signed by the agent key.

Reference: [nostr-rust-forum ADR-097](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-097-agent-identity-provisioning.md).

## Pod delegation is now a kit endpoint with correct container ACLs (ADR-096)

Granting an agent (or another member) access to a pod container is now a
first-class, opt-in `PUT` against the container's `.acl` sidecar:

```
PUT /pods/<owner>/<container>/.acl        (NIP-98; Control on parent required)
Content-Type: application/json
{ "@delegation": { "agent": "did:nostr:<hex>",
                   "modes": ["acl:Read", "acl:Write"] } }
```

The pod-worker resolves the correct **per-container** sidecar `<dir>/.acl`
(previously unreachable — the flat `agent.acl` workaround DreamLab deployments
used is now retired; both forms still resolve, so migration is non-breaking).
The emitted document always re-asserts the owner's full Control (the owner can
never lock themselves out, even on an empty grant), and `acl:Control` is never
delegated to the grantee.

Reference: [nostr-rust-forum ADR-096](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-096-acl-container-resolution-and-delegation.md).

## Related

- [Documentation Index](README.md)
- [Deployment Overview](deployment/README.md)
- [Native Pod Mesh](deployment/NATIVE_POD_MESH.md)
- [Forum Config: Governance](../forum-config/README.md#governance-configuration)
