import ActionButton from "./ActionButton.jsx";
import Icon from "./Icon.jsx";
import StageRail from "./StageRail.jsx";
import StatusPill from "./StatusPill.jsx";
import { confidenceLabel, cx, faultLabel, formatDate, locationLabel, restorationCopy } from "../utils/format.js";

export default function TicketDrawer({ ticket, onClose, onStatus }) {
  if (!ticket) return null;
  const restoration = restorationCopy(ticket);
  const isFinal = ["verified", "closed"].includes(ticket.status);
  const canAcknowledge = ticket.status === "detected";
  const canAssignCrew = ["detected", "acknowledged"].includes(ticket.status);
  const canVerify = ticket.can_verify_repair && !isFinal;

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="ticket-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head"><div><span className="eyebrow">Incident brief</span><h2>{ticket.ticket_id}</h2></div><button className="icon-button" aria-label="Close incident details" onClick={onClose} type="button"><Icon name="close" size={19} /></button></div>
        <div className="drawer-hero"><span className={cx("drawer-fault-icon", `glyph-${ticket.fault_type}`)}><Icon name={ticket.fault_type === "span" ? "bolt" : "alert"} size={21} /></span><div><strong>{faultLabel(ticket.fault_type)}</strong><span>Detected {formatDate(ticket.detected_at)}</span></div><StatusPill status={ticket.status} /></div>
        <StageRail status={ticket.status} />
        <div className={cx("restoration-banner", `restoration-${restoration.tone}`)}><Icon name={restoration.tone === "ready" ? "check" : "wrench"} size={18} /><div><strong>{restoration.title}</strong><span>{restoration.detail}</span></div></div>
        <div className="drawer-summary">{ticket.ai_summary || ticket.confidence_reason || "The deterministic localization engine found a probable outage boundary from live pole state changes."}</div>
        <div className="detail-grid"><div><span>Fault location</span><strong>{locationLabel(ticket.localization_level)}</strong></div><div><span>Confidence</span><strong>{confidenceLabel(ticket.confidence)}</strong></div><div><span>Poles without power</span><strong>{ticket.affected_pole_count || 0}</strong></div><div><span>PIN code</span><strong>{ticket.pincode || "Not available"}</strong></div><div><span>Last live pole</span><strong>{ticket.last_live_pole_id || "-"}</strong></div><div><span>First dark pole</span><strong>{ticket.first_dark_pole_id || "-"}</strong></div></div>
        <div className="drawer-section"><div className="drawer-section-title"><span>Why the engine is confident</span><span className="confidence-badge">{confidenceLabel(ticket.confidence)}</span></div><div className="confidence-bar"><i style={{ width: confidenceLabel(ticket.confidence) }} /></div><p>{ticket.confidence_reason || "The incident boundary is supported by adjacent energized and de-energized poles."}</p></div>
        <div className="drawer-section"><span className="drawer-section-title">Affected poles</span><div className="pole-tags">{(ticket.affected_pole_ids || []).slice(0, 18).map((pole) => <span key={pole}>{pole}</span>)}{ticket.affected_pole_count > 18 && <span>+{ticket.affected_pole_count - 18} more</span>}</div></div>
        <div className="drawer-actions"><ActionButton disabled={!canAcknowledge} onClick={() => onStatus(ticket.ticket_id, "acknowledged")} title="Confirm that the incident has been seen" variant="ghost">Acknowledge</ActionButton><ActionButton disabled={!canAssignCrew} onClick={() => onStatus(ticket.ticket_id, "crew_assigned")} title="Assign this incident to a field crew" variant="secondary" icon="users">Assign crew</ActionButton><ActionButton disabled={!canVerify} onClick={() => onStatus(ticket.ticket_id, "resolved")} title={canVerify ? "Verify that restoration telemetry is complete" : restoration.detail} variant="mint" icon="check">Verify restoration</ActionButton>{ticket.status === "verified" && <ActionButton onClick={() => onStatus(ticket.ticket_id, "closed")} variant="secondary" icon="shield">Close ticket</ActionButton>}</div>
        <div className="drawer-note"><Icon name="shield" size={15} /><span>Closure is only accepted after restoration telemetry confirms every affected pole is live.</span></div>
      </aside>
    </div>
  );
}
