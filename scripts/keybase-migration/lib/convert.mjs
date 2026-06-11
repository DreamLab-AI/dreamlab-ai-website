// Pure conversion logic: compacted keybase archives -> a publish plan.
// No I/O and no crypto here so it is unit-testable; signing happens at
// publish time in server.mjs (event ids stay deterministic because
// created_at/tags/content all derive from the keybase data).

// Relay max_message_length is 65536 for the whole event JSON; leave headroom.
const MAX_CONTENT = 60000;

// Apply edits, drop deleted messages (and reactions on/by deleted messages),
// return ascending-id message + reaction lists.
export function normalizeMessages(raw) {
  const byId = new Map();
  const edits = [];
  const deletes = new Set();
  const reactions = [];

  for (const m of raw || []) {
    switch (m.type) {
      case 'text':
        byId.set(m.id, { id: m.id, sentAt: m.sentAt, sender: m.sender, body: m.body ?? '', replyTo: m.replyTo ?? null });
        break;
      case 'attachment':
        byId.set(m.id, {
          id: m.id,
          sentAt: m.sentAt,
          sender: m.sender,
          body: `[attachment: ${m.filename || 'file'}]${m.title ? ' ' + m.title : ''}`,
          replyTo: null,
          attachment: true,
        });
        break;
      case 'edit':
        if (m.target != null) edits.push({ at: m.id, target: m.target, body: m.body ?? '' });
        break;
      case 'delete':
        for (const t of m.targets || []) deletes.add(t);
        break;
      case 'reaction':
        if (m.target != null) reactions.push({ id: m.id, target: m.target, body: m.body ?? '', sender: m.sender, sentAt: m.sentAt });
        break;
      default:
        break;
    }
  }

  edits.sort((a, b) => a.at - b.at);
  for (const e of edits) {
    const t = byId.get(e.target);
    if (t) t.body = e.body;
  }
  for (const d of deletes) byId.delete(d);

  const messages = [...byId.values()].sort((a, b) => a.id - b.id);
  const liveReactions = reactions
    .filter((r) => !deletes.has(r.id) && byId.has(r.target))
    .sort((a, b) => a.id - b.id);
  return { messages, reactions: liveReactions };
}

/**
 * Build the publish plan.
 * @param {object} args
 * @param {string} args.team               keybase team name
 * @param {Array}  args.channels           [{ topic, zone }] — selected channels
 * @param {object} args.archive            { topic: compactedMessages[] }
 * @param {object} args.identities         { username: { include, realName } }
 * @param {boolean} [args.includeReactions]
 */
export function buildPlan({ team, channels, archive, identities, includeReactions = true }) {
  const stats = {
    channels: 0,
    messages: 0,
    reactions: 0,
    profiles: 0,
    truncated: 0,
    skippedSenders: {}, // username -> dropped message count (sender not selected)
  };
  const planChannels = [];
  const planMessages = [];
  const planReactions = [];

  for (const ch of channels) {
    const raw = archive[ch.topic];
    if (!raw || !raw.length) continue;
    const { messages, reactions } = normalizeMessages(raw);
    if (!messages.length) continue;

    planChannels.push({
      topic: ch.topic,
      zone: ch.zone,
      name: ch.topic,
      about: `Migrated from Keybase ${team}#${ch.topic}`,
      // deterministic: just before the first message, so the channel-creation
      // event id is stable across re-runs (idempotent publishing)
      createdAt: messages[0].sentAt - 2,
    });
    stats.channels += 1;

    const kept = new Set();
    for (const m of messages) {
      if (!identities[m.sender]?.include) {
        stats.skippedSenders[m.sender] = (stats.skippedSenders[m.sender] || 0) + 1;
        continue;
      }
      let body = m.body;
      if (body.length > MAX_CONTENT) {
        body = body.slice(0, MAX_CONTENT) + '\n…[truncated during keybase migration]';
        stats.truncated += 1;
      }
      const kbKey = `${ch.topic}:${m.id}`;
      kept.add(m.id);
      planMessages.push({
        kbKey,
        topic: ch.topic,
        zone: ch.zone,
        sender: m.sender,
        createdAt: m.sentAt,
        body,
        replyTo: m.replyTo != null ? `${ch.topic}:${m.replyTo}` : null,
      });
      stats.messages += 1;
    }

    if (includeReactions) {
      for (const r of reactions) {
        if (!identities[r.sender]?.include || !kept.has(r.target)) continue;
        planReactions.push({
          kbKey: `${ch.topic}:r${r.id}`,
          topic: ch.topic,
          zone: ch.zone,
          sender: r.sender,
          createdAt: r.sentAt,
          body: r.body,
          target: `${ch.topic}:${r.target}`,
        });
        stats.reactions += 1;
      }
    }
  }

  const profiles = Object.entries(identities)
    .filter(([, v]) => v.include)
    .map(([username, v]) => ({ username, realName: v.realName || '' }));
  stats.profiles = profiles.length;

  return { team, channels: planChannels, messages: planMessages, reactions: planReactions, profiles, stats };
}
