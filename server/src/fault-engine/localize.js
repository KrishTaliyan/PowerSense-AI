import Pole from "../models/Pole.js";
import Transformer from "../models/Transformer.js";

async function localizeDT(dtId) {
  const poles = await Pole.find({ dt_id: dtId });
  const transformer = await Transformer.findOne({ dt_id: dtId });

  if (poles.length === 0) return null;

  const darkPoles = poles.filter((p) => !p.is_energized);
  if (darkPoles.length === 0) return null;

  const allDark = darkPoles.length === poles.length;
  if (allDark) {
    return {
      fault_type: "transformer",
      localization_level: "dt",
      dt_id: dtId,
      lat: transformer.lat,
      lon: transformer.lon,
      affected_pole_ids: poles.map((p) => p.pole_id),
      confidence: 0.9,
      confidence_reason: "All poles under DT are dark — transformer/HT fuse fault",
    };
  }

  if (transformer.has_known_topology) {
    return localizeWithTopology(poles, darkPoles, transformer);
  }

  return localizeWithoutTopology(poles, darkPoles, transformer);
}

function localizeWithTopology(poles, darkPoles, transformer) {
  const byId = new Map(poles.map((p) => [p.pole_id, p]));

  // Boundary poles: dark poles jinke parent live hain
  const boundaries = darkPoles.filter((p) => {
    const parent = p.parent_pole_id ? byId.get(p.parent_pole_id) : null;
    return !parent || parent.is_energized;
  });

  // Ek boundary = ek fault. Har boundary ke downstream dark poles group karo.
  return boundaries.map((boundary) => {
    const downstream = collectDownstream(boundary, byId, darkPoles);
    const parent = byId.get(boundary.parent_pole_id);

    return {
      fault_type: "span",
      localization_level: "span",
      dt_id: transformer.dt_id,
      last_live_pole_id: parent ? parent.pole_id : null,
      first_dark_pole_id: boundary.pole_id,
      lat: boundary.lat,
      lon: boundary.lon,
      affected_pole_ids: downstream.map((p) => p.pole_id),
      confidence: 0.95,
      confidence_reason: "Confirmed topology — exact live/dark boundary on span",
    };
  });
}

function collectDownstream(startPole, byId, darkPoles) {
  const darkIds = new Set(darkPoles.map((p) => p.pole_id));
  const children = new Map();
  for (const p of darkPoles) {
    if (p.parent_pole_id) {
      if (!children.has(p.parent_pole_id)) children.set(p.parent_pole_id, []);
      children.get(p.parent_pole_id).push(p);
    }
  }

  const result = [];
  const stack = [startPole];
  while (stack.length) {
    const cur = stack.pop();
    if (!darkIds.has(cur.pole_id)) continue;
    result.push(cur);
    const kids = children.get(cur.pole_id) || [];
    stack.push(...kids);
  }
  return result;
}

function localizeWithoutTopology(poles, darkPoles, transformer) {
  const livePoles = poles.filter((p) => p.is_energized);

  // Nearest live pole se distance ke basis pe ek rough centroid nikalte hain
  const avgLat = darkPoles.reduce((s, p) => s + p.lat, 0) / darkPoles.length;
  const avgLon = darkPoles.reduce((s, p) => s + p.lon, 0) / darkPoles.length;

  return [
    {
      fault_type: "span",
      localization_level: "dt",
      dt_id: transformer.dt_id,
      lat: avgLat,
      lon: avgLon,
      affected_pole_ids: darkPoles.map((p) => p.pole_id),
      confidence: 0.4,
      confidence_reason: `No recorded topology for this DT — approximate location from ${darkPoles.length} dark pole coordinates, ${livePoles.length} live poles still up`,
    },
  ];
}

export { localizeDT };