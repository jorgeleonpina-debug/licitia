import crypto from "node:crypto";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import {
  getActiveTenders,
  getTenderByCode,
  mapWithConcurrency,
  parseTender,
  parseTenderItem,
} from "./mercadoPublicoClient.js";
import {
  buildExternalItemKey,
  calculateOpportunityScore,
  deduplicateOpportunities,
  detectOliveOilMatch,
} from "../../lib/oliveOilMatcher.js";
import {
  migrateRetryMetadata,
  reconcileRetryResults,
  sanitizeRowsForUpsert,
  selectSyncBatch,
  shouldCompleteJob,
} from "./syncState.js";

const JOB_TYPE = "mercado_publico_olive_oil";

export const config = { maxDuration: 60 };

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(req) {
  const expected = process.env.CRON_SECRET;
  const received = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && received && safeEqual(received, expected));
}

async function findOrCreateJob(supabase) {
  const { data: activeJob, error: findError } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("job_type", JOB_TYPE)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (activeJob) return activeJob;

  const { tenders, metadata } = await getActiveTenders();
  const codes = [...new Set(tenders.map((item) => item?.CodigoExterno ?? item?.Codigo).filter(Boolean).map(String))];
  const { data: newJob, error: insertError } = await supabase
    .from("sync_jobs")
    .insert({
      job_type: JOB_TYPE,
      status: "in_progress",
      metadata: { codes, total: codes.length, api: metadata, errorCount: 0, retryQueue: [], failedPermanent: [] },
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return newJob;
}

function opportunityFromItem(tender, item, match, now) {
  const scoring = calculateOpportunityScore({
    match,
    unspsc: item.productCode,
    quantity: item.quantity,
    estimatedAmount: tender.estimatedAmount,
    closingDate: tender.closingDate,
    now,
  });
  return {
    codigo_externo: tender.code,
    external_item_key: buildExternalItemKey({ tenderCode: tender.code, itemId: item.itemId, productCode: item.productCode, itemIndex: item.index }),
    external_item_id: item.itemId === null ? null : String(item.itemId),
    nombre: tender.name,
    descripcion: tender.description,
    organismo: tender.buyerName,
    rut_organismo: tender.buyerRut,
    region: tender.region,
    comuna: tender.commune,
    fecha_publicacion: tender.publicationDate,
    fecha_cierre: tender.closingDate,
    monto_estimado: tender.estimatedAmount,
    moneda: tender.currency,
    producto: item.productName || tender.name,
    descripcion_item: item.description,
    cantidad: item.quantity,
    unidad: item.unit,
    unspsc: item.productCode,
    score: scoring.score,
    score_reasons: scoring.reasons,
    match_tipo: match.matchType,
    estado: tender.state,
    url: tender.url,
    raw_data: { tender: tender.raw, item: item.raw },
    last_seen_at: now.toISOString(),
    source: "mercado_publico",
  };
}

async function analyzeTender(code, now) {
  try {
    const tender = parseTender(await getTenderByCode(code));
    const tenderMatch = detectOliveOilMatch({ tenderName: tender.name, tenderDescription: tender.description });
    const opportunities = tender.items.map(parseTenderItem).flatMap((item) => {
      const match = detectOliveOilMatch({
        productName: item.productName,
        itemDescription: item.description,
        category: item.category,
        unspsc: item.productCode,
      });
      return match.matched ? [opportunityFromItem(tender, item, match, now)] : [];
    });
    if (!opportunities.length && tenderMatch.matched) {
      const tenderLevelItem = parseTenderItem({
        Correlativo: "tender",
        NombreProducto: tender.name,
        Descripcion: tender.description,
      }, 0);
      opportunities.push(opportunityFromItem(tender, tenderLevelItem, tenderMatch, now));
    }
    return { code, opportunities, error: null };
  } catch (error) {
    console.error("[mercado-publico] detail failed", { code, error: error.message });
    return { code, opportunities: [], error: error.message, transient: error.transient === true };
  }
}

async function existingKeys(supabase, keys) {
  const found = new Set();
  for (let index = 0; index < keys.length; index += 100) {
    const { data, error } = await supabase
      .from("licitaciones_oportunidades")
      .select("external_item_key")
      .in("external_item_key", keys.slice(index, index + 100));
    if (error) throw error;
    data.forEach((row) => found.add(row.external_item_key));
  }
  return found;
}

async function persistOpportunities(supabase, rows) {
  if (!rows.length) return { inserted: 0, updated: 0 };
  const safeRows = sanitizeRowsForUpsert(rows);
  const currentKeys = await existingKeys(supabase, safeRows.map((row) => row.external_item_key));
  const { error } = await supabase
    .from("licitaciones_oportunidades")
    .upsert(safeRows, { onConflict: "external_item_key", ignoreDuplicates: false });
  if (error) throw error;
  return {
    inserted: safeRows.filter((row) => !currentKeys.has(row.external_item_key)).length,
    updated: safeRows.filter((row) => currentKeys.has(row.external_item_key)).length,
  };
}

async function markNoLongerActive(supabase, job) {
  const { error } = await supabase
    .from("licitaciones_oportunidades")
    .update({ estado: "No disponible en listado activo" })
    .eq("source", "mercado_publico")
    .lt("last_seen_at", job.started_at);
  if (error) throw error;
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized" });

  let job;
  try {
    const supabase = getSupabaseAdmin();
    job = await findOrCreateJob(supabase);
    const baseMetadata = migrateRetryMetadata(job.metadata);
    const codes = Array.isArray(baseMetadata.codes) ? baseMetadata.codes : [];
    const requestedBatch = Number(req.query?.batchSize ?? req.body?.batchSize ?? 25);
    const batchSize = Math.min(50, Math.max(1, Number.isFinite(requestedBatch) ? requestedBatch : 25));
    const concurrency = Math.min(8, Math.max(1, Number(process.env.MERCADO_PUBLICO_CONCURRENCY) || 5));
    const selection = selectSyncBatch({
      codes,
      cursor: job.cursor,
      retryQueue: baseMetadata.retryQueue,
      batchSize,
    });
    const queuedAttempts = new Map(baseMetadata.retryQueue.map((entry) => [entry.code, entry.attempts]));
    selection.entries.filter((entry) => entry.fromRetry).forEach((entry) => {
      console.info("[mercado-publico] retrying queued code", { code: entry.code, attempts: queuedAttempts.get(entry.code) || 0 });
    });
    const now = new Date();
    const analyzed = await mapWithConcurrency(selection.entries, concurrency, async (entry) => ({
      ...await analyzeTender(entry.code, now),
      fromRetry: entry.fromRetry,
    }));
    const rows = deduplicateOpportunities(analyzed.flatMap((result) => result.opportunities));
    const persistence = await persistOpportunities(supabase, rows);
    const failures = analyzed.filter((result) => result.error);
    const retryState = reconcileRetryResults({
      retryQueue: baseMetadata.retryQueue,
      failedPermanent: baseMetadata.failedPermanent,
      results: analyzed,
      attemptedAt: now.toISOString(),
    });
    retryState.retrySucceeded.forEach((code) => console.info("[mercado-publico] retry succeeded", { code }));
    retryState.queuedForRetry.forEach((code) => console.warn("[mercado-publico] queued for retry", { code }));
    retryState.movedToPermanent.forEach((code) => console.error("[mercado-publico] moved to permanent failure", { code }));

    const nextCursor = selection.nextCursor;
    const completed = shouldCompleteJob({ cursor: nextCursor, total: codes.length, retryQueue: retryState.retryQueue });
    const hasMore = !completed;
    const previousErrorCount = Number(baseMetadata.errorCount) || 0;
    const metadata = {
      ...baseMetadata,
      errorCount: previousErrorCount + failures.length,
      retryQueue: retryState.retryQueue,
      failedPermanent: retryState.failedPermanent,
    };

    const update = {
      cursor: nextCursor,
      processed: job.processed + selection.newCodesCount,
      matched: job.matched + rows.length,
      metadata,
      error: failures.length ? `${failures.length} detalles fallaron en el último lote` : null,
    };
    if (completed) {
      update.status = "completed";
      update.finished_at = new Date().toISOString();
      if (metadata.errorCount === 0) await markNoLongerActive(supabase, job);
    }
    const { error: updateError } = await supabase.from("sync_jobs").update(update).eq("id", job.id);
    if (updateError) throw updateError;

    const response = {
      ok: true,
      jobId: job.id,
      total: codes.length,
      processed: selection.entries.length,
      processedTotal: update.processed,
      matched: rows.length,
      inserted: persistence.inserted,
      updated: persistence.updated,
      errors: failures.length,
      retried: selection.retried,
      retryQueueSize: retryState.retryQueue.length,
      failedPermanent: retryState.failedPermanent.length,
      hasMore,
      nextCursor,
      durationMs: Date.now() - startedAt,
    };
    console.info("[mercado-publico] sync summary", response);
    return res.status(200).json(response);
  } catch (error) {
    console.error("[mercado-publico] sync failed", error);
    if (job?.id) {
      try { await getSupabaseAdmin().from("sync_jobs").update({ error: error.message }).eq("id", job.id); } catch {}
    }
    return res.status(500).json({ ok: false, jobId: job?.id || null, error: error.message, durationMs: Date.now() - startedAt });
  }
}
