import HelpTooltip from "./HelpTooltip.jsx";
import { confidenceBreakdown, cx } from "../utils/format.js";

function toneClass(tone) {
  return tone === "High" ? "high" : tone === "Medium" ? "medium" : "low";
}

export default function ConfidenceBreakdown({ ticket, compact = false }) {
  const breakdown = confidenceBreakdown(ticket);

  if (compact) {
    return (
      <div className={cx("confidence-compact", `confidence-${toneClass(breakdown.tone)}`)} title={breakdown.factors[0]?.value}>
        <strong>{breakdown.score}</strong>
        <span className="confidence-meter"><i style={{ width: breakdown.score }} /></span>
        <span className="table-sub">{breakdown.tone}</span>
      </div>
    );
  }

  return (
    <div className="confidence-breakdown">
      <div className="confidence-breakdown-head">
        <div>
          <span className="eyebrow">Confidence breakdown</span>
          <strong>{breakdown.score} · {breakdown.tone}</strong>
        </div>
        <HelpTooltip label="Confidence">
          Deterministic score from topology completeness, adjacent pole states, affected pole evidence, and restoration telemetry.
        </HelpTooltip>
      </div>
      <div className="confidence-factor-list">
        {breakdown.factors.map((factor) => (
          <div className={cx("confidence-factor", `factor-${factor.tone}`)} key={`${factor.label}-${factor.value}`}>
            <span>{factor.label}</span>
            <strong>{factor.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
