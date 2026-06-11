// Keybase CLI wrapper. Shells out to the locally installed `keybase` binary
// (the JSON chat/team APIs — same surface the keybase-export projects use).
// The paper key is passed via environment variables to `keybase oneshot`
// and is never logged, echoed, or written to disk.

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const pExecFile = promisify(execFile);
const MAX_BUF = 512 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shortError(e) {
  const s = String(e?.stderr || e?.message || e);
  return s.split('\n').filter(Boolean).slice(0, 3).join(' | ').slice(0, 400);
}

export async function status() {
  try {
    const { stdout } = await pExecFile('keybase', ['status', '-j'], { maxBuffer: MAX_BUF });
    const j = JSON.parse(stdout);
    return {
      installed: true,
      loggedIn: !!(j.LoggedIn ?? j.logged_in),
      username: j.Username ?? j.username ?? null,
    };
  } catch (e) {
    return {
      installed: e?.code !== 'ENOENT',
      loggedIn: false,
      username: null,
      error: shortError(e),
    };
  }
}

// Provision a temporary device from a paper key (bot-style "oneshot" login).
// If the desktop client is already logged in this is unnecessary — callers
// should check status() first. Starts the service if it isn't running.
export async function oneshot(username, paperkey) {
  try {
    const svc = spawn('keybase', ['service'], { detached: true, stdio: 'ignore' });
    svc.unref();
    await sleep(1500);
  } catch {
    /* service probably already running */
  }
  try {
    await pExecFile('keybase', ['oneshot'], {
      maxBuffer: MAX_BUF,
      env: { ...process.env, KEYBASE_USERNAME: username, KEYBASE_PAPERKEY: paperkey },
    });
  } catch (e) {
    throw new Error('keybase oneshot failed: ' + shortError(e));
  }
}

async function jsonApi(area, message) {
  const { stdout } = await pExecFile('keybase', [area, 'api', '-m', JSON.stringify(message)], {
    maxBuffer: MAX_BUF,
  });
  const j = JSON.parse(stdout);
  if (j.error) throw new Error(typeof j.error === 'string' ? j.error : j.error.message || JSON.stringify(j.error));
  return j.result;
}

export async function listChannels(team) {
  const r = await jsonApi('chat', {
    method: 'listconvsonname',
    params: { options: { name: team, members_type: 'team', topic_type: 'chat' } },
  });
  return (r?.conversations || []).map((c) => ({
    id: c.id,
    topic: c.channel?.topic_name || 'general',
  }));
}

export async function listMembers(team) {
  const r = await jsonApi('team', {
    method: 'list-team-memberships',
    params: { options: { team } },
  });
  const out = [];
  for (const [role, arr] of Object.entries(r?.members || {})) {
    for (const m of arr || []) {
      if (!m?.username) continue;
      out.push({
        username: m.username,
        fullName: m.fullName ?? m.full_name ?? '',
        role: role.replace(/s$/, ''),
      });
    }
  }
  return out;
}

// One page of channel history, newest-first. `peek` avoids marking as read.
export async function readPage(team, topic, next, num = 300) {
  const options = {
    channel: { name: team, members_type: 'team', topic_name: topic },
    pagination: { num, ...(next ? { next } : {}) },
    peek: true,
  };
  return jsonApi('chat', { method: 'read', params: { options } });
}

// Reduce a raw keybase message to the fields the converter needs.
// Returns null for types we never migrate (join/leave/system/metadata/unfurl).
export function compactMessage(wrapped) {
  const m = wrapped?.msg ?? wrapped;
  if (!m || m.id == null) return null;
  const c = m.content || {};
  const base = {
    id: m.id,
    sentAt: m.sent_at ?? Math.floor((m.sent_at_ms ?? Date.now()) / 1000),
    sender: m.sender?.username ?? '',
    type: c.type,
  };
  switch (c.type) {
    case 'text':
      return { ...base, body: c.text?.body ?? '', replyTo: c.text?.replyTo ?? c.text?.reply_to ?? null };
    case 'attachment':
      return {
        ...base,
        filename: c.attachment?.object?.filename || 'file',
        title: c.attachment?.object?.title || '',
      };
    case 'edit':
      return { ...base, target: c.edit?.messageID ?? c.edit?.message_id, body: c.edit?.body ?? '' };
    case 'delete':
      return { ...base, targets: c.delete?.messageIDs ?? c.delete?.message_ids ?? [] };
    case 'reaction':
      return { ...base, target: c.reaction?.m, body: c.reaction?.b ?? '' };
    default:
      return null;
  }
}

// Full channel export with pagination. onPage(count, pageNo) for progress.
export async function exportChannel(team, topic, onPage) {
  const messages = [];
  let next;
  let page = 0;
  for (;;) {
    const r = await readPage(team, topic, next);
    const batch = r?.messages || [];
    for (const w of batch) {
      const cm = compactMessage(w);
      if (cm) messages.push(cm);
    }
    page += 1;
    if (onPage) onPage(messages.length, page);
    next = r?.pagination?.next;
    if (!next || r?.pagination?.last || batch.length === 0) break;
    await sleep(200); // be gentle with keybase's own rate limits
  }
  return messages;
}
