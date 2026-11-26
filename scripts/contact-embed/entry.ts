// Browser entry for the standalone contact embed used by the sibling static
// sites (VisionFlow's marketing page, narrativegoldmine.com). It re-exports the
// real transport from src/lib/nostr.ts — NIP-17 wrap, NIP-42 AUTH retry, relay
// OK gating, monitor copy — so the static sites never carry a hand-port of it.
// Built by scripts/contact-embed/build.mjs.
import {
  buildEnquiryRumor,
  generateEphemeralIdentity,
  publishGiftWrap,
  publishMonitorCopy,
  wrapDm,
} from "../../src/lib/nostr";

// Live v2 forum relay and admin recipient (cutover 2026-11-26). CI checks both
// against forum-config/dreamlab.toml (scripts/check-config-mirrors.mjs); a change
// here only reaches the sibling sites once they re-vendor the build.
const RELAY_URL = "wss://dreamlab-nostr-relay-v2.solitary-paper-764d.workers.dev";
const ADMIN_PUBKEY = "bfcf20d472f0fb143b23cb5be3fa0a040d42176b71f73ca272f6912b1d62a452";
const MONITOR_PUBKEY = "4ed429aa7f30d6e63c41be50685cffeb03cd7b07e37d37a0c4ae5321e642aad7";

export interface SendEnquiryParams {
  name: string;
  email: string;
  message: string;
  /** Short label of what the visitor is asking about, e.g. "VisionFlow". */
  topic: string;
  /** Provenance tag the nightly inbox watch groups by, e.g. "visionflow_contact_form". */
  source: string;
  relayUrl?: string;
  adminPubkey?: string;
  monitorPubkey?: string;
}

/**
 * Send one enquiry as an anonymous, end-to-end-encrypted gift-wrapped DM to the
 * operator. Resolves `{ ok: true }` only on the relay's OK-true; never rejects.
 */
export async function sendEnquiry(p: SendEnquiryParams): Promise<{ ok: boolean; message: string }> {
  const relay = p.relayUrl ?? RELAY_URL;
  const admin = p.adminPubkey ?? ADMIN_PUBKEY;
  const monitor = p.monitorPubkey ?? MONITOR_PUBKEY;
  try {
    const identity = generateEphemeralIdentity();
    const rumor = buildEnquiryRumor({
      name: p.name,
      email: p.email,
      engagementType: p.topic,
      message: p.message,
      hasConsent: true,
      source: p.source,
      pageUrl: window.location.href,
    });
    const subject = `${p.topic} website enquiry`;
    const wrap = wrapDm(rumor.content, identity.sk, admin, subject);
    const result = await publishGiftWrap(relay, wrap, { authSk: identity.sk });
    if (!result.ok) return { ok: false, message: "Relay rejected the message." };
    void publishMonitorCopy(relay, rumor.content, identity.sk, monitor, admin, subject);
    return { ok: true, message: "Sent." };
  } catch {
    return { ok: false, message: "Could not send the message." };
  }
}
