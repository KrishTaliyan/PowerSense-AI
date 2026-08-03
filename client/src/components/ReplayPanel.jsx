import { useMemo, useState } from "react";
import { API_BASE } from "../constants.js";
import { cx, formatTime, titleCase } from "../utils/format.js";
import ActionButton from "./ActionButton.jsx";
import Icon from "./Icon.jsx";

export default function ReplayPanel({ ticket }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playIndex, setPlayIndex] = useState(-1);

  const visibleEvents = useMemo(() => {
    if (playIndex < 0) return events;
    return events.slice(0, playIndex + 1);
  }, [events, playIndex]);

  async function loadReplay() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticket.ticket_id}/replay`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Replay unavailable");
      setEvents(data.events || []);
      setPlayIndex(-1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function playReplay() {
    if (!events.length) return;
    setPlayIndex(0);
    events.forEach((_, index) => {
      window.setTimeout(() => setPlayIndex(index), index * 420);
    });
  }

  return (
    <div className="replay-panel">
      <div className="replay-head">
        <div>
          <span className="eyebrow">Telemetry replay</span>
          <strong>Detection to verification</strong>
        </div>
        <div className="replay-actions">
          <ActionButton disabled={loading} icon="refresh" onClick={loadReplay} variant="ghost">{events.length ? "Reload" : "Load"}</ActionButton>
          <ActionButton disabled={!events.length || loading} icon="spark" onClick={playReplay} variant="secondary">Replay</ActionButton>
        </div>
      </div>
      {loading && <div className="mini-loading"><span />Loading telemetry window...</div>}
      {error && <div className="mini-error"><Icon name="alert" size={14} />{error}</div>}
      {!loading && !error && !events.length && (
        <div className="replay-empty">Load the replay to inspect the packets that moved this incident from detection toward verification.</div>
      )}
      {!!visibleEvents.length && (
        <div className="replay-events">
          {visibleEvents.map((event) => (
            <div className={cx("replay-event", event.energized ? "replay-live" : "replay-dark")} key={event._id}>
              <span className="replay-event-dot" />
              <div>
                <strong>{event.pole_id} - {titleCase(event.event)}</strong>
                <span>{formatTime(event.received_at)} - Seq #{event.seq} - {event.is_duplicate ? "duplicate" : event.is_stale ? "stale" : "applied"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
