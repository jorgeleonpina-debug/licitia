export const MAX_GLOBAL_RETRIES = 5;

function normalizeCode(value) {
  return String(value ?? "").trim();
}

function normalizeRetryEntry(value, fallbackAttempts = 0) {
  const source = typeof value === "string" ? { code: value } : (value || {});
  const code = normalizeCode(source.code);
  if (!code) return null;
  return {
    code,
    attempts: Math.max(0, Number(source.attempts) || fallbackAttempts),
    lastError: String(source.lastError ?? source.error ?? "Error anterior sin detalle"),
    lastAttemptAt: source.lastAttemptAt ?? null,
  };
}

function deduplicateEntries(entries) {
  const byCode = new Map();
  for (const entry of entries) {
    if (!entry) continue;
    const previous = byCode.get(entry.code);
    if (!previous || entry.attempts >= previous.attempts) byCode.set(entry.code, entry);
  }
  return [...byCode.values()];
}

export function normalizeRetryQueue(metadata = {}) {
  const current = Array.isArray(metadata.retryQueue)
    ? metadata.retryQueue.map((entry) => normalizeRetryEntry(entry, 0))
    : [];
  const legacy = Array.isArray(metadata.failedCodes)
    ? metadata.failedCodes.map((entry) => normalizeRetryEntry(entry, 1))
    : [];
  return deduplicateEntries([...current, ...legacy]);
}

export function normalizePermanentFailures(metadata = {}) {
  const entries = Array.isArray(metadata.failedPermanent) ? metadata.failedPermanent : [];
  return deduplicateEntries(entries.map((value) => {
    const entry = normalizeRetryEntry(value, MAX_GLOBAL_RETRIES);
    return entry ? { ...entry, failedAt: value?.failedAt ?? null } : null;
  }));
}

export function migrateRetryMetadata(metadata = {}) {
  const migrated = {
    ...metadata,
    retryQueue: normalizeRetryQueue(metadata),
    failedPermanent: normalizePermanentFailures(metadata),
  };
  delete migrated.failedCodes;
  return migrated;
}

export function upsertRetryEntry(queue, failure, attemptedAt = new Date().toISOString()) {
  const code = normalizeCode(failure.code);
  if (!code) return [...queue];
  const previous = queue.find((entry) => entry.code === code);
  const next = {
    code,
    attempts: (previous?.attempts || 0) + 1,
    lastError: String(failure.error || "Error transitorio sin detalle"),
    lastAttemptAt: attemptedAt,
  };
  return [...queue.filter((entry) => entry.code !== code), next];
}

export function removeRetryEntry(queue, code) {
  return queue.filter((entry) => entry.code !== normalizeCode(code));
}

export function moveToPermanentFailure(failedPermanent, entry, failedAt = new Date().toISOString()) {
  const permanent = {
    code: entry.code,
    attempts: entry.attempts,
    lastError: entry.lastError,
    lastAttemptAt: entry.lastAttemptAt,
    failedAt,
  };
  return [...failedPermanent.filter((item) => item.code !== entry.code), permanent];
}

export function selectSyncBatch({ codes = [], cursor = 0, retryQueue = [], batchSize }) {
  const queued = retryQueue.slice(0, batchSize).map((entry) => ({ code: entry.code, fromRetry: true }));
  const availableForNew = Math.max(0, batchSize - queued.length);
  const newCodes = codes.slice(cursor, cursor + availableForNew);
  return {
    entries: [...queued, ...newCodes.map((code) => ({ code, fromRetry: false }))],
    retried: queued.length,
    newCodesCount: newCodes.length,
    nextCursor: cursor + newCodes.length,
  };
}

export function reconcileRetryResults({
  retryQueue,
  failedPermanent,
  results,
  attemptedAt = new Date().toISOString(),
  maxGlobalRetries = MAX_GLOBAL_RETRIES,
}) {
  let nextQueue = [...retryQueue];
  let nextPermanent = [...failedPermanent];
  const retrySucceeded = [];
  const queuedForRetry = [];
  const movedToPermanent = [];

  for (const result of results) {
    if (!result.error) {
      if (result.fromRetry) {
        nextQueue = removeRetryEntry(nextQueue, result.code);
        retrySucceeded.push(result.code);
      }
      continue;
    }

    nextQueue = upsertRetryEntry(nextQueue, result, attemptedAt);
    const entry = nextQueue.find((item) => item.code === result.code);
    if (!result.transient || entry.attempts >= maxGlobalRetries) {
      nextQueue = removeRetryEntry(nextQueue, result.code);
      nextPermanent = moveToPermanentFailure(nextPermanent, entry, attemptedAt);
      movedToPermanent.push(result.code);
    } else {
      queuedForRetry.push(result.code);
    }
  }

  return {
    retryQueue: deduplicateEntries(nextQueue),
    failedPermanent: deduplicateEntries(nextPermanent),
    retrySucceeded,
    queuedForRetry,
    movedToPermanent,
  };
}

export function shouldCompleteJob({ cursor, total, retryQueue }) {
  return cursor >= total && retryQueue.length === 0;
}

export function sanitizeRowsForUpsert(rows) {
  return rows.map((row) => {
    const ingestionFields = { ...row };
    delete ingestionFields.workflow_status;
    delete ingestionFields.notes;
    delete ingestionFields.first_seen_at;
    delete ingestionFields.created_at;
    return ingestionFields;
  });
}
