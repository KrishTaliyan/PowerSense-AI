import { useState } from "react";
import HelpTooltip from "./HelpTooltip.jsx";
import Icon from "./Icon.jsx";
import { cx, formatRelative, formatTime, titleCase } from "../utils/format.js";

export default function TelemetryTable({ telemetry }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = telemetry.filter((row) => `${row.pole_id} ${row.device_id} ${row.event}`.toLowerCase().includes(normalizedQuery));
  const clean = telemetry.filter((row) => !row.is_duplicate && !row.is_stale).length;
  const duplicates = telemetry.filter((row) => row.is_duplicate).length;
  const stale = telemetry.filter((row) => row.is_stale).length;

  return (
    <>
      <section className="summary-grid">
        <div className="summary-card"><span className="summary-dot dot-live" /><div><strong>{clean}</strong><span>Clean packets <HelpTooltip label="Clean packets">Messages accepted into pole state after sequence validation.</HelpTooltip></span></div></div>
        <div className="summary-card"><span className="summary-dot dot-warning" /><div><strong>{duplicates}</strong><span>Duplicates quarantined <HelpTooltip label="Duplicate packets">Same device sequence seen again. Stored for audit, ignored for state changes.</HelpTooltip></span></div></div>
        <div className="summary-card"><span className="summary-dot dot-ignored" /><div><strong>{stale}</strong><span>Stale packets ignored <HelpTooltip label="Stale packets">Older sequence than the current device state. Stored for audit, ignored for localization.</HelpTooltip></span></div></div>
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="toolbar-title"><h2>Packet stream</h2><span className="stream-live"><span className="status-indicator" />Last {telemetry.length} packets</span></div>
          <label className="search-field"><Icon name="search" size={15} /><input aria-label="Search telemetry" onChange={(event) => setQuery(event.target.value)} placeholder="Search pole, device or event" value={query} /></label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Received</th><th>Source</th><th>Event</th><th>Power state</th><th>Sequence <HelpTooltip label="Sequence">Per-device monotonic counter used to detect duplicate and stale messages.</HelpTooltip></th><th>Quality</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id}>
                  <td><strong>{formatTime(row.received_at)}</strong><span className="table-sub">{formatRelative(row.received_at)}</span></td>
                  <td><strong className="mono-text">{row.pole_id}</strong><span className="table-sub">{row.device_id}</span></td>
                  <td><span className={cx("event-chip", row.event === "power_lost" ? "event-danger" : row.event === "power_restored" ? "event-success" : "event-neutral")}>{titleCase(row.event)}</span></td>
                  <td><span className={cx("power-state", row.energized ? "power-live" : "power-dark")}><i />{row.energized ? "Energized" : "Dark"}</span></td>
                  <td className="mono-text">#{row.seq}</td>
                  <td><span className={cx("quality-chip", row.is_duplicate ? "quality-warn" : row.is_stale ? "quality-muted" : "quality-clean")}>{row.is_duplicate ? "Duplicate" : row.is_stale ? "Stale" : "Applied"}</span></td>
                </tr>
              ))}
              {!filtered.length && <tr className="empty-row"><td colSpan="6"><div className="empty-state"><span className="empty-check"><Icon name="radio" size={18} /></span><strong>{telemetry.length ? "No packets match your search" : "No telemetry yet"}</strong><span>{telemetry.length ? "Try a pole ID, device ID or event name." : "Packets appear here as the simulator or devices report in."}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
