import ActionButton from "../components/ActionButton.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";
import Icon from "../components/Icon.jsx";
import LazyMap from "../components/LazyMap.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import { cx, formatRelative } from "../utils/format.js";

function nodeStatus(node) {
  if (node.is_transformer) return { label: "Distribution transformer", tone: "transformer", icon: "bolt" };
  if (!node.device_id) return { label: "No sensor installed", tone: "missing", icon: "satellite" };
  return node.is_energized ? { label: "Energized", tone: "live", icon: "check" } : { label: "De-energized", tone: "dark", icon: "alert" };
}

export default function MapPage({ error, focusTicket, loading, poles, refresh, selectedPole, selectedTransformer, selectTicket, setSelectedPole, theme, tickets }) {
  if (loading) return <PageSkeleton rows={2} />;
  if (error && !poles.length) return <ErrorState detail={error} onRetry={refresh} title="Network map could not load" />;

  const status = selectedPole ? nodeStatus(selectedPole) : null;
  const energized = poles.filter((pole) => pole.device_id && pole.is_energized).length;
  const dark = poles.filter((pole) => pole.device_id && !pole.is_energized).length;
  const unmonitored = poles.filter((pole) => !pole.device_id).length;

  return (
    <div className="page-stack" data-tour="map">
      <div className="page-heading">
        <div><span className="eyebrow">Geospatial operations</span><h1>Network map</h1><p>Trace energized paths, missing sensors, and probable fault boundaries.</p></div>
        <div className="heading-actions">
          <span className="map-mode">OpenStreetMap data <HelpTooltip label="Network map">OpenStreetMap tiles with topology overlays and incident focus. No paid API key is required.</HelpTooltip></span>
          <ActionButton icon="refresh" onClick={refresh} variant="secondary">Refresh</ActionButton>
        </div>
      </div>
      <div className="map-page-grid">
        <section className="panel map-panel">
          <LazyMap focusTicket={focusTicket} onSelectPole={setSelectedPole} onSelectTicket={selectTicket} poles={poles} selectedPoleId={selectedPole?.pole_id} theme={theme} tickets={tickets} transformer={selectedTransformer} />
        </section>
        <aside className="map-side">
          <section className="panel side-insight">
            <span className="eyebrow">Selected node</span>
            {selectedPole ? (
              <>
                <div className="node-insight-head">
                  <span className={cx("node-insight-icon", `insight-${status.tone}`)}><Icon name={status.icon} size={17} /></span>
                  <div><h2>{selectedPole.pole_id}</h2><span>{status.label}</span></div>
                </div>
                <div className="node-facts">
                  <div><span>Feeder</span><strong>{selectedPole.feeder_id || selectedTransformer?.feeder_id || "—"}</strong></div>
                  <div><span>Transformer</span><strong>{selectedPole.dt_id || "—"}</strong></div>
                  <div><span>Device</span><strong>{selectedPole.is_transformer ? "—" : selectedPole.device_id || "Not installed"}</strong></div>
                  <div><span>Last signal</span><strong>{selectedPole.is_transformer ? "—" : formatRelative(selectedPole.last_telemetry_at)}</strong></div>
                </div>
                <div className="node-insight-note"><Icon name="spark" size={15} /><span>{selectedPole.is_transformer ? "Transformer anchor for this network slice." : !selectedPole.device_id ? "Unmonitored pole. Its state is inferred from neighbouring sensors." : selectedPole.is_energized ? "This node is supporting the live downstream path." : "This node is part of the current dark boundary."}</span></div>
                <button className="text-link" onClick={() => setSelectedPole(null)} type="button">Clear selection</button>
              </>
            ) : (
              <div className="node-placeholder"><Icon name="target" size={22} /><strong>Select a node on the map</strong><span>Click any pole or the transformer marker to inspect its sensor and power state.</span></div>
            )}
          </section>
          <section className="panel side-insight">
            <span className="eyebrow">{selectedTransformer?.dt_id || "Slice"} summary</span>
            <div className="slice-stats">
              <div><i className="legend-swatch swatch-live" /><span>Energized</span><strong>{energized}</strong></div>
              <div><i className="legend-swatch swatch-dark" /><span>De-energized</span><strong>{dark}</strong></div>
              <div><i className="legend-swatch swatch-missing" /><span>No device</span><strong>{unmonitored}</strong></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
