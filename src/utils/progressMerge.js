/**
 * Merge two copies of reading progress (e.g. this device + the account in the
 * cloud) without losing anything:
 *  - completedItems: per work, the most recently changed entry wins
 *    (so un-marking on one device still propagates).
 *  - externalLogs: union by id, newest first.
 *  - prefs: `preferred` side wins field by field, falling back to the other.
 */
function stamp(entry) {
  return (entry && (entry.updatedAt || entry.completedAt)) || '';
}

export function mergeCompletedItems(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, entry] of Object.entries(b)) {
    const mine = out[id];
    if (!mine || stamp(entry) > stamp(mine)) {
      out[id] = entry;
    } else if (stamp(entry) === stamp(mine) && entry?.completed && !mine?.completed) {
      out[id] = entry;
    }
  }
  return out;
}

export function mergeExternalLogs(a = [], b = []) {
  const byId = new Map();
  for (const log of [...a, ...b]) {
    if (log && log.id && !byId.has(log.id)) byId.set(log.id, log);
  }
  return [...byId.values()].sort((x, y) => String(y.loggedAt || '').localeCompare(String(x.loggedAt || '')));
}

export function mergeProgress(local = {}, remote = {}, { preferRemotePrefs = true } = {}) {
  const [first, second] = preferRemotePrefs
    ? [remote.prefs || {}, local.prefs || {}]
    : [local.prefs || {}, remote.prefs || {}];
  const prefs = { ...second };
  for (const [k, v] of Object.entries(first)) if (v !== undefined && v !== null) prefs[k] = v;
  return {
    completedItems: mergeCompletedItems(local.completedItems, remote.completedItems),
    externalLogs: mergeExternalLogs(local.externalLogs, remote.externalLogs),
    prefs
  };
}

/** Stable string for "did anything actually change?" checks. */
export function progressKey(p = {}) {
  const sortObj = (o) =>
    o && typeof o === 'object' && !Array.isArray(o)
      ? Object.keys(o)
          .sort()
          .reduce((acc, k) => ((acc[k] = sortObj(o[k])), acc), {})
      : o ?? null;
  return JSON.stringify({
    c: sortObj(p.completedItems),
    e: (p.externalLogs || []).map((l) => l.id),
    p: sortObj(p.prefs)
  });
}
