import ScoreBadge from "./ScoreBadge.jsx";
import { formatDate, formatMoney, getRemainingLabel, WORKFLOW_LABELS, WORKFLOW_OPTIONS } from "../utils/opportunityFormatters.js";

export default function OpportunityTable({ opportunities, onSelect, onWorkflowChange }) {
  return (
    <div className="lo-table-wrap">
      <table className="lo-table">
        <thead><tr>
          <th>Score</th><th>Código</th><th>Producto</th><th>Organismo</th><th>Región</th>
          <th>Cantidad</th><th>Monto</th><th>Fecha cierre</th><th>Tiempo restante</th><th>Estado</th><th>Acción</th>
        </tr></thead>
        <tbody>
          {opportunities.map((item) => {
            const remaining = getRemainingLabel(item.fecha_cierre);
            return (
              <tr key={item.id} onClick={() => onSelect(item)}>
                <td><ScoreBadge score={item.score}/></td>
                <td><button className="lo-code" onClick={(event) => { event.stopPropagation(); onSelect(item); }}>{item.codigo_externo}</button></td>
                <td><strong className="lo-product">{item.producto || item.nombre}</strong><span className="lo-subline">{item.match_tipo}</span></td>
                <td><span className="lo-cell-clamp">{item.organismo || "Sin organismo"}</span></td>
                <td>{item.region || "—"}</td>
                <td>{item.cantidad ?? "—"}<span className="lo-subline">{item.unidad || "Sin unidad"}</span></td>
                <td>{formatMoney(item.monto_estimado, item.moneda)}</td>
                <td>{formatDate(item.fecha_cierre, true)}</td>
                <td><span className={`lo-remaining lo-remaining--${remaining.tone}`}>{remaining.label}</span></td>
                <td><span className={`lo-workflow lo-workflow--${item.workflow_status}`}>{WORKFLOW_LABELS[item.workflow_status]}</span></td>
                <td onClick={(event) => event.stopPropagation()}>
                  <select aria-label={`Estado de ${item.codigo_externo}`} value={item.workflow_status} onChange={(event) => onWorkflowChange(item.id, event.target.value)}>
                    {WORKFLOW_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
