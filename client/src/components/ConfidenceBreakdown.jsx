import HelpTooltip from "./HelpTooltip.jsx";
import { confidenceBreakdown, cx } from "../utils/format.js";

export default function ConfidenceBreakdown({ ticket, compact = false }) {
  const breakdown = confidenceBreakdown(ticket);
  const factors = compact ? breakdown.factors.slice(0, 2) : breakdown.factors;

  return (
    <div className={cx("confidence-breakdown", compact && "confidence-breakdown-compact")}>
      <div className="confidence-breakdown-head">
        <div>
          <span className="eyebrow">Confidence breakdown</span>
          <strong>{breakdown.score} - {breakdown.tone}</strong>
        </div>
        <HelpTooltip label="Confidence">
          Deterministic score from topology completeness, adjacent pole states, affected pole evidence, and restoration telemetry.
        </HelpTooltip>
      </div>
      <div className="confidence-factor-list">
        {factors.map((factor) => (
          <div className={cx("confidence-factor", `factor-${factor.tone}`)} key={`${factor.label}-${factor.value}`}>
            <span>{factor.label}</span>
            <strong>{factor.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
