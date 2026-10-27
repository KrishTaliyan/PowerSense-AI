import ActionButton from "../components/ActionButton.jsx";
import Icon from "../components/Icon.jsx";
import IncidentCard from "../components/IncidentCard.jsx";
import LazyMap from "../components/LazyMap.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import SignalHealthPanel from "../components/SignalHealthPanel.jsx";
import { cx, formatRelative, incidentPriority } from "../utils/format.js";

function gridStatus(activeTickets, stats) {
  const critical = activeTickets.filter((ticket) => incidentPriority(ticket).tone === "critical").length;
  if (!activeTickets.length) {
    return {
      tone: "ok",
      icon: "check",
      title: "All monitored circuits are energized",
      detail: "No open incidents. The localizer is watching every reporting pole.",
    };
  }
  return {
    tone: critical ? "critical" : "warning",
    icon: "alert",
    title: `${activeTickets.length} active incident${activeTickets.length === 1 ? "" : "s"}${critical ? ` · ${critical} critical` : ""}`,
    detail: `${stats.affected_poles || 0} pole${stats.affected_poles === 1 ? "" : "s"} without power. Work the highest-impact incident first.`,
  };
}

export default function OverviewPage({
  activeTickets,
  changeTransformer,
  error,
  focusMode,
  jumpTo,
  lastSync,
  loading,
  poles,
  recentTelemetry,
  refresh,
  selectTicket,
  selectedPole,
  selectedTransformer,
  setFocusMode,
  setSelectedPole,
  signalContinuity,
  stats,
  theme,
  tickets,
  transformers,
}) {
  if (loading) return <PageSkeleton rows={5} />;
  if (error && !transformers.length) return <ErrorState detail={error} onRetry={refresh} />;

  const status = gridStatus(activeTickets, stats);
  const wideArea = activeTickets.filter((ticket) => ticket.fault_type !== "span").length;

  return (
    <div className="page-stack" data-tour="overview">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Grid overview</h1>
          <p>{stats.transformers ?? transformers.length} transformers monitored · {lastSync ? `synced ${formatRelative(lastSync)}` : "connecting"}</p>
        </div>
        <div className="heading-actions">
          <ActionButton icon="flask" onClick={() => jumpTo("Simulation")} variant="secondary">Run a scenario</ActionButton>
          <ActionButton icon="alert" onClick={() => jumpTo("Tickets")} variant="primary">Open incidents</ActionButton>
        </div>
      </div>

      <section className={cx("status-banner", `status-banner-${status.tone}`)}>
        <span className="status-banner-icon"><Icon name={status.icon} size={18} /></span>
        <div className="status-banner-copy"><strong>{status.title}</strong><span>{status.detail}</span></div>
        <dl className="status-banner-facts">
          <div><dt>Avg. restoration</dt><dd>{stats.average_resolution_minutes != null ? `${stats.average_resolution_minutes} min` : "—"}</dd></div>
          <div><dt>Clean signal rate</dt><dd>{signalContinuity}%</dd></div>
        </dl>
      </section>

      <section className="metric-grid" data-tour="metrics">
        <MetricCard accent="danger" detail={activeTickets.length ? `${wideArea} wide-area` : "No response required"} help="Open tickets that have not yet been verified or closed." icon="alert" label="Active incidents" onClick={() => jumpTo("Tickets")} value={stats.active_faults ?? 0} />
        <MetricCard accent="warning" detail={stats.critical_faults ? "Crew attention required" : "No critical events"} help="Feeder or transformer events, plus span faults affecting many poles." icon="bolt" label="Critical exposure" value={stats.critical_faults ?? 0} />
        <MetricCard accent="info" detail="No signal in the last 15 min" help="Devices whose last signal is older than the offline threshold. This is sensor health, not proof of an outage." icon="satellite" label="Devices offline" value={(stats.devices_offline ?? 0).toLocaleString()} />
        <MetricCard accent="violet" detail={selectedTransformer ? `${selectedTransformer.pole_count || 0} poles in ${selectedTransformer.dt_id}` : "Network wide"} help="Poles currently marked de-energized from applied telemetry." icon="map" label="Poles without power" value={stats.affected_poles ?? 0} />
        <MetricCard accent="success" detail={`Last ${recentTelemetry.length || 0} packets`} help="Share of recent packets accepted after duplicate and stale-message checks." icon="pulse" label="Signal continuity" value={`${signalContinuity}%`} />
      </section>

      <div className="dashboard-grid">
        <section className="panel map-panel dashboard-map">
          <div className="panel-header">
            <div><span className="eyebrow">Live network</span><h2>{selectedTransformer ? `${selectedTransformer.dt_id} · ${selectedTransformer.feeder_id}` : "Network view"}</h2></div>
            <button className="text-link" onClick={() => jumpTo("Map")} type="button">Open full map <Icon name="arrow" size={14} /></button>
          </div>
          <LazyMap compact onSelectPole={setSelectedPole} onSelectTicket={selectTicket} poles={poles} selectedPoleId={selectedPole?.pole_id} theme={theme} tickets={tickets} transformer={selectedTransformer} />
        </section>
        <section className="panel incidents-panel">
          <div className="panel-header"><div><span className="eyebrow">Needs a response</span><h2>Open incidents</h2></div><span className={cx("count-badge", activeTickets.length && "count-badge-alert")}>{activeTickets.length} open</span></div>
          <div className="incident-list">
            {activeTickets.slice(0, 4).map((ticket) => <IncidentCard key={ticket.ticket_id} onSelect={selectTicket} ticket={ticket} />)}
            {!activeTickets.length && <div className="empty-state"><span className="empty-check"><Icon name="check" size={18} /></span><strong>All clear</strong><span>No open incidents need a crew right now.</span><button className="text-link" onClick={() => jumpTo("Simulation")} type="button">Simulate a fault <Icon name="arrow" size={14} /></button></div>}
          </div>
          {activeTickets.length > 4 && <button className="view-all-link" onClick={() => jumpTo("Tickets")} type="button">View all {activeTickets.length} incidents <Icon name="arrow" size={14} /></button>}
        </section>
      </div>

      <div className="bottom-grid">
        <SignalHealthPanel telemetry={recentTelemetry} />
        <section className="panel focus-panel">
          <div className="panel-header"><div><span className="eyebrow">Transformer in focus</span><h2>{selectedTransformer?.dt_id || "Choose a transformer"}</h2></div><span className={cx("topology-badge", selectedTransformer?.has_known_topology ? "topology-known" : "topology-estimated")}>{selectedTransformer?.has_known_topology ? "Verified layout" : "Estimated layout"}</span></div>
          <div className="focus-body">
            <label className="focus-select">
              <Icon name="layers" size={16} />
              <select aria-label="Choose transformer" onChange={(event) => changeTransformer(event.target.value)} value={selectedTransformer?.dt_id || ""}>
                {transformers.map((transformer) => <option key={transformer.dt_id} value={transformer.dt_id}>{transformer.dt_id} · {transformer.feeder_id}</option>)}
              </select>
              <Icon name="chevron" size={15} />
            </label>
            {selectedTransformer ? (
              <div className="focus-facts">
                <div><span>Feeder</span><strong>{selectedTransformer.feeder_id}</strong></div>
                <div><span>Capacity</span><strong>{selectedTransformer.capacity_kva || "—"} kVA</strong></div>
                <div><span>Homes served</span><strong>{selectedTransformer.households_served?.toLocaleString() || "—"}</strong></div>
                <div><span>Poles</span><strong>{selectedTransformer.pole_count || 0}</strong></div>
                <div><span>Sensors</span><strong>{selectedTransformer.device_count || 0}</strong></div>
                <div><span>Coverage</span><strong>{selectedTransformer.pole_count ? `${Math.round(((selectedTransformer.device_count || 0) / selectedTransformer.pole_count) * 100)}%` : "—"}</strong></div>
              </div>
            ) : <div className="focus-empty">Choose a transformer to see its poles, devices, and power status.</div>}
            <div className="focus-note">
              <Icon name="target" size={15} />
              <span>Focus mode hides everything except this transformer, its poles and open incidents.</span>
              <button aria-pressed={focusMode} className={cx("switch", focusMode && "switch-on")} onClick={() => setFocusMode((mode) => !mode)} type="button"><span className="sr-only">Toggle focus mode</span><i /></button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
