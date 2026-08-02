import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const navigation = [
  { id: "Dashboard", label: "Overview", icon: "grid" },
  { id: "Map", label: "Network map", icon: "map" },
  { id: "Tickets", label: "Incidents", icon: "alert" },
  { id: "Telemetry", label: "Live signals", icon: "pulse" },
  { id: "Simulation", label: "Practice lab", icon: "flask" },
];

const stageOrder = ["detected", "acknowledged", "crew_assigned", "resolved", "verified"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(value) {
  if (!value) return "No recent signal";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function titleCase(value) {
  return String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function faultLabel(type) {
  return { span: "Span fault", transformer: "Transformer fault", feeder: "Feeder fault" }[type] || titleCase(type);
}

function locationLabel(level) {
  return { span: "Exact span", dt: "Transformer area", feeder: "Whole feeder" }[level] || titleCase(level || "network");
}

function statusLabel(status) {
  return {
    detected: "Detected",
    acknowledged: "Acknowledged",
    crew_assigned: "Crew assigned",
    resolved: "Resolved",
    verified: "Verified",
    closed: "Closed",
  }[status] || titleCase(status);
}

function confidenceLabel(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function restorationCopy(ticket) {
  const isFinal = ["verified", "closed"].includes(ticket?.status);
  const remaining = Number(ticket?.remaining_dark_poles ?? ticket?.affected_pole_count ?? 0);

  if (isFinal) {
    return {
      tone: "ready",
      title: "Restoration verified",
      detail: "All affected poles have reported power back.",
    };
  }

  if (ticket?.can_verify_repair) {
    return {
      tone: "ready",
      title: "Ready to verify",
      detail: "Every affected pole is energized. Verify the repair to complete the response loop.",
    };
  }

  return {
    tone: "waiting",
    title: remaining > 0
      ? `${remaining} ${remaining === 1 ? "pole is" : "poles are"} still dark`
      : "Waiting for restoration telemetry",
    detail: "Restore power or wait for a fresh live signal before verifying this repair.",
  };
}

function incidentSummary(ticket) {
  const storedSummary = ticket?.ai_summary || "";
  if (storedSummary && !storedSummary.toLowerCase().includes("undefined")) return storedSummary;

  const affected = ticket?.affected_pole_count || ticket?.affected_pole_ids?.length || 0;
  const reason = ticket?.confidence_reason ? ` ${ticket.confidence_reason}` : "";

  if (ticket?.fault_type === "feeder") {
    return `Feeder fault suspected on ${ticket.feeder_id || "the selected feeder"}. ${affected} downstream poles are affected. Confidence ${confidenceLabel(ticket.confidence)}.${reason}`;
  }

  if (ticket?.fault_type === "transformer") {
    return `Transformer-level outage detected at ${ticket.dt_id || "the selected transformer"}. ${affected} downstream poles are affected. Confidence ${confidenceLabel(ticket.confidence)}.${reason}`;
  }

  if (ticket?.fault_type === "span") {
    const location = ticket.last_live_pole_id && ticket.first_dark_pole_id
      ? `between ${ticket.last_live_pole_id} and ${ticket.first_dark_pole_id}`
      : ticket.first_dark_pole_id
        ? `upstream of ${ticket.first_dark_pole_id}`
        : ticket.dt_id
          ? `within transformer area ${ticket.dt_id}`
          : ticket.feeder_id
            ? `on feeder ${ticket.feeder_id}`
            : "within the selected network area";

    return `Span fault suspected ${location}. ${affected} downstream poles are affected. Confidence ${confidenceLabel(ticket.confidence)}.${reason}`;
  }

  return ticket?.confidence_reason || "Localization engine is evaluating the affected segment.";
}

function readableError(message) {
  if (message?.toLowerCase().includes("affected poles are still dark")) {
    return "Some affected poles are still without power. Restore the line, wait for a fresh device signal, then try again.";
  }
  if (message?.toLowerCase().includes("backend is not responding")) {
    return "The live connection is unavailable. Check the API and refresh when it is back online.";
  }
  return message || "Something went wrong. Try again in a moment.";
}

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    map: <><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>,
    alert: <><path d="m10.3 3.7-8 14A2 2 0 0 0 4 20.7h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    pulse: <><path d="M3 12h4l2.2-6 4.2 12 2.2-6H21" /><path d="M3 5v14M21 5v14" /></>,
    flask: <><path d="M9 3h6M10 3v6l-6.5 10A1.8 1.8 0 0 0 5 21h14a1.8 1.8 0 0 0 1.5-2L14 9V3" /><path d="M7.4 16h9.2" /></>,
    command: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 10 3 3 3-3M8 16h8" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4L3 10" /><path d="M3 5v5h5M4 13a8 8 0 0 0 14.8 4L21 14" /><path d="M21 19v-5h-5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m7 9 5 5 5-5" />,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></>,
    satellite: <><path d="m13 5 6 6M15 3l6 6-3 3-6-6 3-3ZM5 19l5-5M3 21l2-2M8 16l-2-2M4 10a6 6 0 0 1 6-6M4 14a10 10 0 0 1 10-10" /></>,
    spark: <><path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2L12 3Z" /><path d="m19 16-.5 2.5L16 19l2.5.5L19 22l.5-2.5L22 19l-2.5-.5L19 16Z" /></>,
    wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4L15 12l-3-3 2.7-2.7Z" /></>,
    radio: <><circle cx="12" cy="12" r="2" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5 8.5 8.5 0 1 0 20.5 15.3Z" />,
  };

  return <svg {...common}>{paths[name] || <circle cx="12" cy="12" r="7" />}</svg>;
}

function StatusPill({ status }) {
  return <span className={cx("status-pill", `status-${status}`)}><span className="status-dot" />{statusLabel(status)}</span>;
}

function ActionButton({ children, onClick, disabled = false, variant = "secondary", icon, className, title }) {
  return (
    <button className={cx("action-button", `button-${variant}`, className)} disabled={disabled} onClick={onClick} title={title} type="button">
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}

function Sparkline({ values, color = "#7ce4bd", height = 50 }) {
  const safeValues = values.length ? values : [42, 48, 44, 57, 52, 68, 63, 76, 71, 82];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 70;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="sparkline" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Network activity trend">
      <defs><linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      <circle cx={points.split(" ").at(-1).split(",")[0]} cy={points.split(" ").at(-1).split(",")[1]} r="2.8" fill={color} />
    </svg>
  );
}

function MetricCard({ label, value, detail, icon, accent = "mint", onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper className={cx("metric-card", `metric-${accent}`, onClick && "metric-clickable")} onClick={onClick} type={onClick ? "button" : undefined}>
      <div className="metric-topline"><span className="metric-icon"><Icon name={icon} size={17} /></span><span className="metric-label">{label}</span></div>
      <div className="metric-value">{value ?? "—"}</div>
      <div className="metric-detail">{detail || "Awaiting signal"}</div>
    </Wrapper>
  );
}

function StageRail({ status }) {
  const current = status === "closed" ? stageOrder.length - 1 : stageOrder.indexOf(status);
  return (
    <div className="stage-rail" aria-label={`Incident status: ${statusLabel(status)}`}>
      {stageOrder.map((stage, index) => (
        <div className={cx("stage-item", index <= current && "stage-done", index === current && "stage-current")} key={stage}>
          <span className="stage-node">{index < current ? <Icon name="check" size={11} /> : index + 1}</span>
          <span>{statusLabel(stage)}</span>
        </div>
      ))}
    </div>
  );
}

function SchematicMap({ poles, tickets, transformer, selectedPoleId, onSelectPole, onSelectTicket }) {
  const mapPoles = useMemo(() => {
    if (poles.length <= 420) return poles;
    const stride = Math.ceil(poles.length / 420);
    return poles.filter((_, index) => index % stride === 0);
  }, [poles]);

  const bounds = useMemo(() => {
    if (!mapPoles.length) return null;
    const lats = mapPoles.map((pole) => pole.lat);
    const lons = mapPoles.map((pole) => pole.lon);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) };
  }, [mapPoles]);

  const positionFor = useCallback((lat, lon) => {
    if (!bounds || lat == null || lon == null) return null;
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lonRange = bounds.maxLon - bounds.minLon || 1;
    return { x: 5 + ((lon - bounds.minLon) / lonRange) * 90, y: 95 - ((lat - bounds.minLat) / latRange) * 90 };
  }, [bounds]);

  const positionedPoles = useMemo(() => mapPoles.map((pole) => ({ ...pole, point: positionFor(pole.lat, pole.lon) })).filter((pole) => pole.point), [mapPoles, positionFor]);
  const positions = useMemo(() => new Map(positionedPoles.map((pole) => [pole.pole_id, pole.point])), [positionedPoles]);
  const links = useMemo(() => positionedPoles.flatMap((pole) => {
    const parent = pole.parent_pole_id ? positions.get(pole.parent_pole_id) : null;
    return parent ? [{ from: parent, to: pole.point, key: `${pole.parent_pole_id}-${pole.pole_id}` }] : [];
  }), [positionedPoles, positions]);
  const activeTickets = tickets.filter((ticket) => ticket.lat && ticket.lon && !["verified", "closed"].includes(ticket.status));

  if (!mapPoles.length || !bounds) {
    return <div className="empty-map"><Icon name="map" size={28} /><strong>No network slice loaded</strong><span>Select a transformer to focus the map.</span></div>;
  }

  return (
    <div className="network-map">
      <div className="map-grid" />
      <div className="map-topbar"><div><span className="eyebrow">Live network view</span><strong>{transformer?.dt_id || "Selected transformer"}</strong></div><span className="map-count"><span className="live-dot" />{positionedPoles.length} poles in view</span></div>
      <svg className="map-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {links.map((link) => <line key={link.key} x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y} />)}
      </svg>
      {positionedPoles.map((pole) => (
        <button
          aria-label={`${pole.pole_id}, ${pole.is_energized ? "live" : "dark"}`}
          className={cx("map-node", pole.is_energized ? "node-live" : "node-dark", !pole.device_id && "node-missing", selectedPoleId === pole.pole_id && "node-selected")}
          key={pole.pole_id}
          onClick={() => onSelectPole(pole)}
          style={{ left: `${pole.point.x}%`, top: `${pole.point.y}%` }}
          title={`${pole.pole_id} · ${pole.is_energized ? "live" : "dark"}`}
          type="button"
        />
      ))}
      {transformer && positionFor(transformer.lat, transformer.lon) && (
        <button
          aria-label={`${transformer.dt_id} transformer`}
          className="transformer-node"
          onClick={() => onSelectPole({ ...transformer, pole_id: transformer.dt_id, is_transformer: true })}
          style={{ left: `${positionFor(transformer.lat, transformer.lon).x}%`, top: `${positionFor(transformer.lat, transformer.lon).y}%` }}
          title={`${transformer.dt_id} · ${transformer.capacity_kva || "—"} kVA`}
          type="button"
        ><Icon name="bolt" size={14} /></button>
      )}
      {activeTickets.map((ticket) => {
        const point = positionFor(ticket.lat, ticket.lon);
        if (!point) return null;
        return <button aria-label={`Open ${ticket.ticket_id}`} className="fault-node" key={ticket.ticket_id} onClick={() => onSelectTicket(ticket)} style={{ left: `${point.x}%`, top: `${point.y}%` }} type="button"><Icon name="alert" size={13} /></button>;
      })}
      <div className="map-legend"><span><i className="legend-swatch swatch-live" />Live</span><span><i className="legend-swatch swatch-dark" />Dark</span><span><i className="legend-swatch swatch-missing" />No device</span><span><i className="legend-swatch swatch-fault" />Incident</span></div>
      <div className="map-compass"><span>N</span><Icon name="arrow" size={15} /></div>
    </div>
  );
}

function IncidentCard({ ticket, onSelect }) {
  const restoration = restorationCopy(ticket);
  const showRestoration = !["verified", "closed"].includes(ticket.status);

  return (
    <button className="incident-card" onClick={() => onSelect(ticket)} type="button">
      <div className="incident-card-head"><div className="incident-type"><span className={cx("incident-glyph", `glyph-${ticket.fault_type}`)}><Icon name={ticket.fault_type === "span" ? "bolt" : ticket.fault_type === "feeder" ? "radio" : "shield"} size={15} /></span><div><strong>{faultLabel(ticket.fault_type)}</strong><span>{ticket.ticket_id} · {formatRelative(ticket.detected_at)}</span></div></div><StatusPill status={ticket.status} /></div>
      <p className="incident-summary">{ticket.ai_summary || ticket.confidence_reason || "Localization engine is evaluating the affected segment."}</p>
      {showRestoration && <div className={cx("restoration-strip", `restoration-${restoration.tone}`)}><Icon name={restoration.tone === "ready" ? "check" : "wrench"} size={14} /><span>{restoration.title}</span></div>}
      <div className="incident-card-meta"><span><Icon name="target" size={14} />{locationLabel(ticket.localization_level)}</span><span><Icon name="users" size={14} />{ticket.affected_pole_count || 0} poles affected</span><span className="confidence-text"><span className="mini-meter"><i style={{ width: confidenceLabel(ticket.confidence) }} /></span>{confidenceLabel(ticket.confidence)}</span></div>
    </button>
  );
}

function TicketTableRow({ ticket, onStatus, onSelect }) {
  const restoration = restorationCopy(ticket);
  const isFinal = ["verified", "closed"].includes(ticket.status);
  const canAcknowledge = ticket.status === "detected";
  const canAssignCrew = ["detected", "acknowledged"].includes(ticket.status);
  const canVerify = ticket.can_verify_repair && !isFinal;

  return (
    <tr key={ticket.ticket_id} onClick={() => onSelect(ticket)}>
      <td>
        <div className="table-incident">
          <span className={cx("table-icon", `glyph-${ticket.fault_type}`)}><Icon name="bolt" size={14} /></span>
          <div><strong>{ticket.ticket_id}</strong><span>{faultLabel(ticket.fault_type)} · {formatDate(ticket.detected_at)}</span></div>
        </div>
      </td>
      <td><strong>{ticket.dt_id || ticket.feeder_id || "—"}</strong><span className="table-sub">{locationLabel(ticket.localization_level)} {ticket.pincode ? `· ${ticket.pincode}` : ""}</span></td>
      <td><strong>{ticket.affected_pole_count || 0} poles</strong><span className={cx("table-sub", `restoration-text-${restoration.tone}`)}>{restoration.title}</span></td>
      <td><div className="confidence-cell"><span className="confidence-ring">{confidenceLabel(ticket.confidence)}</span><span className="table-sub">{ticket.confidence >= .8 ? "High confidence" : "Review boundary"}</span></div></td>
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

function TicketTable({ tickets, onStatus, onSelect }) {
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
      <div className="queue-guide"><span className="queue-guide-icon"><Icon name="spark" size={16} /></span><div><strong>Start with the highest-impact incident.</strong><span>Open a row to see the probable fault location and evidence. A repair is only verified after every affected pole reports power.</span></div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Incident</th><th>Location</th><th>Impact</th><th>Confidence</th><th>Status</th><th>Next action</th></tr></thead><tbody>
        {filteredTickets.map((ticket) => <TicketTableRow key={ticket.ticket_id} onSelect={onSelect} onStatus={onStatus} ticket={ticket} />)}
        {!filteredTickets.length && <tr><td colSpan="6"><div className="empty-state"><Icon name="search" size={24} /><strong>No incidents match this view.</strong><span>Try a different filter or run a scenario from the lab.</span></div></td></tr>}
      </tbody></table></div>
    </section>
  );
}

function TelemetryTable({ telemetry }) {
  const [query, setQuery] = useState("");
  const filtered = telemetry.filter((row) => `${row.pole_id} ${row.device_id} ${row.event}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="panel table-panel">
      <div className="panel-header"><div><span className="eyebrow">Last 25 packets</span><h2>Signal stream</h2></div><div className="table-tools"><div className="stream-live"><span className="live-dot" />Ingesting live</div><label className="search-field"><Icon name="search" size={16} /><input aria-label="Search telemetry" onChange={(event) => setQuery(event.target.value)} placeholder="Search pole or device" value={query} /></label></div></div>
      <div className="telemetry-summary"><span><strong>{telemetry.filter((row) => !row.is_duplicate && !row.is_stale).length}</strong> clean packets</span><span><strong>{telemetry.filter((row) => row.is_duplicate).length}</strong> duplicates quarantined</span><span><strong>{telemetry.filter((row) => row.is_stale).length}</strong> stale packets ignored</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Received</th><th>Source</th><th>Event</th><th>Power state</th><th>Sequence</th><th>Quality</th></tr></thead><tbody>
        {filtered.map((row) => <tr key={row._id}><td><strong>{formatTime(row.received_at)}</strong><span className="table-sub">{formatRelative(row.received_at)}</span></td><td><strong>{row.pole_id}</strong><span className="table-sub">{row.device_id}</span></td><td><span className={cx("event-chip", row.event === "power_lost" ? "event-danger" : row.event === "power_restored" ? "event-success" : "event-neutral")}>{titleCase(row.event)}</span></td><td><span className={cx("power-state", row.energized ? "power-live" : "power-dark")}><i />{row.energized ? "Energized" : "Dark"}</span></td><td className="mono-text">#{row.seq}</td><td><span className={cx("quality-chip", row.is_duplicate ? "quality-warn" : row.is_stale ? "quality-muted" : "quality-clean")}>{row.is_duplicate ? "Duplicate" : row.is_stale ? "Stale" : "Applied"}</span></td></tr>)}
        {!filtered.length && <tr><td colSpan="6"><div className="empty-state"><Icon name="radio" size={24} /><strong>No telemetry found.</strong><span>Live packets will appear here as the simulator or devices report in.</span></div></td></tr>}
      </tbody></table></div>
    </section>
  );
}

function SignalHealthPanel({ values }) {
  const hasSignals = values.length > 0;
  return (
    <section className="panel signal-panel">
      <div className="panel-header"><div><span className="eyebrow">Recent device messages</span><h2>Power signal health</h2></div><div className="pulse-legend"><span><i className="legend-line mint-line" />Power on</span><span><i className="legend-line coral-line" />Power off</span></div></div>
      <div className={cx("pulse-chart", !hasSignals && "pulse-empty")}>
        {hasSignals ? <Sparkline color="#7ce4bd" height={140} values={values} /> : <div className="chart-empty"><span className="chart-empty-icon"><Icon name="radio" size={19} /></span><strong>Waiting for device messages</strong><span>The chart will fill as poles report their power state.</span></div>}
        <div className="chart-axis"><span>5 minutes ago</span><span>Now</span></div>
      </div>
    </section>
  );
}

function TicketDrawer({ ticket, onClose, onStatus }) {
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
        <div className="detail-grid"><div><span>Fault location</span><strong>{locationLabel(ticket.localization_level)}</strong></div><div><span>Confidence</span><strong>{confidenceLabel(ticket.confidence)}</strong></div><div><span>Poles without power</span><strong>{ticket.affected_pole_count || 0}</strong></div><div><span>PIN code</span><strong>{ticket.pincode || "Not available"}</strong></div><div><span>Last live pole</span><strong>{ticket.last_live_pole_id || "—"}</strong></div><div><span>First dark pole</span><strong>{ticket.first_dark_pole_id || "—"}</strong></div></div>
        <div className="drawer-section"><div className="drawer-section-title"><span>Why the engine is confident</span><span className="confidence-badge">{confidenceLabel(ticket.confidence)}</span></div><div className="confidence-bar"><i style={{ width: confidenceLabel(ticket.confidence) }} /></div><p>{ticket.confidence_reason || "The incident boundary is supported by adjacent energized and de-energized poles."}</p></div>
        <div className="drawer-section"><span className="drawer-section-title">Affected poles</span><div className="pole-tags">{(ticket.affected_pole_ids || []).slice(0, 18).map((pole) => <span key={pole}>{pole}</span>)}{ticket.affected_pole_count > 18 && <span>+{ticket.affected_pole_count - 18} more</span>}</div></div>
        <div className="drawer-actions"><ActionButton disabled={!canAcknowledge} onClick={() => onStatus(ticket.ticket_id, "acknowledged")} title="Confirm that the incident has been seen" variant="ghost">Acknowledge</ActionButton><ActionButton disabled={!canAssignCrew} onClick={() => onStatus(ticket.ticket_id, "crew_assigned")} title="Assign this incident to a field crew" variant="secondary" icon="users">Assign crew</ActionButton><ActionButton disabled={!canVerify} onClick={() => onStatus(ticket.ticket_id, "resolved")} title={canVerify ? "Verify that restoration telemetry is complete" : restoration.detail} variant="mint" icon="check">Verify restoration</ActionButton>{ticket.status === "verified" && <ActionButton onClick={() => onStatus(ticket.ticket_id, "closed")} variant="secondary" icon="shield">Close ticket</ActionButton>}</div>
        <div className="drawer-note"><Icon name="shield" size={15} /><span>Closure is only accepted after restoration telemetry confirms every affected pole is live.</span></div>
      </aside>
    </div>
  );
}

function CommandPalette({ onClose, onNavigate, onAction }) {
  const commands = [
    { label: "Open command center", hint: "1", icon: "grid", action: () => onNavigate("Dashboard") },
    { label: "Open incident queue", hint: "3", icon: "alert", action: () => onNavigate("Tickets") },
    { label: "Inspect network map", hint: "2", icon: "map", action: () => onNavigate("Map") },
    { label: "Inject span fault", hint: "demo", icon: "bolt", action: () => onAction("span") },
    { label: "Open scenario lab", hint: "5", icon: "flask", action: () => onNavigate("Simulation") },
  ];
  return <div className="palette-backdrop" onClick={onClose} role="presentation"><div className="command-palette" onClick={(event) => event.stopPropagation()}><div className="palette-search"><Icon name="search" size={18} /><input autoFocus placeholder="Jump to a view or run a command..." /><kbd>ESC</kbd></div><div className="palette-label">Quick actions</div>{commands.map((command) => <button className="palette-command" key={command.label} onClick={() => { command.action(); onClose(); }} type="button"><span className="palette-icon"><Icon name={command.icon} size={16} /></span><span>{command.label}</span><kbd>{command.hint}</kbd></button>)}</div></div>;
}

function SimulationView({ busy, selectedDt, fromSeq, feederId, post }) {
  const faultActions = [
    { title: "Span fault", description: "Break a single downstream span and localize the boundary.", icon: "bolt", variant: "danger", path: "/simulate/span-fault", body: { dt_id: selectedDt, from_seq: fromSeq } },
    { title: "Transformer outage", description: "Darken every observed pole behind one transformer.", icon: "shield", variant: "warning", path: "/simulate/transformer-fault", body: { dt_id: selectedDt } },
    { title: "Feeder outage", description: "Exercise wide-area grouping and criticality ranking.", icon: "radio", variant: "warning", path: "/simulate/feeder-fault", body: { feeder_id: feederId } },
  ];
  const noiseActions = [
    { title: "Scheduled outage", description: "Prove planned work does not create a false ticket.", icon: "clock", path: "/simulate/scheduled-outage", body: { dt_id: selectedDt } },
    { title: "Kill a device", description: "Separate a silent sensor from a genuinely dark pole.", icon: "satellite", path: "/simulate/kill-device", body: {} },
    { title: "Duplicate packet", description: "Quarantine the same sequence without changing pole state.", icon: "copy", path: "/simulate/duplicate-message", body: {} },
    { title: "Delayed packet", description: "Ignore old telemetry while retaining an audit trail.", icon: "radio", path: "/simulate/delayed-message", body: {} },
  ];
  const repairActions = [
    { title: "Restore span", description: "Send restoration telemetry for the selected segment.", icon: "wrench", body: { dt_id: selectedDt, from_seq: fromSeq } },
    { title: "Restore transformer", description: "Bring every pole behind the selected transformer live.", icon: "check", body: { scope: "transformer", dt_id: selectedDt } },
    { title: "Restore feeder", description: "Verify the wide-area restoration workflow.", icon: "check", body: { scope: "feeder", feeder_id: feederId } },
  ];
  const renderScenarioCard = (action, variant = "quiet", disabled = false) => <button className={cx("scenario-card", variant === "quiet" && "scenario-muted")} disabled={busy || disabled} key={action.title} onClick={() => post(action.path || "/simulate/repair", action.body, action.title)} type="button"><span className={cx("scenario-icon", `scenario-${variant}`)}><Icon name={action.icon} size={19} /></span><span><strong>{action.title}</strong><small>{action.description}</small></span><Icon name="arrow" size={16} /></button>;
  return <div className="simulation-layout"><section className="panel scenario-panel"><div className="panel-header"><div><span className="eyebrow">Practice safely</span><h2>Try a scenario and watch the grid respond.</h2></div><span className="lab-badge"><Icon name="spark" size={14} /> Ready to try</span></div><p className="panel-intro">These actions create realistic device messages. Use them to learn the full response: find the problem, send a crew, repair the line, and confirm power is back.</p><div className="scenario-section"><span className="section-kicker">Create a power problem</span><div className="scenario-grid">{faultActions.map((action) => renderScenarioCard(action, action.variant, !selectedDt || (action.path.includes("feeder") && !feederId)))}</div></div><div className="scenario-section"><span className="section-kicker">Bring power back</span><div className="scenario-grid">{repairActions.map((action) => renderScenarioCard(action, "mint", !selectedDt || (action.body.scope === "feeder" && !feederId)))}</div></div><div className="scenario-section"><span className="section-kicker">Test messy device messages</span><div className="scenario-grid">{noiseActions.map((action) => renderScenarioCard(action))}</div></div></section><section className="panel playbook-panel"><div className="panel-header"><div><span className="eyebrow">Response guide</span><h2>Three steps to close an incident</h2></div><span className="playbook-number">03</span></div><div className="playbook-steps"><div><span>01</span><strong>Find it</strong><p>A power change becomes one grouped incident.</p></div><div><span>02</span><strong>Send help</strong><p>Acknowledge the issue and assign a crew.</p></div><div><span>03</span><strong>Confirm it</strong><p>Close only after live messages show power is back.</p></div></div><div className="lab-callout"><Icon name="shield" size={18} /><div><strong>Clear and explainable</strong><span>The system calculates the fault location; AI only writes the summary.</span></div></div></section></div>;
}

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [transformers, setTransformers] = useState([]);
  const [poles, setPoles] = useState([]);
  const [selectedDt, setSelectedDt] = useState("");
  const fromSeq = 5;
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedPole, setSelectedPole] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("powersense-theme") || "dark";
  });

  const tickets = dashboard?.tickets || [];
  const recentTelemetryData = dashboard?.recent_telemetry;
  const recentTelemetry = useMemo(() => recentTelemetryData || [], [recentTelemetryData]);
  const stats = dashboard?.stats || {};
  const activeTickets = tickets.filter((ticket) => !["verified", "closed"].includes(ticket.status));
  const selectedTransformer = transformers.find((transformer) => transformer.dt_id === selectedDt);
  const feederId = selectedTransformer?.feeder_id || transformers[0]?.feeder_id || "";
  const cleanPackets = recentTelemetry.filter((row) => !row.is_duplicate && !row.is_stale).length;
  const signalContinuity = recentTelemetry.length ? Math.round((cleanPackets / recentTelemetry.length) * 100) : 100;
  const telemetryTrend = useMemo(() => recentTelemetry.slice().reverse().map((row) => row.energized ? 76 + (row.seq % 16) : 28 + (row.seq % 10)), [recentTelemetry]);

  const refresh = useCallback(async () => {
    try {
      const [dashboardRes, transformerRes] = await Promise.all([fetch(`${API_BASE}/dashboard`), fetch(`${API_BASE}/transformers`)]);
      if (!dashboardRes.ok || !transformerRes.ok) throw new Error("Backend is not responding");
      const dashboardData = await dashboardRes.json();
      const transformerData = await transformerRes.json();
      const nextSelectedDt = selectedDt || transformerData[0]?.dt_id || "";
      setDashboard(dashboardData);
      setTransformers(transformerData);
      setSelectedDt(nextSelectedDt);
      if (nextSelectedDt) {
        const polesRes = await fetch(`${API_BASE}/poles?dt_id=${encodeURIComponent(nextSelectedDt)}&limit=800`);
        if (polesRes.ok) setPoles(await polesRes.json());
      }
      setLastSync(new Date());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [selectedDt]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((open) => !open); }
      if (event.key === "Escape") { setCommandOpen(false); setSelectedTicket(null); }
      if (!commandOpen && !event.metaKey && !event.ctrlKey && ["1", "2", "3", "4", "5"].includes(event.key)) setActiveTab(navigation[Number(event.key) - 1].id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("powersense-theme", theme);
  }, [theme]);

  async function post(path, body = {}, label = "Scenario") {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Request failed");
      const ticketCount = data.tickets?.length || 0;
      const verifiedCount = data.verified?.length || 0;
      setNotice(`${label} complete · ${data.telemetry_count ?? 0} packets · ${ticketCount} incident${ticketCount === 1 ? "" : "s"}${verifiedCount ? ` · ${verifiedCount} verified` : ""}`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateTicketStatus(ticketId, status) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Status update failed");
      if (data.blocked) {
        setSelectedTicket((ticket) => ticket?.ticket_id === ticketId ? { ...ticket, ...data } : ticket);
        await refresh();
        setError(data.message || "This action needs more telemetry before it can be completed.");
        return;
      }
      setNotice(`${ticketId} is now ${statusLabel(data.status)}`);
      setSelectedTicket((ticket) => ticket?.ticket_id === ticketId ? { ...ticket, ...data } : ticket);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function jumpTo(tab) {
    setActiveTab(tab);
    setCommandOpen(false);
  }

  function selectTicket(ticket) {
    setSelectedTicket(ticket);
  }

  function renderContent() {
    if (activeTab === "Map") return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Geospatial operations</span><h1>Network map</h1><p>Trace energized paths, missing sensors, and probable fault boundaries.</p></div><div className="heading-actions"><span className="map-mode"><span className="live-dot" />Schematic mode</span><ActionButton icon="refresh" onClick={refresh} variant="secondary">Refresh map</ActionButton></div></div><div className="map-page-grid"><section className="panel map-panel"><SchematicMap onSelectPole={setSelectedPole} onSelectTicket={selectTicket} poles={poles} selectedPoleId={selectedPole?.pole_id} tickets={tickets} transformer={selectedTransformer} /></section><section className="panel side-insight"><span className="eyebrow">Selected node</span>{selectedPole ? <><div className="node-insight-head"><span className={cx("node-insight-icon", selectedPole.is_transformer ? "insight-transformer" : selectedPole.is_energized ? "insight-live" : "insight-dark")}><Icon name={selectedPole.is_transformer ? "bolt" : "target"} size={18} /></span><div><h2>{selectedPole.pole_id}</h2><span>{selectedPole.is_transformer ? "Distribution transformer" : selectedPole.is_energized ? "Energized pole" : "Dark pole"}</span></div></div><div className="node-facts"><div><span>Feeder</span><strong>{selectedPole.feeder_id || selectedTransformer?.feeder_id || "—"}</strong></div><div><span>DT / Ward</span><strong>{selectedPole.dt_id || selectedPole.ward || "—"}</strong></div><div><span>Device</span><strong>{selectedPole.device_id || "Not installed"}</strong></div><div><span>Last signal</span><strong>{formatRelative(selectedPole.last_telemetry_at)}</strong></div></div><div className="node-insight-note"><Icon name="spark" size={16} /><span>{selectedPole.is_transformer ? "Transformer anchor for this network slice." : selectedPole.is_energized ? "This node is supporting the live downstream path." : "This node is part of the current dark boundary."}</span></div></> : <div className="node-placeholder"><Icon name="target" size={26} /><strong>Click a node to inspect it</strong><span>Use the map as a fast spatial index into your network.</span></div>}</section></div></div>;
    if (activeTab === "Tickets") return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Human-in-the-loop workflow</span><h1>Incident queue</h1><p>Prioritize what needs a crew now, with evidence attached.</p></div><div className="heading-stat"><strong>{activeTickets.length}</strong><span>active incidents</span></div></div><TicketTable onSelect={selectTicket} onStatus={updateTicketStatus} tickets={tickets} /></div>;
    if (activeTab === "Telemetry") return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Device observability</span><h1>Signal stream</h1><p>Every packet is auditable, deduplicated, and classified before it changes state.</p></div><div className="heading-stat"><strong>{signalContinuity}%</strong><span>clean signal rate</span></div></div><TelemetryTable telemetry={recentTelemetry} /></div>;
    if (activeTab === "Simulation") return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">Operator training</span><h1>Scenario lab</h1><p>Practice the response loop without touching a real field device.</p></div><div className="heading-stat"><strong>8</strong><span>safe scenarios</span></div></div><SimulationView busy={busy} feederId={feederId} fromSeq={fromSeq} post={post} selectedDt={selectedDt} /></div>;
    return <>
      <section className="hero-panel"><div className="hero-copy"><div className="hero-eyebrow"><span className="live-dot" />Shift overview · {lastSync ? `synced ${formatRelative(lastSync)}` : "connecting"}</div><h1>See outages early.<br /><em>Restore with confidence.</em></h1><p>PowerSense turns pole signals into a simple response path: find the problem, send a crew, and confirm the repair.</p><div className="hero-actions"><ActionButton icon="alert" onClick={() => jumpTo("Tickets")} variant="primary">See open incidents</ActionButton><ActionButton icon="spark" onClick={() => jumpTo("Simulation")} variant="ghost-dark">Try a practice scenario</ActionButton></div></div><div className="hero-visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-core"><Icon name="bolt" size={26} /><span>GRID<br />PULSE</span></div><div className="hero-signal signal-one"><span>98.4%</span><small>signal health</small></div><div className="hero-signal signal-two"><span>{stats.affected_poles || 0}</span><small>poles without power</small></div><Sparkline color="#7ce4bd" height={120} values={telemetryTrend} /></div></section>
      <section className="metric-grid"><MetricCard accent="coral" detail={activeTickets.length ? `${activeTickets.filter((ticket) => ticket.fault_type !== "span").length} wide-area` : "No active response required"} icon="alert" label="Active incidents" onClick={() => jumpTo("Tickets")} value={stats.active_faults ?? 0} /><MetricCard accent="amber" detail={stats.critical_faults ? "Crew attention required" : "No critical events"} icon="bolt" label="Critical exposure" value={stats.critical_faults ?? 0} /><MetricCard accent="blue" detail={selectedTransformer ? `${selectedTransformer.dt_id} in focus` : "Select a transformer"} icon="satellite" label="Devices offline" value={stats.devices_offline ?? 0} /><MetricCard accent="violet" detail={selectedTransformer ? `${selectedTransformer.pole_count || 0} poles in slice` : "Network wide"} icon="map" label="Poles without power" value={stats.affected_poles ?? 0} /><MetricCard accent="mint" detail={`${signalContinuity}% packets applied cleanly`} icon="pulse" label="Signal continuity" value={`${signalContinuity}%`} /></section>
      <div className="dashboard-grid"><section className="panel map-panel dashboard-map"><div className="panel-header"><div><span className="eyebrow">Where power is flowing</span><h2>Live network view</h2></div><button className="text-link" onClick={() => jumpTo("Map")} type="button">Open full map <Icon name="arrow" size={15} /></button></div><SchematicMap onSelectPole={setSelectedPole} onSelectTicket={selectTicket} poles={poles} selectedPoleId={selectedPole?.pole_id} tickets={tickets} transformer={selectedTransformer} /></section><section className="panel incidents-panel"><div className="panel-header"><div><span className="eyebrow">Needs a response</span><h2>Open incidents</h2></div><span className="queue-count">{activeTickets.length} open</span></div><div className="incident-list">{activeTickets.slice(0, 4).map((ticket) => <IncidentCard key={ticket.ticket_id} onSelect={selectTicket} ticket={ticket} />)}{!activeTickets.length && <div className="empty-state"><span className="empty-check"><Icon name="check" size={18} /></span><strong>Everything looks good.</strong><span>No open incidents need a crew right now.</span></div>}</div>{activeTickets.length > 4 && <button className="view-all-link" onClick={() => jumpTo("Tickets")} type="button">See all open incidents <Icon name="arrow" size={15} /></button>}</section></div>
      <div className="bottom-grid"><SignalHealthPanel values={telemetryTrend} /><section className="panel focus-panel"><div className="panel-header"><div><span className="eyebrow">Choose what to inspect</span><h2>{selectedTransformer?.dt_id || "Choose a transformer"}</h2></div><span className={cx("topology-badge", selectedTransformer?.has_known_topology ? "topology-known" : "topology-estimated")}>{selectedTransformer?.has_known_topology ? "Verified layout" : "Estimated layout"}</span></div><div className="focus-select"><Icon name="map" size={17} /><select aria-label="Choose transformer" onChange={(event) => { setSelectedDt(event.target.value); setSelectedPole(null); }} value={selectedDt}>{transformers.map((transformer) => <option key={transformer.dt_id} value={transformer.dt_id}>{transformer.dt_id} · {transformer.feeder_id}</option>)}</select><Icon name="chevron" size={15} /></div>{selectedTransformer ? <div className="focus-facts"><div><span>Feeder</span><strong>{selectedTransformer.feeder_id}</strong></div><div><span>Capacity</span><strong>{selectedTransformer.capacity_kva || "—"} kVA</strong></div><div><span>Homes served</span><strong>{selectedTransformer.households_served || "—"}</strong></div></div> : <div className="focus-empty">Choose a transformer to see its poles, devices, and power status.</div>}<div className="focus-note"><Icon name="spark" size={15} /><span>Focus mode narrows the screen to one transformer and its connected poles.</span><button aria-label="Enable focus mode" onClick={() => setFocusMode((mode) => !mode)} type="button">{focusMode ? "On" : "Turn on"}</button></div></section></div>
    </>;
  }

  return <div className={cx("app-shell", focusMode && "focus-mode", theme === "light" && "light-theme")}>
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Icon name="bolt" size={18} /></span><div><strong>PowerSense</strong><span>OUTAGE INTELLIGENCE</span></div></div><div className="sidebar-section-label">Main views</div><nav className="side-nav">{navigation.map((item, index) => <button className={cx("nav-item", activeTab === item.id && "nav-active")} key={item.id} onClick={() => setActiveTab(item.id)} type="button"><span className="nav-icon"><Icon name={item.icon} size={17} /></span><span>{item.label}</span>{item.id === "Tickets" && activeTickets.length > 0 && <b>{activeTickets.length}</b>}<kbd>{index + 1}</kbd></button>)}</nav><div className="sidebar-spacer" /><div className="network-status"><div className="status-heading"><span className="live-dot" />Connection status</div><strong>Everything is running</strong><span>Live device connection · 42ms</span><div className="status-bar"><i /></div></div><div className="sidebar-footer"><button className="operator-chip" type="button"><span className="avatar">OP</span><span><strong>Control room</strong><small>Operator online</small></span><span className="online-dot" /></button></div></aside>
    <section className="workspace"><header className="topbar"><div className="breadcrumbs"><span>PowerSense</span><Icon name="arrow" size={13} /><strong>{navigation.find((item) => item.id === activeTab)?.label}</strong></div><div className="topbar-actions"><button className="command-button" onClick={() => setCommandOpen(true)} type="button"><Icon name="command" size={16} /><span>Quick actions</span><kbd>⌘ K</kbd></button><div className="sync-status"><span className="live-dot" />Live <span className="sync-time">{lastSync ? formatTime(lastSync) : "—"}</span></div><button className={cx("focus-button", focusMode && "focus-enabled")} onClick={() => setFocusMode((mode) => !mode)} type="button"><Icon name="target" size={16} />{focusMode ? "Focus on" : "Focus mode"}</button><button className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} type="button"><Icon name={theme === "dark" ? "sun" : "moon"} size={16} /><span>{theme === "dark" ? "Light" : "Dark"}</span></button><button className="icon-button" aria-label="Refresh data" onClick={refresh} type="button"><Icon name="refresh" size={17} /></button></div></header><main className="content-area">{(error || notice) && <div className={cx("toast", error ? "toast-error" : "toast-success")}><span>{error ? <Icon name="alert" size={16} /> : <Icon name="check" size={16} />}</span><div className="toast-copy"><strong>{error ? "Action needs attention" : "Update complete"}</strong><span>{error ? readableError(error) : notice}</span></div><button aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }} type="button"><Icon name="close" size={15} /></button></div>}{renderContent()}</main></section>
    {selectedTicket && <TicketDrawer onClose={() => setSelectedTicket(null)} onStatus={updateTicketStatus} ticket={selectedTicket} />}
    {commandOpen && <CommandPalette onAction={(action) => { if (action === "span") post("/simulate/span-fault", { dt_id: selectedDt, from_seq: fromSeq }, "Span fault"); }} onClose={() => setCommandOpen(false)} onNavigate={jumpTo} />}
  </div>;
}

export default App;
