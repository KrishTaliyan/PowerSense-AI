import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../constants.js";
import { cx, formatTime, titleCase } from "../utils/format.js";
import ActionButton from "./ActionButton.jsx";
import Icon from "./Icon.jsx";

export default function ReplayPanel({ ticket }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playIndex, setPlayIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentIndex = events.length && playIndex >= 0 ? Math.min(playIndex, events.length - 1) : -1;
  const currentEvent = currentIndex >= 0 ? events[currentIndex] : null;
  const progress = events.length && currentIndex >= 0 ? Math.round(((currentIndex + 1) / events.length) * 100) : 0;

  const visibleEvents = useMemo(() => {
    if (playIndex < 0) return events;
    return events.slice(0, currentIndex + 1);
  }, [currentIndex, events, playIndex]);

  useEffect(() => {
    if (!isPlaying || !events.length) return undefined;
    const isAtEnd = currentIndex >= events.length - 1;

    const timer = window.setTimeout(() => {
      if (isAtEnd) {
        setIsPlaying(false);
        return;
      }
      setPlayIndex((index) => Math.min(events.length - 1, Math.max(index, 0) + 1));
    }, isAtEnd ? 0 : 560);

    return () => window.clearTimeout(timer);
  }, [currentIndex, events.length, isPlaying]);

  async function loadReplay() {
    setLoading(true);
    setError("");
    setIsPlaying(false);
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
    if (playIndex < 0 || currentIndex >= events.length - 1) {
      setPlayIndex(0);
    }
    setIsPlaying(true);
  }

  function pauseReplay() {
    setIsPlaying(false);
  }

  function stepReplay(offset) {
    if (!events.length) return;
    setIsPlaying(false);
    setPlayIndex((index) => {
      const baseIndex = index < 0 ? (offset > 0 ? -1 : 0) : index;
      return Math.min(events.length - 1, Math.max(0, baseIndex + offset));
    });
  }

  function scrubReplay(event) {
    setIsPlaying(false);
    setPlayIndex(Number(event.target.value));
  }

  return (
    <div className="replay-panel" data-tour="telemetry-replay">
      <div className="replay-head">
        <div>
          <span className="eyebrow">Telemetry replay</span>
          <strong>Detection to verification</strong>
        </div>
        <div className="replay-actions">
          <ActionButton disabled={loading} icon="refresh" onClick={loadReplay} variant="ghost">{events.length ? "Reload" : "Load"}</ActionButton>
          <ActionButton disabled={!events.length || loading || currentIndex <= 0} icon="rewind" onClick={() => stepReplay(-1)} variant="ghost">Step back</ActionButton>
          <ActionButton disabled={!events.length || loading} icon={isPlaying ? "pause" : "play"} onClick={isPlaying ? pauseReplay : playReplay} variant="secondary">{isPlaying ? "Pause" : currentIndex > 0 ? "Resume" : "Replay"}</ActionButton>
          <ActionButton disabled={!events.length || loading || currentIndex >= events.length - 1} icon="fastForward" onClick={() => stepReplay(1)} variant="ghost">Step next</ActionButton>
        </div>
      </div>
      {loading && <div className="mini-loading"><span />Loading telemetry window...</div>}
      {error && <div className="mini-error"><Icon name="alert" size={14} />{error}</div>}
      {!loading && !error && !events.length && (
        <div className="replay-empty">Load the replay to inspect the packets that moved this incident from detection toward verification.</div>
      )}
      {!!events.length && (
        <div className="replay-stage">
          <div className="replay-stage-top">
            <span>{currentEvent ? `${currentEvent.pole_id} at ${formatTime(currentEvent.received_at)}` : "Ready to animate telemetry"}</span>
            <strong>{progress}%</strong>
          </div>
          <div className="replay-progress"><i style={{ width: `${progress}%` }} /></div>
          <input aria-label="Scrub telemetry replay" max={events.length - 1} min="0" onChange={scrubReplay} type="range" value={currentIndex < 0 ? 0 : currentIndex} />
          <div className="replay-timeline" style={{ gridTemplateColumns: `repeat(${events.length}, minmax(16px, 1fr))` }}>
            {events.map((event, index) => (
              <button
                aria-label={`Show packet ${index + 1} from ${event.pole_id}`}
                className={cx("replay-tick", index <= currentIndex && "tick-seen", index === currentIndex && "tick-current", event.energized ? "tick-live" : "tick-dark")}
                key={event._id || `${event.pole_id}-${event.seq}-${index}`}
                onClick={() => { setIsPlaying(false); setPlayIndex(index); }}
                title={`${event.pole_id} - ${titleCase(event.event)}`}
                type="button"
              />
            ))}
          </div>
          <div className="replay-now">
            <span className={cx("replay-now-icon", currentEvent?.energized ? "replay-live" : "replay-dark")}><Icon name={currentEvent?.energized ? "pulse" : "alert"} size={16} /></span>
            <div>
              <strong>{currentEvent ? `${currentEvent.pole_id} - ${titleCase(currentEvent.event)}` : "Timeline ready"}</strong>
              <span>{currentEvent ? `Seq #${currentEvent.seq} - ${currentEvent.is_duplicate ? "duplicate ignored" : currentEvent.is_stale ? "stale ignored" : "packet applied"}` : `${events.length} packets loaded. Press Replay to animate the detection path.`}</span>
            </div>
          </div>
        </div>
      )}
      {!!visibleEvents.length && (
        <div className="replay-events">
          {visibleEvents.map((event, index) => (
            <div className={cx("replay-event", event.energized ? "replay-live" : "replay-dark", index === currentIndex && "replay-event-current")} key={event._id || `${event.pole_id}-${event.seq}-${index}`}>
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
