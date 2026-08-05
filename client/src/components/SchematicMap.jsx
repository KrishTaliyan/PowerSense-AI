import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import Icon from "./Icon.jsx";
import { cx, estimatedFaultSpan } from "../utils/format.js";

const mapAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function isOpen(ticket) {
  return ticket && !["verified", "closed"].includes(ticket.status);
}

function validPoint(entity) {
  return Number.isFinite(Number(entity?.lat)) && Number.isFinite(Number(entity?.lon));
}

function point(entity) {
  return [Number(entity.lat), Number(entity.lon)];
}

function pinHtml(className, label = "") {
  return `<span class="${className}">${label}</span>`;
}

function markerIcon(className, label = "", size = 26) {
  return L.divIcon({
    className: "ps-leaflet-icon",
    html: pinHtml(className, label),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const transformerIcon = markerIcon("leaflet-transformer", "DT", 32);
const faultIcon = markerIcon("leaflet-fault", "!", 34);
const boundaryIcon = markerIcon("leaflet-boundary", "", 18);
const lastLiveIcon = markerIcon("leaflet-boundary-live", "LIVE", 34);
const firstDarkIcon = markerIcon("leaflet-boundary-dark", "DARK", 34);

function MapViewport({ bounds, focusTicket, selectedPole }) {
  const map = useMap();

  useEffect(() => {
    if (focusTicket && validPoint(focusTicket)) {
      map.flyTo(point(focusTicket), Math.max(map.getZoom(), 17), { duration: 0.85 });
      return;
    }

    if (selectedPole && validPoint(selectedPole)) {
      map.flyTo(point(selectedPole), Math.max(map.getZoom(), 17), { duration: 0.75 });
      return;
    }

    if (bounds?.length) {
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 16, animate: true, duration: 0.65 });
    }
  }, [bounds, focusTicket, map, selectedPole]);

  return null;
}

function PopupFacts({ pole, transformer }) {
  const feeder = pole.feeder_id || transformer?.feeder_id || "-";
  const transformerId = pole.dt_id || transformer?.dt_id || "-";
  const status = pole.is_transformer
    ? pole.is_energized === false ? "De-energized transformer" : "Energized transformer"
    : pole.device_id
      ? pole.is_energized ? "Energized pole" : "De-energized pole"
      : "No device installed";

  return (
    <div className="map-popup">
      <strong>{pole.pole_id || pole.dt_id}</strong>
      <span>Pole ID: {pole.is_transformer ? "-" : pole.pole_id}</span>
      <span>Transformer: {transformerId}</span>
      <span>Feeder: {feeder}</span>
      <span>Status: {status}</span>
      <span>Coordinates: {Number(pole.lat).toFixed(5)}, {Number(pole.lon).toFixed(5)}</span>
      <span>PIN Code: {pole.pincode || transformer?.pincode || "Not available"}</span>
    </div>
  );
}

function IncidentPopup({ ticket }) {
  return (
    <div className="map-popup">
      <strong>{ticket.ticket_id}</strong>
      <span>Pole ID: {ticket.first_dark_pole_id || ticket.last_live_pole_id || "-"}</span>
      <span>Transformer: {ticket.dt_id || "-"}</span>
      <span>Feeder: {ticket.feeder_id || "-"}</span>
      <span>Status: {ticket.status}</span>
      <span>Coordinates: {Number(ticket.lat).toFixed(5)}, {Number(ticket.lon).toFixed(5)}</span>
      <span>PIN Code: {ticket.pincode || "Not available"}</span>
    </div>
  );
}

export default function SchematicMap({
  focusTicket,
  onSelectPole,
  onSelectTicket,
  poles,
  selectedPoleId,
  tickets,
  transformer,
}) {
  const mapPoles = useMemo(() => poles.filter(validPoint), [poles]);
  const poleById = useMemo(() => new Map(mapPoles.map((pole) => [pole.pole_id, pole])), [mapPoles]);
  const openTickets = useMemo(() => tickets.filter(isOpen), [tickets]);
  const activeTickets = useMemo(() => openTickets.filter(validPoint), [openTickets]);
  const criticalTicket = useMemo(() => (
    openTickets.find((ticket) => ticket.fault_type === "feeder")
    || openTickets.find((ticket) => ticket.fault_type === "transformer")
    || openTickets[0]
  ), [openTickets]);
  const mappableCriticalTicket = useMemo(() => (
    activeTickets.find((ticket) => ticket.fault_type === "feeder")
    || activeTickets.find((ticket) => ticket.fault_type === "transformer")
    || activeTickets[0]
  ), [activeTickets]);
  const ticketInView = focusTicket && validPoint(focusTicket) ? focusTicket : mappableCriticalTicket;
  const highlightedTicket = focusTicket && isOpen(focusTicket) ? focusTicket : criticalTicket;
  const bounds = useMemo(() => {
    const entities = [...mapPoles, ...(validPoint(transformer) ? [transformer] : []), ...activeTickets].filter(validPoint);
    return entities.map(point);
  }, [activeTickets, mapPoles, transformer]);
  const center = useMemo(() => {
    if (ticketInView && validPoint(ticketInView)) return point(ticketInView);
    if (validPoint(transformer)) return point(transformer);
    if (mapPoles[0]) return point(mapPoles[0]);
    return [28.6139, 77.2090];
  }, [mapPoles, ticketInView, transformer]);
  const links = useMemo(() => (
    mapPoles.flatMap((pole) => {
      const parent = pole.parent_pole_id ? poleById.get(pole.parent_pole_id) : null;
      return parent ? [{ id: `${parent.pole_id}-${pole.pole_id}`, points: [point(parent), point(pole)], dark: !parent.is_energized || !pole.is_energized }] : [];
    })
  ), [mapPoles, poleById]);
  const boundaryPairs = useMemo(() => (
    openTickets.flatMap((ticket) => {
      const live = ticket.last_live_pole_id ? poleById.get(ticket.last_live_pole_id) : null;
      const dark = ticket.first_dark_pole_id ? poleById.get(ticket.first_dark_pole_id) : null;
      return live && dark ? [{ id: ticket.ticket_id, ticket, live, dark, points: [point(live), point(dark)] }] : [];
    })
  ), [openTickets, poleById]);
  const affectedPoleIds = useMemo(() => {
    const ids = new Set();
    openTickets.forEach((ticket) => {
      (ticket.affected_pole_ids || []).forEach((poleId) => ids.add(poleId));
      if (ticket.first_dark_pole_id) ids.add(ticket.first_dark_pole_id);
    });
    return ids;
  }, [openTickets]);
  const boundaryPoleIds = useMemo(() => {
    const ids = new Set();
    openTickets.forEach((ticket) => {
      if (ticket.last_live_pole_id) ids.add(ticket.last_live_pole_id);
      if (ticket.first_dark_pole_id) ids.add(ticket.first_dark_pole_id);
    });
    return ids;
  }, [openTickets]);

  if (!mapPoles.length && !validPoint(transformer)) {
    return <div className="empty-map"><Icon name="map" size={28} /><strong>No network slice loaded</strong><span>Select a transformer to focus the map.</span></div>;
  }

  return (
    <div className="network-map leaflet-network-map">
      <MapContainer center={center} zoom={15} scrollWheelZoom className="leaflet-map-canvas">
        <TileLayer attribution={mapAttribution} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewport bounds={bounds} focusTicket={ticketInView} selectedPole={selectedPoleId ? poleById.get(selectedPoleId) : null} />

        {links.map((link) => (
          <Polyline
            key={link.id}
            pathOptions={{ color: link.dark ? "#ef806f" : "#4fa87f", opacity: link.dark ? 0.72 : 0.48, weight: link.dark ? 4 : 2 }}
            positions={link.points}
          />
        ))}

        {mapPoles.filter((pole) => affectedPoleIds.has(pole.pole_id)).map((pole) => (
          <CircleMarker
            center={point(pole)}
            interactive={false}
            key={`${pole.pole_id}-affected-halo`}
            pathOptions={{ color: "#f09a78", dashArray: "3 6", fillColor: "#f09a78", fillOpacity: 0.12, opacity: 0.85, weight: 2 }}
            radius={14}
          />
        ))}

        {boundaryPairs.map((boundary) => (
          <Polyline key={`${boundary.id}-span-glow`} pathOptions={{ color: "#f09a78", lineCap: "round", opacity: 0.32, weight: 14 }} positions={boundary.points} />
        ))}

        {boundaryPairs.map((boundary) => (
          <Polyline key={`${boundary.id}-span`} pathOptions={{ color: "#ffe08a", dashArray: "5 8", lineCap: "round", opacity: 1, weight: 6 }} positions={boundary.points}>
            <Tooltip direction="top" sticky>Fault span: {boundary.live.pole_id} to {boundary.dark.pole_id}</Tooltip>
          </Polyline>
        ))}

        {validPoint(transformer) && (
          <Marker eventHandlers={{ click: () => onSelectPole({ ...transformer, pole_id: transformer.dt_id, is_transformer: true }) }} icon={transformerIcon} position={point(transformer)}>
            <Popup><PopupFacts pole={{ ...transformer, pole_id: transformer.dt_id, is_transformer: true }} transformer={transformer} /></Popup>
            <Tooltip direction="top" offset={[0, -12]}>{transformer.dt_id}</Tooltip>
          </Marker>
        )}

        {activeTickets.map((ticket) => (
          <Marker eventHandlers={{ click: () => onSelectTicket(ticket) }} icon={faultIcon} key={ticket.ticket_id} position={point(ticket)}>
            <Popup><IncidentPopup ticket={ticket} /></Popup>
            <Tooltip direction="top" offset={[0, -15]}>{ticket.ticket_id}</Tooltip>
          </Marker>
        ))}

        {boundaryPairs.map((boundary) => (
          <Marker icon={lastLiveIcon} key={`${boundary.id}-last-live`} position={point(boundary.live)}>
            <Tooltip direction="left" offset={[-12, 0]}>Last live pole: {boundary.live.pole_id}</Tooltip>
          </Marker>
        ))}

        {boundaryPairs.map((boundary) => (
          <Marker icon={firstDarkIcon} key={`${boundary.id}-first-dark`} position={point(boundary.dark)}>
            <Tooltip direction="right" offset={[12, 0]}>First dark pole: {boundary.dark.pole_id}</Tooltip>
          </Marker>
        ))}

        {activeTickets.map((ticket) => {
          const boundaryPole = ticket.first_dark_pole_id ? poleById.get(ticket.first_dark_pole_id) : null;
          return boundaryPole ? (
            <Marker icon={boundaryIcon} key={`${ticket.ticket_id}-boundary`} position={point(boundaryPole)}>
              <Tooltip direction="right" offset={[10, 0]}>Fault boundary</Tooltip>
            </Marker>
          ) : null;
        })}

        {mapPoles.map((pole) => {
          const isAffected = affectedPoleIds.has(pole.pole_id);
          const isBoundary = boundaryPoleIds.has(pole.pole_id);
          return (
            <CircleMarker
              center={point(pole)}
              eventHandlers={{ click: () => onSelectPole(pole) }}
              key={pole.pole_id}
              pathOptions={{
                color: selectedPoleId === pole.pole_id ? "#ffffff" : isBoundary ? "#ffe08a" : isAffected ? "#ffd0b3" : pole.device_id ? "#d8ffe9" : "#8b958f",
                fillColor: isAffected ? (pole.is_energized ? "#f5c26b" : "#ef806f") : pole.device_id ? (pole.is_energized ? "#7ce4bd" : "#ef806f") : "#59645e",
                fillOpacity: pole.device_id || isAffected ? 0.96 : 0.78,
                opacity: selectedPoleId === pole.pole_id || isAffected ? 1 : 0.85,
                weight: selectedPoleId === pole.pole_id ? 3 : isBoundary ? 4 : isAffected ? 3 : 1,
              }}
              radius={selectedPoleId === pole.pole_id ? 8 : isBoundary ? 9 : isAffected ? 7 : 5}
            >
              <Popup><PopupFacts pole={pole} transformer={transformer} /></Popup>
              <Tooltip direction="top">{isBoundary ? `Boundary: ${pole.pole_id}` : isAffected ? `Affected: ${pole.pole_id}` : pole.pole_id}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="map-topbar">
        <div><span className="eyebrow">OpenStreetMap live view</span><strong>{transformer?.dt_id || "Network"}</strong></div>
        <span className="map-count"><span className="live-dot" />{mapPoles.length} poles - {openTickets.length} incident{openTickets.length === 1 ? "" : "s"}</span>
      </div>
      <div className="map-legend">
        <span><i className="legend-swatch swatch-live" />Energized pole</span>
        <span><i className="legend-swatch swatch-dark" />De-energized pole</span>
        <span><i className="legend-swatch swatch-affected" />Affected pole</span>
        <span><i className="legend-swatch swatch-missing" />Dead/no device</span>
        <span><i className="legend-swatch swatch-transformer" />Transformer</span>
        <span><i className="legend-swatch swatch-fault" />Incident cluster</span>
        <span><i className="legend-line swatch-boundary" />Fault span</span>
      </div>
      {highlightedTicket && (
        <div className="map-incident-strip">
          <span className="map-incident-icon"><Icon name="alert" size={16} /></span>
          <div>
            <span className="eyebrow">Fault span in focus</span>
            <strong>{estimatedFaultSpan(highlightedTicket)}</strong>
            <small>{highlightedTicket.affected_pole_count || affectedPoleIds.size} affected pole{(highlightedTicket.affected_pole_count || affectedPoleIds.size) === 1 ? "" : "s"} highlighted</small>
          </div>
        </div>
      )}
      <div className={cx("map-focus-chip", ticketInView && "map-focus-active")}>
        <Icon name="target" size={14} />
        {ticketInView ? `Focused ${ticketInView.ticket_id}` : "Fit to network"}
      </div>
    </div>
  );
}
