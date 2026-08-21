import { useMemo, useState } from "react";
import AuthGate from "./components/AuthGate.jsx";
import OpportunityDrawer from "./components/OpportunityDrawer.jsx";
import OpportunityTable from "./components/OpportunityTable.jsx";
import { useOpportunities } from "./hooks/useOpportunities.js";
import { calculateTimeRemaining } from "../../../lib/oliveOilMatcher.js";
import { formatMoney } from "./utils/opportunityFormatters.js";
import "./licitaciones.css";

const TABS = [
  ["new", "🔥 Nuevas"], ["high", "Alta prioridad"], ["urgent", "Por vencer"],
  ["reviewing", "En revisión"], ["interested", "Interesadas"], ["applied", "Postuladas"],
  ["won", "Ganadas"], ["discarded", "Descartadas"], ["all", "Todas"],
];

const EMPTY_FILTERS = { text: "", region: "", organization: "", minScore: "", workflow: "", closing: "", matchType: "", sort: "score" };

function LicitacionesDashboard({ session, signOut }) {
  const { opportunities, loading, error, feedback, setFeedback, reload, updateCrm } = useOpportunities(true);
  const [tab, setTab] = useState("new");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const selected = opportunities.find((item) => item.id === selectedId) || null;

  const regions = useMemo(() => [...new Set(opportunities.map((item) => item.region).filter(Boolean))].sort(), [opportunities]);
  const organizations = useMemo(() => [...new Set(opportunities.map((item) => item.organismo).filter(Boolean))].sort(), [opportunities]);

  const filtered = useMemo(() => {
    const now = new Date();
    const result = opportunities.filter((item) => {
      const time = calculateTimeRemaining(item.fecha_cierre, now);
      const haystack = `${item.codigo_externo} ${item.nombre} ${item.producto} ${item.descripcion_item} ${item.organismo}`.toLowerCase();
      const tabMatches = tab === "all"
        || (tab === "high" && item.score >= 80)
        || (tab === "urgent" && time.isUrgent)
        || item.workflow_status === tab;
      const closingMatches = !filters.closing
        || (filters.closing === "24h" && time.hoursRemaining >= 0 && time.hoursRemaining <= 24)
        || (filters.closing === "72h" && time.hoursRemaining >= 0 && time.hoursRemaining <= 72)
        || (filters.closing === "7d" && time.daysRemaining >= 0 && time.daysRemaining <= 7)
        || (filters.closing === "later" && time.daysRemaining > 7);
      return tabMatches
        && (!filters.text || haystack.includes(filters.text.toLowerCase()))
        && (!filters.region || item.region === filters.region)
        && (!filters.organization || item.organismo === filters.organization)
        && (!filters.minScore || item.score >= Number(filters.minScore))
        && (!filters.workflow || item.workflow_status === filters.workflow)
        && (!filters.matchType || item.match_tipo === filters.matchType)
        && closingMatches;
    });
    return result.sort((left, right) => {
      if (filters.sort === "closing") return new Date(left.fecha_cierre || 8640000000000000) - new Date(right.fecha_cierre || 8640000000000000);
      if (filters.sort === "amount") return (right.monto_estimado || 0) - (left.monto_estimado || 0);
      if (filters.sort === "publication") return new Date(right.fecha_publicacion || 0) - new Date(left.fecha_publicacion || 0);
      return (right.score - left.score) || (new Date(left.fecha_cierre || 8640000000000000) - new Date(right.fecha_cierre || 8640000000000000));
    });
  }, [opportunities, tab, filters]);

  const kpis = useMemo(() => {
    const active = opportunities.filter((item) => !["discarded", "won", "lost"].includes(item.workflow_status) && !calculateTimeRemaining(item.fecha_cierre).isExpired);
    const tenderAmounts = new Map(active.map((item) => [item.codigo_externo, Number(item.monto_estimado) || 0]));
    return [
      ["Oportunidades activas", active.length, "items vigentes"],
      ["Nuevas hoy", opportunities.filter((item) => new Date(item.first_seen_at).toDateString() === new Date().toDateString()).length, "detectadas hoy"],
      ["Score ≥ 80", active.filter((item) => item.score >= 80).length, "alta prioridad"],
      ["Cierran <72h", active.filter((item) => calculateTimeRemaining(item.fecha_cierre).isUrgent).length, "requieren acción"],
      ["Monto potencial", formatMoney([...tenderAmounts.values()].reduce((sum, value) => sum + value, 0)), "licitaciones únicas"],
      ["Organismos compradores", new Set(active.map((item) => item.organismo).filter(Boolean)).size, "entidades"],
    ];
  }, [opportunities]);

  function changeFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); }
  async function updateAndSelect(id, fields) {
    const saved = await updateCrm(id, fields);
    setSelectedId(saved.id);
    return saved;
  }

  return (
    <main className="lo-page">
      <header className="lo-page-header">
        <div><span className="lo-eyebrow">RADAR · MERCADO PÚBLICO</span><h1>Oportunidades de aceite de oliva</h1><p>Detección por ítem, prioridad comercial y seguimiento en una sola vista.</p></div>
        <div className="lo-header-actions"><span className="lo-session">{session.user.email}</span><button className="lo-button lo-button--secondary" onClick={reload}>Actualizar</button><button className="lo-link-button" onClick={signOut}>Salir</button></div>
      </header>

      <section className="lo-kpis" aria-label="Indicadores principales">
        {kpis.map(([label, value, hint]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>)}
      </section>

      <nav className="lo-tabs" aria-label="Vistas de oportunidades">
        {TABS.map(([value, label]) => <button key={value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}
      </nav>

      <section className="lo-filters">
        <label className="lo-search">Buscar<input value={filters.text} onChange={(event) => changeFilter("text", event.target.value)} placeholder="Código, producto, organismo…"/></label>
        <label>Región<select value={filters.region} onChange={(event) => changeFilter("region", event.target.value)}><option value="">Todas</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Organismo<select value={filters.organization} onChange={(event) => changeFilter("organization", event.target.value)}><option value="">Todos</option>{organizations.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Score mínimo<input type="number" min="0" max="100" value={filters.minScore} onChange={(event) => changeFilter("minScore", event.target.value)} placeholder="0"/></label>
        <label>Estado<select value={filters.workflow} onChange={(event) => changeFilter("workflow", event.target.value)}><option value="">Todos</option><option value="new">Nueva</option><option value="reviewing">En revisión</option><option value="interested">Interesada</option><option value="applied">Postulada</option><option value="won">Ganada</option><option value="lost">Perdida</option><option value="discarded">Descartada</option></select></label>
        <label>Cierre<select value={filters.closing} onChange={(event) => changeFilter("closing", event.target.value)}><option value="">Cualquier fecha</option><option value="24h">Próximas 24 h</option><option value="72h">Próximas 72 h</option><option value="7d">Próximos 7 días</option><option value="later">Más de 7 días</option></select></label>
        <label>Match<select value={filters.matchType} onChange={(event) => changeFilter("matchType", event.target.value)}><option value="">Todos</option><option>EXACT</option><option>KEYWORD</option><option>UNSPSC</option><option>RELATED</option></select></label>
        <label>Ordenar<select value={filters.sort} onChange={(event) => changeFilter("sort", event.target.value)}><option value="score">Score ↓ · cierre ↑</option><option value="closing">Fecha cierre ↑</option><option value="amount">Monto ↓</option><option value="publication">Publicación ↓</option></select></label>
        <button className="lo-link-button lo-clear" onClick={() => setFilters(EMPTY_FILTERS)}>Limpiar filtros</button>
      </section>

      {feedback && <div className={`lo-feedback lo-feedback--${feedback.type}`} role="status">{feedback.message}<button onClick={() => setFeedback(null)}>×</button></div>}
      {loading && <div className="lo-state"><div className="lo-spinner"/><p>Cargando oportunidades…</p></div>}
      {!loading && error && <div className="lo-state lo-state--error"><h2>No pudimos cargar las oportunidades</h2><p>{error}</p><button className="lo-button lo-button--secondary" onClick={reload}>Reintentar</button></div>}
      {!loading && !error && filtered.length === 0 && <div className="lo-state"><span className="lo-empty-icon">◎</span><h2>Sin resultados</h2><p>No encontramos oportunidades de aceite de oliva con estos filtros.</p></div>}
      {!loading && !error && filtered.length > 0 && <OpportunityTable opportunities={filtered} onSelect={(item) => setSelectedId(item.id)} onWorkflowChange={(id, value) => updateCrm(id, { workflow_status: value })}/>} 

      <OpportunityDrawer opportunity={selected} onClose={() => setSelectedId(null)} onUpdate={updateAndSelect}/>
    </main>
  );
}

export default function LicitacionesPage() {
  return <div className="lo-root"><AuthGate>{(auth) => <LicitacionesDashboard {...auth}/>}</AuthGate></div>;
}
