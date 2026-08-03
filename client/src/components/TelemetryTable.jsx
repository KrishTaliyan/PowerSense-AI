import { useState } from "react";
import Icon from "./Icon.jsx";
import { cx, formatRelative, formatTime, titleCase } from "../utils/format.js";

export default function TelemetryTable({ telemetry }) {
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
