import { calculateTimeRemaining } from "../../../../lib/oliveOilMatcher.js";

export const WORKFLOW_LABELS = {
  new: "Nueva",
  reviewing: "En revisión",
  interested: "Interesada",
  discarded: "Descartada",
  applied: "Postulada",
  won: "Ganada",
  lost: "Perdida",
};

export const WORKFLOW_OPTIONS = Object.entries(WORKFLOW_LABELS);

export function formatMoney(value, currency = "CLP") {
  if (!Number(value)) return "Sin monto";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: currency || "CLP", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value, withTime = false) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", withTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
}

export function getRemainingLabel(value) {
  const time = calculateTimeRemaining(value);
  if (time.hoursRemaining === null) return { label: "Sin fecha", tone: "muted" };
  if (time.isExpired) return { label: "Expirada", tone: "muted" };
  if (time.hoursRemaining < 48) return { label: `${Math.ceil(time.hoursRemaining)} h`, tone: "danger" };
  if (time.hoursRemaining < 72) return { label: `${Math.ceil(time.hoursRemaining)} h`, tone: "warning" };
  return { label: `${Math.ceil(time.daysRemaining)} días`, tone: "normal" };
}

export function getScoreMeta(score) {
  if (score >= 80) return { label: "Alta prioridad", icon: "🔥", level: "high" };
  if (score >= 60) return { label: "Revisar", icon: "🟡", level: "review" };
  if (score >= 40) return { label: "Potencial", icon: "🔵", level: "potential" };
  return { label: "Baja prioridad", icon: "⚪", level: "low" };
}
