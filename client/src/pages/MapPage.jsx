import ActionButton from "../components/ActionButton.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";
import Icon from "../components/Icon.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import SchematicMap from "../components/SchematicMap.jsx";
import { cx, formatRelative } from "../utils/format.js";

export default function MapPage({ error, loading, poles, refresh, selectedPole, selectedTransformer, selectTicket, setSelectedPole, tickets }) {
  if (loading) return <PageSkeleton rows={2} />;
  if (error && !poles.length) return <ErrorState detail={error} onRetry={refresh} title="Network map could not load" />;

  return (
    <div className="page-stack" data-tour="map">
      <div className="page-heading">
        <div><span className="eyebrow">Geospatial operations</span><h1>Network map</h1><p>Trace energized paths, missing sensors, and probable fault boundaries.</p></div>
        <div className="heading-actions"><span className="map-mode"><span className="live-dot" />Schematic mode <HelpTooltip label="Schematic mode">A topology-first map optimized for radial feeder inspection, not turn-by-turn field routing.</HelpTooltip></span><ActionButton icon="refresh" onClick={refresh} variant="secondary">Refresh map</ActionButton></div>
      </div>
      <div className="map-page-grid">
        <section className="panel map-panel">
          <SchematicMap onSelectPole={setSelectedPole} onSelectTicket={selectTicket} poles={poles} selectedPoleId={selectedPole?.pole_id} tickets={tickets} transformer={selectedTransformer} />
        </section>
        <section className="panel side-insight">
          <span className="eyebrow">Selected node</span>
          {selectedPole ? (
            <>
              <div className="node-insight-head"><span className={cx("node-insight-icon", selectedPole.is_transformer ? "insight-transformer" : selectedPole.is_energized ? "insight-live" : "insight-dark")}><Icon name={selectedPole.is_transformer ? "bolt" : "target"} size={18} /></span><div><h2>{selectedPole.pole_id}</h2><span>{selectedPole.is_transformer ? "Distribution transformer" : selectedPole.is_energized ? "Energized pole" : "Dark pole"}</span></div></div>
              <div className="node-facts"><div><span>Feeder</span><strong>{selectedPole.feeder_id || selectedTransformer?.feeder_id || "-"}</strong></div><div><span>DT / Ward</span><strong>{selectedPole.dt_id || selectedPole.ward || "-"}</strong></div><div><span>Device</span><strong>{selectedPole.device_id || "Not installed"}</strong></div><div><span>Last signal</span><strong>{formatRelative(selectedPole.last_telemetry_at)}</strong></div></div>
              <div className="node-insight-note"><Icon name="spark" size={16} /><span>{selectedPole.is_transformer ? "Transformer anchor for this network slice." : selectedPole.is_energized ? "This node is supporting the live downstream path." : "This node is part of the current dark boundary."}</span></div>
            </>
          ) : (
            <div className="node-placeholder"><Icon name="target" size={26} /><strong>Click a node to inspect it</strong><span>Use the map as a fast spatial index into your network.</span></div>
          )}
        </section>
      </div>
    </div>
  );
}
