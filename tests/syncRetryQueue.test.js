import { describe, expect, it } from "vitest";
import { calculateBackoffDelay } from "../api/mercado-publico/mercadoPublicoClient.js";
import {
  MAX_GLOBAL_RETRIES,
  migrateRetryMetadata,
  normalizeRetryQueue,
  reconcileRetryResults,
  sanitizeRowsForUpsert,
  selectSyncBatch,
  shouldCompleteJob,
} from "../api/mercado-publico/syncState.js";

const attempt = (code, overrides = {}) => ({ code, fromRetry: false, opportunities: [], error: null, transient: false, ...overrides });

describe("retryQueue persistente", () => {
  it("A. encola un código que agotó retries internos por HTTP 429", () => {
    const state = reconcileRetryResults({
      retryQueue: [],
      failedPermanent: [],
      results: [attempt("1036569-9-LE26", { error: "Mercado Público HTTP 429", transient: true })],
      attemptedAt: "2026-08-20T12:00:00Z",
    });
    expect(state.retryQueue).toEqual([expect.objectContaining({ code: "1036569-9-LE26", attempts: 1, lastError: "Mercado Público HTTP 429" })]);
    expect(state.failedPermanent).toHaveLength(0);
  });

  it("B. elimina de la cola un retry que luego procesa correctamente", () => {
    const state = reconcileRetryResults({
      retryQueue: [{ code: "RETRY-1", attempts: 1, lastError: "HTTP 429", lastAttemptAt: "2026-08-20T10:00:00Z" }],
      failedPermanent: [],
      results: [attempt("RETRY-1", { fromRetry: true })],
    });
    expect(state.retryQueue).toEqual([]);
    expect(state.retrySucceeded).toEqual(["RETRY-1"]);
  });

  it("C. mueve a failedPermanent al alcanzar MAX_GLOBAL_RETRIES", () => {
    let retryQueue = [];
    let failedPermanent = [];
    for (let attemptNumber = 1; attemptNumber <= MAX_GLOBAL_RETRIES; attemptNumber += 1) {
      const state = reconcileRetryResults({
        retryQueue,
        failedPermanent,
        results: [attempt("RETRY-5", { fromRetry: attemptNumber > 1, error: "HTTP 503", transient: true })],
        attemptedAt: `2026-08-20T12:0${attemptNumber}:00Z`,
      });
      retryQueue = state.retryQueue;
      failedPermanent = state.failedPermanent;
      if (attemptNumber < MAX_GLOBAL_RETRIES) expect(retryQueue).toHaveLength(1);
    }
    expect(retryQueue).toEqual([]);
    expect(failedPermanent).toEqual([expect.objectContaining({ code: "RETRY-5", attempts: MAX_GLOBAL_RETRIES, failedAt: "2026-08-20T12:05:00Z" })]);
  });

  it("D. prioriza retryQueue y completa el batch con códigos nuevos", () => {
    const selection = selectSyncBatch({
      codes: Array.from({ length: 30 }, (_, index) => `NEW-${index}`),
      cursor: 0,
      retryQueue: ["A", "B", "C"].map((code) => ({ code, attempts: 1 })),
      batchSize: 25,
    });
    expect(selection.entries.slice(0, 3)).toEqual([
      { code: "A", fromRetry: true },
      { code: "B", fromRetry: true },
      { code: "C", fromRetry: true },
    ]);
    expect(selection.retried).toBe(3);
    expect(selection.newCodesCount).toBe(22);
    expect(selection.nextCursor).toBe(22);
  });

  it("E. normaliza sin duplicar retries y migra failedCodes heredados", () => {
    const metadata = {
      codes: ["A", "B"],
      retryQueue: [{ code: "A", attempts: 2, lastError: "HTTP 500" }],
      failedCodes: [
        { code: "A", error: "HTTP 429" },
        { code: "1036569-9-LE26", error: "HTTP 429" },
        { code: "1036569-9-LE26", error: "HTTP 429 repetido" },
      ],
    };
    const migrated = migrateRetryMetadata(metadata);
    expect(normalizeRetryQueue(metadata).map((entry) => entry.code)).toEqual(["A", "1036569-9-LE26"]);
    expect(migrated.retryQueue).toHaveLength(2);
    expect(migrated).not.toHaveProperty("failedCodes");
  });

  it("F. no completa el job mientras retryQueue tenga registros", () => {
    expect(shouldCompleteJob({ cursor: 10, total: 10, retryQueue: [{ code: "A" }] })).toBe(false);
  });

  it("G. completa el job con cursor al final y retryQueue vacía", () => {
    expect(shouldCompleteJob({ cursor: 10, total: 10, retryQueue: [] })).toBe(true);
  });

  it("I. preserva workflow_status, notes y first_seen_at al omitirlos del upsert", () => {
    const [row] = sanitizeRowsForUpsert([{
      external_item_key: "ABC:item:1",
      score: 90,
      workflow_status: "interested",
      notes: "No sobrescribir",
      first_seen_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    }]);
    expect(row).toEqual({ external_item_key: "ABC:item:1", score: 90 });
  });
});

describe("backoff Mercado Público", () => {
  it("usa 800, 1600 y 3200 ms más jitter de hasta 300 ms", () => {
    expect(calculateBackoffDelay(1, () => 0)).toBe(800);
    expect(calculateBackoffDelay(2, () => 0)).toBe(1600);
    expect(calculateBackoffDelay(3, () => 0)).toBe(3200);
    expect(calculateBackoffDelay(1, () => 0.9999)).toBe(1100);
  });
});
