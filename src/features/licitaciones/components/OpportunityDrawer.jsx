import { useEffect, useState } from "react";
import ScoreBadge from "./ScoreBadge.jsx";
import { formatDate, formatMoney, getRemainingLabel, WORKFLOW_OPTIONS } from "../utils/opportunityFormatters.js";

export default function OpportunityDrawer({ opportunity, onClose, onUpdate }) {
  const [notes, setNotes] = useState(opportunity?.notes || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setNotes(opportunity?.notes || ""); }, [opportunity]);
  useEffect(() => {
    if (!opportunity) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [opportunity, onClose]);

  if (!opportunity) return null;
  const remaining = getRemainingLabel(opportunity.fecha_cierre);

  async function saveNotes() {
    setSaving(true);
    try { await onUpdate(opportunity.id, { notes }); } finally { setSaving(false); }
  }

  async function openMercadoPublico() {
    try { await navigator.clipboard.writeText(opportunity.codigo_externo); setCopied(true); }
    catch { setCopied(false); }
    window.open(opportunity.url || "https://www.mercadopublico.cl/BuscarLicitacion", "_blank", "noopener,noreferrer");
  }

  return (
    <div className="lo-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="lo-drawer" role="dialog" aria-modal="true" aria-label={`Detalle ${opportunity.codigo_externo}`}>
        <header className="lo-drawer-header">
          <div><span className="lo-eyebrow">DETALLE DE OPORTUNIDAD</span><h2>{opportunity.nombre}</h2></div>
          <button className="lo-icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="lo-drawer-content">
          <div className="lo-drawer-priority"><ScoreBadge score={opportunity.score}/><span className={`lo-remaining lo-remaining--${remaining.tone}`}>Cierra en {remaining.label}</span></div>

          <section className="lo-detail-section"><h3>Licitación</h3><dl className="lo-detail-grid">
            <div><dt>Código</dt><dd>{opportunity.codigo_externo}</dd></div>
            <div><dt>Organismo</dt><dd>{opportunity.organismo || "—"}</dd></div>
            <div><dt>Región / comuna</dt><dd>{[opportunity.region, opportunity.comuna].filter(Boolean).join(" · ") || "—"}</dd></div>
            <div><dt>Publicación</dt><dd>{formatDate(opportunity.fecha_publicacion, true)}</dd></div>
            <div><dt>Cierre</dt><dd>{formatDate(opportunity.fecha_cierre, true)}</dd></div>
            <div><dt>Monto</dt><dd>{formatMoney(opportunity.monto_estimado, opportunity.moneda)}</dd></div>
            <div className="lo-detail-wide"><dt>Estado Mercado Público</dt><dd>{opportunity.estado || "Sin información"}</dd></div>
          </dl></section>

          <section className="lo-detail-section"><h3>Producto detectado</h3><dl className="lo-detail-grid">
            <div className="lo-detail-wide"><dt>Producto</dt><dd>{opportunity.producto || "—"}</dd></div>
            <div className="lo-detail-wide"><dt>Descripción</dt><dd>{opportunity.descripcion_item || "Sin descripción"}</dd></div>
            <div><dt>UNSPSC</dt><dd>{opportunity.unspsc || "—"}</dd></div>
            <div><dt>Cantidad</dt><dd>{opportunity.cantidad ?? "—"} {opportunity.unidad || ""}</dd></div>
            <div><dt>Match</dt><dd><span className="lo-match">{opportunity.match_tipo}</span></dd></div>
          </dl></section>

          <section className="lo-detail-section"><h3>Inteligencia LicitIA</h3>
            <div className="lo-score-reasons">
              {(opportunity.score_reasons || []).map((reason, index) => (
                <div key={`${reason.reason}-${index}`}><strong className={reason.points < 0 ? "is-negative" : ""}>{reason.points > 0 ? "+" : ""}{reason.points}</strong><span>{reason.reason}</span></div>
              ))}
              <div className="lo-score-total"><strong>{opportunity.score}/100</strong><span>Score final</span></div>
            </div>
          </section>

          <section className="lo-detail-section"><h3>Gestión comercial</h3>
            <label className="lo-field">Estado interno
              <select value={opportunity.workflow_status} onChange={(event) => onUpdate(opportunity.id, { workflow_status: event.target.value })}>
                {WORKFLOW_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="lo-field">Notas comerciales
              <textarea rows="5" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registra contactos, condiciones, próximos pasos…"/>
            </label>
            <button className="lo-button lo-button--secondary" onClick={saveNotes} disabled={saving}>{saving ? "Guardando…" : "Guardar notas"}</button>
          </section>
        </div>
        <footer className="lo-drawer-footer">
          <button className="lo-button lo-button--primary" onClick={openMercadoPublico}>Ver en Mercado Público ↗</button>
          <small>{copied ? "Código copiado. Pégalo en el buscador oficial." : "El portal oficial usa enlaces cifrados; copiaremos el código al abrir."}</small>
        </footer>
      </aside>
    </div>
  );
}
