import { supabase } from "../../../lib/supabase.js";

export const LIST_FIELDS = [
  "id", "codigo_externo", "external_item_key", "nombre", "descripcion", "organismo",
  "rut_organismo", "region", "comuna", "fecha_publicacion", "fecha_cierre",
  "monto_estimado", "moneda", "producto", "descripcion_item", "cantidad", "unidad",
  "unspsc", "score", "score_reasons", "match_tipo", "estado", "workflow_status",
  "notes", "url", "first_seen_at", "last_seen_at", "source",
].join(",");

function requireClient() {
  if (!supabase) throw new Error("Supabase no está configurado");
  return supabase;
}

export async function fetchOpportunities() {
  const { data, error } = await requireClient()
    .from("licitaciones_oportunidades")
    .select(LIST_FIELDS)
    .order("score", { ascending: false })
    .order("fecha_cierre", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

export async function updateOpportunityCrm(id, fields) {
  const allowed = Object.fromEntries(Object.entries(fields).filter(([key]) => ["workflow_status", "notes"].includes(key)));
  if (!Object.keys(allowed).length) throw new Error("No hay campos CRM válidos para actualizar");
  const { data, error } = await requireClient()
    .from("licitaciones_oportunidades")
    .update(allowed)
    .eq("id", id)
    .select(LIST_FIELDS)
    .single();
  if (error) throw error;
  return data;
}
