import { useState } from "react";
import ActionButton from "./ActionButton.jsx";
import ConfidenceBreakdown from "./ConfidenceBreakdown.jsx";
import HelpTooltip from "./HelpTooltip.jsx";
import Icon from "./Icon.jsx";
import StatusPill from "./StatusPill.jsx";
import { cx, estimatedFaultSpan, faultLabel, formatDate, incidentPriority, locationLabel, restorationCopy } from "../utils/format.js";

const filters = [
  { id: "active", label: "Open" },
  { id: "all", label: "All" },
  { id: "span", label: "Span" },
  { id: "transformer", label: "Transformer" },
  { id: "feeder", label: "Feeder" },
];

// The queue shows the single next step for each incident; the drawer holds the full workflow.
function nextAction(ticket) {
  if (["verified", "closed"].includes(ticket.status)) return null;
  if (ticket.can_verify_repair) return { status: "resolved", label: "Verify repair", icon: "check", variant: "mint" };
  if (ticket.status === "detected") return { status: "acknowledged", label: "Acknowledge", icon: "check", variant: "secondary" };
  if (ticket.status === "acknowledged") return { status: "crew_assigned", label: "Assign crew", icon: "users", variant: "secondary" };
  return { label: "Waiting for power", icon: "clock", variant: "ghost", disabled: true };
}

function TicketTableRow({ busy, ticket, onStatus, onSelect }) {
  const restoration = restorationCopy(ticket);
  const priority = incidentPriority(ticket);
  const affectedCount = Number(ticket.affected_pole_count) || 0;
  const impactWidth = `${Math.min(100, Math.max(8, affectedCount * 4))}%`;
  const action = nextAction(ticket);

  return (
    <tr className={cx("queue-row", `queue-row-${priority.tone}`)} onClick={() => onSelect(ticket)}>
      <td>
        <div className="table-incident">
          <span className={cx("table-icon", `glyph-${ticket.fault_type}`)}><Icon name={ticket.fault_type === "span" ? "bolt" : ticket.fault_type === "feeder" ? "radio" : "shield"} size={14} /></span>
          <div><strong>{ticket.ticket_id}</strong><span>{faultLabel(ticket.fault_type)} · {formatDate(ticket.detected_at)}</span></div>
        </div>
      </td>
      <td><span className={cx("priority-badge", `priority-${priority.tone}`)}>{priority.label}</span></td>
      <td><strong className="cell-wrap">{estimatedFaultSpan(ticket)}</strong><span className="table-sub">{locationLabel(ticket.localization_level)}{ticket.pincode ? ` · ${ticket.pincode}` : ""}</span></td>
      <td><div className="table-impact"><strong>{affectedCount} pole{affectedCount === 1 ? "" : "s"}</strong><span className="impact-meter"><i style={{ width: impactWidth }} /></span><span className={cx("table-sub", `restoration-text-${restoration.tone}`)}>{restoration.title}</span></div></td>
      <td><ConfidenceBreakdown compact ticket={ticket} /></td>
      <td><StatusPill status={ticket.status} /></td>
      <td onClick={(event) => event.stopPropagation()}>
        <div className="row-actions">
          {action
            ? <ActionButton disabled={busy || action.disabled} icon={action.icon} onClick={() => onStatus(ticket.ticket_id, action.status)} title={action.disabled ? restoration.detail : undefined} variant={action.variant}>{action.label}</ActionButton>
            : <span className="table-sub">No action needed</span>}
          <button aria-label={`Open ${ticket.ticket_id}`} className="icon-button icon-button-sm" onClick={() => onSelect(ticket)} type="button"><Icon name="chevronRight" size={15} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function TicketTable({ busy, tickets, onStatus, onSelect }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTickets = tickets.filter((ticket) => {
    const matchesFilter = filter === "all" || (filter === "active" ? !["verified", "closed"].includes(ticket.status) : ticket.fault_type === filter);
    const haystack = `${ticket.ticket_id} ${ticket.fault_type} ${ticket.pincode || ""} ${ticket.dt_id || ""} ${ticket.feeder_id || ""}`.toLowerCase();
    return matchesFilter && haystack.includes(normalizedQuery);
  });

  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="segmented" role="tablist" aria-label="Filter incidents">
          {filters.map((item) => (
            <button aria-selected={filter === item.id} className={cx("segment", filter === item.id && "segment-active")} key={item.id} onClick={() => setFilter(item.id)} role="tab" type="button">{item.label}</button>
          ))}
        </div>
        <label className="search-field"><Icon name="search" size={15} /><input aria-label="Search incidents" onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, feeder, transformer or PIN" value={query} /></label>
      </div>
      <div className="queue-guide"><Icon name="spark" size={15} /><span><strong>Start with the highest-impact incident.</strong> Open a row for the fault location, AI summary and evidence. A repair is only verified after every affected pole reports power.</span></div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Incident</th><th>Priority</th><th>Location</th><th>Impact <HelpTooltip label="Impact">Number of poles currently included in the incident boundary or area.</HelpTooltip></th><th>Confidence <HelpTooltip label="Confidence">Why the deterministic engine trusts or limits the localization result.</HelpTooltip></th><th>Status</th><th>Next action</th></tr></thead>
          <tbody>
            {filteredTickets.map((ticket) => <TicketTableRow busy={busy} key={ticket.ticket_id} onSelect={onSelect} onStatus={onStatus} ticket={ticket} />)}
            {!filteredTickets.length && <tr className="empty-row"><td colSpan="7"><div className="empty-state"><span className="empty-check"><Icon name={tickets.length ? "search" : "check"} size={18} /></span><strong>{tickets.length ? "No incidents match this view" : "No incidents yet"}</strong><span>{tickets.length ? "Try a different filter or search term." : "Run a scenario from the Practice lab to generate one."}</span></div></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
