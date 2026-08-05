import Icon from "./Icon.jsx";
import StatusPill from "./StatusPill.jsx";
import {
  confidenceLabel,
  cx,
  estimatedFaultSpan,
  faultLabel,
  formatRelative,
  incidentPriority,
  locationLabel,
  restorationCopy,
} from "../utils/format.js";

export default function IncidentCard({ ticket, onSelect }) {
  const restoration = restorationCopy(ticket);
  const priority = incidentPriority(ticket);
  const showRestoration = !["verified", "closed"].includes(ticket.status);

  return (
    <button className={cx("incident-card", `incident-priority-${priority.tone}`)} onClick={() => onSelect(ticket)} type="button">
      <span className="incident-priority-rail" aria-hidden="true" />
      <div className="incident-card-head"><div className="incident-type"><span className={cx("incident-glyph", `glyph-${ticket.fault_type}`)}><Icon name={ticket.fault_type === "span" ? "bolt" : ticket.fault_type === "feeder" ? "radio" : "shield"} size={15} /></span><div><strong>{faultLabel(ticket.fault_type)}</strong><span>{ticket.ticket_id} - {formatRelative(ticket.detected_at)}</span></div></div><div className="incident-status-stack"><span className={cx("priority-badge", `priority-${priority.tone}`)}>{priority.label}</span><StatusPill status={ticket.status} /></div></div>
      <p className="incident-summary">{ticket.ai_summary || ticket.confidence_reason || "Localization engine is evaluating the affected segment."}</p>
      <div className="incident-highlight-grid">
        <div><span>Fault span</span><strong>{estimatedFaultSpan(ticket)}</strong></div>
        <div><span>Impact</span><strong>{ticket.affected_pole_count || 0} pole{ticket.affected_pole_count === 1 ? "" : "s"}</strong></div>
      </div>
      {showRestoration && <div className={cx("restoration-strip", `restoration-${restoration.tone}`)}><Icon name={restoration.tone === "ready" ? "check" : "wrench"} size={14} /><span>{restoration.title}</span></div>}
      <div className="incident-card-meta"><span><Icon name="target" size={14} />{locationLabel(ticket.localization_level)}</span><span><Icon name="users" size={14} />{ticket.affected_pole_count || 0} poles affected</span><span className="confidence-text"><span className="mini-meter"><i style={{ width: confidenceLabel(ticket.confidence) }} /></span>{confidenceLabel(ticket.confidence)}</span></div>
    </button>
  );
}
