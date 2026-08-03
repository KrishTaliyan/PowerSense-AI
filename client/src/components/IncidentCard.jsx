import Icon from "./Icon.jsx";
import StatusPill from "./StatusPill.jsx";
import { confidenceLabel, cx, faultLabel, formatRelative, locationLabel, restorationCopy } from "../utils/format.js";

export default function IncidentCard({ ticket, onSelect }) {
  const restoration = restorationCopy(ticket);
  const showRestoration = !["verified", "closed"].includes(ticket.status);

  return (
    <button className="incident-card" onClick={() => onSelect(ticket)} type="button">
      <div className="incident-card-head"><div className="incident-type"><span className={cx("incident-glyph", `glyph-${ticket.fault_type}`)}><Icon name={ticket.fault_type === "span" ? "bolt" : ticket.fault_type === "feeder" ? "radio" : "shield"} size={15} /></span><div><strong>{faultLabel(ticket.fault_type)}</strong><span>{ticket.ticket_id} - {formatRelative(ticket.detected_at)}</span></div></div><StatusPill status={ticket.status} /></div>
      <p className="incident-summary">{ticket.ai_summary || ticket.confidence_reason || "Localization engine is evaluating the affected segment."}</p>
      {showRestoration && <div className={cx("restoration-strip", `restoration-${restoration.tone}`)}><Icon name={restoration.tone === "ready" ? "check" : "wrench"} size={14} /><span>{restoration.title}</span></div>}
      <div className="incident-card-meta"><span><Icon name="target" size={14} />{locationLabel(ticket.localization_level)}</span><span><Icon name="users" size={14} />{ticket.affected_pole_count || 0} poles affected</span><span className="confidence-text"><span className="mini-meter"><i style={{ width: confidenceLabel(ticket.confidence) }} /></span>{confidenceLabel(ticket.confidence)}</span></div>
    </button>
  );
}
