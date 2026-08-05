import ActionButton from "../components/ActionButton.jsx";
import Icon from "../components/Icon.jsx";
import IncidentCard from "../components/IncidentCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import SchematicMap from "../components/SchematicMap.jsx";
import SignalHealthPanel from "../components/SignalHealthPanel.jsx";
import Sparkline from "../components/Sparkline.jsx";
import { cx, formatRelative } from "../utils/format.js";

export default function OverviewPage({
  activeTickets,
  error,
  focusMode,
  jumpTo,
  lastSync,
  loading,
  poles,
  refresh,
  selectTicket,
  selectedPole,
  selectedTransformer,
  setFocusMode,
  setSelectedDt,
  setSelectedPole,
  signalContinuity,
  stats,
  telemetryTrend,
  tickets,
  transformers,
}) {
  if (loading) return <PageSkeleton rows={5} />;
  if (error && !transformers.length) return <ErrorState detail={error} onRetry={refresh} />;

  return (
    <div data-tour="overview">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="live-dot" />Shift overview - {lastSync ? `synced ${formatRelative(lastSync)}` : "connecting"}</div>
          <h1>See outages early.<br /><em>Restore with confidence.</em></h1>
          <p>PowerSense turns pole signals into a simple response path: find the problem, send a crew, and confirm the repair.</p>
          <div className="hero-actions">
            <ActionButton icon="alert" onClick={() => jumpTo("Tickets")} variant="primary">See open incidents</ActionButton>
            <ActionButton icon="spark" onClick={() => jumpTo("Simulation")} variant="ghost-dark">Try a practice scenario</ActionButton>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-core"><Icon name="bolt" size={26} /><span>GRID<br />PULSE</span></div>
          <div className="hero-signal signal-one"><span>98.4%</span><small>signal health</small></div>
          <div className="hero-signal signal-two"><span>{stats.affected_poles || 0}</span><small>poles without power</small></div>
          <Sparkline color="#7ce4bd" height={120} values={telemetryTrend} />
        </div>
      </section>

      <section className="metric-grid" data-tour="metrics">
        <MetricCard accent="coral" detail={activeTickets.length ? `${activeTickets.filter((ticket) => ticket.fault_type !== "span").length} wide-area` : "No active response required"} help="Open tickets that have not yet been verified or closed." icon="alert" label="Active incidents" onClick={() => jumpTo("Tickets")} value={stats.active_faults ?? 0} />
        <MetricCard accent="amber" detail={stats.critical_faults ? "Crew attention required" : "No critical events"} help="Feeder or transformer events, plus span faults affecting many poles." icon="bolt" label="Critical exposure" value={stats.critical_faults ?? 0} />
        <MetricCard accent="blue" detail={selectedTransformer ? `${selectedTransformer.dt_id} in focus` : "Select a transformer"} help="Devices whose last signal is older than the offline threshold. This is sensor health, not proof of an outage." icon="satellite" label="Devices offline" value={stats.devices_offline ?? 0} />
        <MetricCard accent="violet" detail={selectedTransformer ? `${selectedTransformer.pole_count || 0} poles in slice` : "Network wide"} help="Poles currently marked de-energized from applied telemetry." icon="map" label="Poles without power" value={stats.affected_poles ?? 0} />
        <MetricCard accent="mint" detail={`${signalContinuity}% packets applied cleanly`} help="Share of recent packets accepted after duplicate and stale-message checks." icon="pulse" label="Signal continuity" value={`${signalContinuity}%`} />
      </section>

      <div className="dashboard-grid">
        <section className="panel map-panel dashboard-map">
          <div className="panel-header">
            <div><span className="eyebrow">Where power is flowing</span><h2>Live network view</h2></div>
            <button className="text-link" onClick={() => jumpTo("Map")} type="button">Open full map <Icon name="arrow" size={15} /></button>
          </div>
          <SchematicMap onSelectPole={setSelectedPole} onSelectTicket={selectTicket} poles={poles} selectedPoleId={selectedPole?.pole_id} tickets={tickets} transformer={selectedTransformer} />
        </section>
        <section className="panel incidents-panel">
          <div className="panel-header"><div><span className="eyebrow">Needs a response</span><h2>Open incidents</h2></div><span className="queue-count">{activeTickets.length} open</span></div>
          <div className="incident-list">
            {activeTickets.slice(0, 4).map((ticket) => <IncidentCard key={ticket.ticket_id} onSelect={selectTicket} ticket={ticket} />)}
            {!activeTickets.length && <div className="empty-state"><span className="empty-check"><Icon name="check" size={18} /></span><strong>Everything looks good.</strong><span>No open incidents need a crew right now.</span></div>}
          </div>
          {activeTickets.length > 4 && <button className="view-all-link" onClick={() => jumpTo("Tickets")} type="button">See all open incidents <Icon name="arrow" size={15} /></button>}
        </section>
      </div>

      <div className="bottom-grid">
        <SignalHealthPanel values={telemetryTrend} />
        <section className="panel focus-panel">
          <div className="panel-header"><div><span className="eyebrow">Choose what to inspect</span><h2>{selectedTransformer?.dt_id || "Choose a transformer"}</h2></div><span className={cx("topology-badge", selectedTransformer?.has_known_topology ? "topology-known" : "topology-estimated")}>{selectedTransformer?.has_known_topology ? "Verified layout" : "Estimated layout"}</span></div>
          <div className="focus-select">
            <Icon name="map" size={17} />
            <select aria-label="Choose transformer" onChange={(event) => { setSelectedDt(event.target.value); setSelectedPole(null); }} value={selectedTransformer?.dt_id || ""}>
              {transformers.map((transformer) => <option key={transformer.dt_id} value={transformer.dt_id}>{transformer.dt_id} - {transformer.feeder_id}</option>)}
            </select>
            <Icon name="chevron" size={15} />
          </div>
          {selectedTransformer ? <div className="focus-facts"><div><span>Feeder</span><strong>{selectedTransformer.feeder_id}</strong></div><div><span>Capacity</span><strong>{selectedTransformer.capacity_kva || "-"} kVA</strong></div><div><span>Homes served</span><strong>{selectedTransformer.households_served || "-"}</strong></div></div> : <div className="focus-empty">Choose a transformer to see its poles, devices, and power status.</div>}
          <div className="focus-note"><Icon name="spark" size={15} /><span>Focus mode narrows the screen to one transformer and its connected poles.</span><button aria-label="Enable focus mode" onClick={() => setFocusMode((mode) => !mode)} type="button">{focusMode ? "On" : "Turn on"}</button></div>
        </section>
      </div>
    </div>
  );
}
