export const OLIVE_OIL_UNSPSC = ["50151513"];

const EXACT_PATTERNS = [
  { regex: /\baceite de oliva extra virgen\b/, points: 50, label: "Coincidencia exacta: aceite de oliva extra virgen" },
  { regex: /\baceite de oliva\b/, points: 45, label: "Coincidencia exacta: aceite de oliva" },
  { regex: /\baove\b/, points: 40, label: "Coincidencia exacta: AOVE" },
];

export function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCode(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function detectOliveOilMatch({
  tenderName = "",
  tenderDescription = "",
  productName = "",
  itemDescription = "",
  category = "",
  unspsc = "",
} = {}) {
  const text = normalizeText([
    tenderName,
    tenderDescription,
    productName,
    itemDescription,
    category,
  ].filter(Boolean).join(" "));
  const code = normalizeCode(unspsc);
  const exact = EXACT_PATTERNS.find(({ regex }) => regex.test(text));
  const hasOil = /\baceite\b/.test(text);
  const hasOlive = /\boliva\b/.test(text);
  const isRelevantUnspsc = OLIVE_OIL_UNSPSC.includes(code);

  if (exact) {
    return { matched: true, matchType: "EXACT", basePoints: exact.points, matchReason: exact.label, normalizedText: text };
  }
  if (isRelevantUnspsc) {
    return { matched: true, matchType: "UNSPSC", basePoints: 0, matchReason: `UNSPSC relevante: ${code}`, normalizedText: text };
  }
  if (hasOil && hasOlive) {
    return { matched: true, matchType: "KEYWORD", basePoints: 35, matchReason: "Coincidencia conjunta de aceite + oliva", normalizedText: text };
  }
  if (/\b(extra virgen|oliva extra virgen)\b/.test(text)) {
    return { matched: true, matchType: "RELATED", basePoints: 20, matchReason: "Concepto relacionado que requiere revisión", normalizedText: text };
  }
  return { matched: false, matchType: null, basePoints: 0, matchReason: null, normalizedText: text };
}

export function calculateTimeRemaining(closingDate, now = new Date()) {
  const closing = closingDate ? new Date(closingDate) : null;
  const valid = closing && !Number.isNaN(closing.getTime());
  if (!valid) {
    return { daysRemaining: null, hoursRemaining: null, isUrgent: false, isExpired: false };
  }
  const diffMs = closing.getTime() - new Date(now).getTime();
  const hoursRemaining = diffMs / 3_600_000;
  return {
    daysRemaining: hoursRemaining / 24,
    hoursRemaining,
    isUrgent: hoursRemaining >= 0 && hoursRemaining < 72,
    isExpired: hoursRemaining < 0,
  };
}

export function calculateOpportunityScore({ match, unspsc, quantity, estimatedAmount, closingDate, now = new Date() } = {}) {
  const reasons = [];
  let score = 0;
  const resolvedMatch = match || { matched: false, basePoints: 0 };

  if (resolvedMatch.basePoints > 0) {
    score += resolvedMatch.basePoints;
    reasons.push({ points: resolvedMatch.basePoints, reason: resolvedMatch.matchReason });
  }

  const code = normalizeCode(unspsc);
  if (OLIVE_OIL_UNSPSC.includes(code)) {
    score += 25;
    reasons.push({ points: 25, reason: `UNSPSC relevante ${code}` });
  }
  if (Number(quantity) > 0) {
    score += 15;
    reasons.push({ points: 15, reason: "Cantidad especificada" });
  }
  if (Number(estimatedAmount) > 0) {
    score += 10;
    reasons.push({ points: 10, reason: "Presupuesto disponible" });
  }

  const time = calculateTimeRemaining(closingDate, now);
  if (time.daysRemaining !== null && time.daysRemaining > 5) {
    score += 10;
    reasons.push({ points: 10, reason: "Cierre a más de 5 días" });
  }
  if (time.hoursRemaining !== null && time.hoursRemaining >= 0 && time.hoursRemaining < 48) {
    score -= 30;
    reasons.push({ points: -30, reason: "Cierre en menos de 48 horas" });
  }
  if (time.isExpired) {
    score -= 30;
    reasons.push({ points: -30, reason: "Licitación expirada" });
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, ...time };
}

export function buildExternalItemKey({ tenderCode, itemId, productCode, itemIndex = 0 }) {
  const code = String(tenderCode || "").trim().toUpperCase();
  if (!code) throw new Error("tenderCode es obligatorio para deduplicar");
  const stableItemId = String(itemId ?? "").trim();
  if (stableItemId) return `${code}:item:${stableItemId}`;
  return `${code}:product:${String(productCode ?? "sin-codigo").trim() || "sin-codigo"}:index:${Number(itemIndex)}`;
}

export function deduplicateOpportunities(rows = []) {
  return [...new Map(rows.map((row) => [row.external_item_key, row])).values()];
}
