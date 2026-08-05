import { useState } from "react";
import ActionButton from "./ActionButton.jsx";
import ConfidenceBreakdown from "./ConfidenceBreakdown.jsx";
import HelpTooltip from "./HelpTooltip.jsx";
import Icon from "./Icon.jsx";
import StatusPill from "./StatusPill.jsx";
import { cx, estimatedFaultSpan, faultLabel, formatDate, incidentPriority, locationLabel, restorationCopy } from "../utils/format.js";

function TicketTableRow({ ticket, onStatus, onSelect }) {
  const restoration = restorationCopy(ticket);
  const priority = incidentPriority(ticket);
  const affectedCount = Number(ticket.affected_pole_count) || 0;
  const impactWidth = `${Math.min(100, Math.max(14, affectedCount * 8))}%`;
  const isFinal = ["verified", "closed"].includes(ticket.status);
  const canAcknowledge = ticket.status === "detected";
  const canAssignCrew = ["detected", "acknowledged"].includes(ticket.status);
  const canVerify = ticket.can_verify_repair && !isFinal;

  return (
    <tr className={cx("queue-row", `queue-row-${priority.tone}`)} key={ticket.ticket_id} onClick={() => onSelect(ticket)}>
      <td>
        <div className="table-incident">
          <span className={cx("table-icon", `glyph-${ticket.fault_type}`)}><Icon name="bolt" size={14} /></span>
          <div><span className={cx("priority-badge", `priority-${priority.tone}`)}>{priority.label}</span><strong>{ticket.ticket_id}</strong><span>{faultLabel(ticket.fault_type)} - {formatDate(ticket.detected_at)}</span></div>
        </div>
      </td>
      <td><strong>{estimatedFaultSpan(ticket)}</strong><span className="table-sub">{locationLabel(ticket.localization_level)} {ticket.pincode ? `- ${ticket.pincode}` : ""}</span></td>
      <td><div className="table-impact"><strong>{affectedCount} poles</strong><span className={cx("table-sub", `restoration-text-${restoration.tone}`)}>{restoration.title}</span><span className="impact-meter"><i style={{ width: impactWidth }} /></span></div></td>
      <td><ConfidenceBreakdown compact ticket={ticket} /></td>
      <td><StatusPill status={ticket.status} /></td>
      <td onClick={(event) => event.stopPropagation()}>
        <div className="row-actions">
          <ActionButton disabled={!canAcknowledge} onClick={() => onStatus(ticket.ticket_id, "acknowledged")} title="Confirm that the incident has been seen" variant="ghost">Acknowledge</ActionButton>
          <ActionButton disabled={!canAssignCrew} onClick={() => onStatus(ticket.ticket_id, "crew_assigned")} title="Assign this incident to a field crew" variant="ghost">Assign crew</ActionButton>
          <ActionButton disabled={!canVerify} onClick={() => onStatus(ticket.ticket_id, "resolved")} title={canVerify ? "Verify that restoration telemetry is complete" : restoration.detail} variant="mint" icon="check">{canVerify ? "Verify repair" : "Waiting for power"}</ActionButton>
        </div>
      </td>
    </tr>
  );
}

export default function TicketTable({ tickets, onStatus, onSelect }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const filteredTickets = tickets.filter((ticket) => {
    const matchesFilter = filter === "all" || (filter === "active" ? !["verified", "closed"].includes(ticket.status) : ticket.fault_type === filter);
    const haystack = `${ticket.ticket_id} ${ticket.fault_type} ${ticket.pincode || ""} ${ticket.dt_id || ""}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  });

  return (
    <section className="panel table-panel">
      <div className="panel-header"><div><span className="eyebrow">Operational queue</span><h2>Every incident, one clear next action.</h2></div><div className="table-tools"><label className="search-field"><Icon name="search" size={16} /><input aria-label="Search incidents" onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, transformer or PIN" value={query} /></label><select aria-label="Filter incidents" className="select-compact" onChange={(event) => setFilter(event.target.value)} value={filter}><option value="active">Open incidents</option><option value="all">All incidents</option><option value="span">Span faults</option><option value="transformer">Transformer faults</option><option value="feeder">Feeder faults</option></select></div></div>
      <div className="queue-guide" data-tour="ai-summary"><span className="queue-guide-icon"><Icon name="spark" size={16} /></span><div><strong>Start with the highest-impact incident.</strong><span>Open a row to see the probable fault location, AI-written plain-English summary, and deterministic evidence. A repair is only verified after every affected pole reports power.</span></div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Incident</th><th>Location</th><th>Impact <HelpTooltip label="Impact">Number of poles currently included in the incident boundary or area.</HelpTooltip></th><th>Confidence <HelpTooltip label="Confidence breakdown">Why the deterministic engine trusts or limits the localization result.</HelpTooltip></th><th>Status</th><th>Next action</th></tr></thead><tbody>
        {filteredTickets.map((ticket) => <TicketTableRow key={ticket.ticket_id} onSelect={onSelect} onStatus={onStatus} ticket={ticket} />)}
        {!filteredTickets.length && <tr><td colSpan="6"><div className="empty-state"><Icon name="search" size={24} /><strong>No incidents match this view.</strong><span>Try a different filter or run a scenario from the lab.</span></div></td></tr>}
      </tbody></table></div>
    </section>
  );
}
