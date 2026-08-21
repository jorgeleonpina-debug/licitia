import { getScoreMeta } from "../utils/opportunityFormatters.js";

export default function ScoreBadge({ score }) {
  const meta = getScoreMeta(Number(score) || 0);
  return (
    <div className={`lo-score lo-score--${meta.level}`} aria-label={`${score} puntos, ${meta.label}`}>
      <strong>{meta.icon} {score}</strong>
      <span>{meta.label}</span>
    </div>
  );
}
