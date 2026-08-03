import { useCallback, useMemo } from "react";
import Icon from "./Icon.jsx";
import { cx } from "../utils/format.js";

export default function SchematicMap({ poles, tickets, transformer, selectedPoleId, onSelectPole, onSelectTicket }) {
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
          title={`${pole.pole_id} - ${pole.is_energized ? "live" : "dark"}`}
          type="button"
        />
      ))}
      {transformer && positionFor(transformer.lat, transformer.lon) && (
        <button
          aria-label={`${transformer.dt_id} transformer`}
          className="transformer-node"
          onClick={() => onSelectPole({ ...transformer, pole_id: transformer.dt_id, is_transformer: true })}
          style={{ left: `${positionFor(transformer.lat, transformer.lon).x}%`, top: `${positionFor(transformer.lat, transformer.lon).y}%` }}
          title={`${transformer.dt_id} - ${transformer.capacity_kva || "-"} kVA`}
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
