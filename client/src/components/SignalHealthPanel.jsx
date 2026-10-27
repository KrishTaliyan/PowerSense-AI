import { useState } from "react";
import Icon from "./Icon.jsx";
import { cx, formatTime, titleCase } from "../utils/format.js";

function packetState(row) {
  if (row.is_duplicate || row.is_stale) return { key: "ignored", label: row.is_duplicate ? "Duplicate · ignored" : "Stale · ignored" };
  return row.energized ? { key: "live", label: "Applied · power on" } : { key: "dark", label: "Applied · power off" };
}

export default function SignalHealthPanel({ telemetry }) {
  const [hovered, setHovered] = useState(null);
  // The API returns newest first; read left to right as oldest to newest.
  const packets = telemetry.slice().reverse();
  const counts = packets.reduce((acc, row) => {
    acc[packetState(row).key] += 1;
    return acc;
  }, { live: 0, dark: 0, ignored: 0 });
  const active = hovered != null ? packets[hovered] : null;

  return (
    <section className="panel signal-panel">
      <div className="panel-header">
        <div><span className="eyebrow">Recent device messages</span><h2>Power signal health</h2></div>
        <div className="signal-legend" aria-label="Legend">
          <span><i className="legend-dot dot-live" />Power on <b>{counts.live}</b></span>
          <span><i className="legend-dot dot-dark" />Power off <b>{counts.dark}</b></span>
          <span><i className="legend-dot dot-ignored" />Ignored <b>{counts.ignored}</b></span>
        </div>
      </div>
      {packets.length ? (
        <div className="signal-body">
          <div className="signal-strip" onMouseLeave={() => setHovered(null)} role="list" aria-label="Recent packets, oldest to newest">
            {packets.map((row, index) => {
              const state = packetState(row);
              return (
                <button
                  aria-label={`${row.pole_id} ${titleCase(row.event)} at ${formatTime(row.received_at)}, ${state.label}`}
                  className={cx("signal-bar", `signal-${state.key}`, hovered === index && "signal-bar-active")}
                  key={row._id || `${row.device_id}-${row.seq}-${index}`}
                  onBlur={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onMouseEnter={() => setHovered(index)}
                  role="listitem"
                  type="button"
                />
              );
            })}
          </div>
          <div className="chart-axis"><span>Oldest of last {packets.length}</span><span>Latest</span></div>
          <div className="signal-readout" aria-live="polite">
            {active ? (
              <>
                <strong>{active.pole_id}</strong>
                <span>{titleCase(active.event)} · seq #{active.seq} · {formatTime(active.received_at)}</span>
                <span className={cx("signal-readout-state", `readout-${packetState(active).key}`)}>{packetState(active).label}</span>
              </>
            ) : <span>Hover a bar to inspect a packet.</span>}
          </div>
        </div>
      ) : (
        <div className="chart-empty">
          <span className="chart-empty-icon"><Icon name="radio" size={18} /></span>
          <strong>Waiting for device messages</strong>
          <span>Packets appear here as poles report their power state.</span>
        </div>
      )}
    </section>
  );
}
