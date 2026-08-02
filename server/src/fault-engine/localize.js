import Pole from "../models/Pole.js";
import Transformer from "../models/Transformer.js";

function classifyPole(pole) {
  if (!pole.device_id) return "unknown";
  return pole.is_energized ? "live" : "dark";
}

function mostCommonPincode(poles) {
  const counts = new Map();

  for (const pole of poles) {
    if (!pole.pincode) continue;
    counts.set(pole.pincode, (counts.get(pole.pincode) || 0) + 1);
  }

  let best = null;
  let bestCount = 0;
  for (const [pincode, count] of counts.entries()) {
    if (count > bestCount) {
      best = pincode;
      bestCount = count;
    }
  }

  return best;
}

async function localizeDT(dtId) {
  const poles = await Pole.find({ dt_id: dtId });
  const transformer = await Transformer.findOne({ dt_id: dtId });
  return localizePoleSet(poles, transformer);
}

async function localizeFeeder(feederId) {
  const poles = await Pole.find({ feeder_id: feederId });
  const transformers = await Transformer.find({ feeder_id: feederId });
  if (poles.length === 0 || transformers.length === 0) return [];

  const reportingPoles = poles.filter((p) => p.device_id);
  const confirmedDark = reportingPoles.filter((p) => classifyPole(p) === "dark");
  const confirmedLive = reportingPoles.filter((p) => classifyPole(p) === "live");

  if (confirmedDark.length === 0 || confirmedLive.length > 0) return [];

  const avgLat =
    transformers.reduce((sum, transformer) => sum + transformer.lat, 0) / transformers.length;
  const avgLon =
    transformers.reduce((sum, transformer) => sum + transformer.lon, 0) / transformers.length;

  return [
    {
      fault_type: "feeder",
      localization_level: "feeder",
      feeder_id: feederId,
      dt_id: null,
      lat: avgLat,
      lon: avgLon,
      pincode: mostCommonPincode(poles),
      affected_pole_ids: poles.map((p) => p.pole_id),
      confidence: 0.86,
      confidence_reason:
        "Every reporting pole on the feeder is dark, so the fault is upstream of the DTs.",
    },
  ];
}

function localizePoleSet(poles, transformer) {
  if (!transformer || poles.length === 0) return [];

  const confirmedDark = poles.filter((p) => classifyPole(p) === "dark");
  if (confirmedDark.length === 0) return [];

  const reportingPoles = poles.filter((p) => p.device_id);
  const allReportingDark =
    reportingPoles.length > 0 && reportingPoles.every((p) => classifyPole(p) === "dark");

  if (allReportingDark) {
    return [
      {
        fault_type: "transformer",
        localization_level: "dt",
        dt_id: transformer.dt_id,
        feeder_id: transformer.feeder_id,
        lat: transformer.lat,
        lon: transformer.lon,
        pincode: mostCommonPincode(poles),
        affected_pole_ids: poles.map((p) => p.pole_id),
        confidence: 0.9,
        confidence_reason:
          "All reporting poles under this DT are dark, which points to a transformer or upstream fuse fault.",
      },
    ];
  }

  if (transformer.has_known_topology) {
    return localizeWithTopology(poles, transformer);
  }

  const confirmedLive = poles.filter((p) => classifyPole(p) === "live");
  return localizeWithoutTopology(confirmedDark, confirmedLive, transformer, poles);
}

function localizeWithTopology(poles, transformer) {
  const byId = new Map(poles.map((p) => [p.pole_id, p]));
  const childrenMap = new Map();

  for (const pole of poles) {
    if (!pole.parent_pole_id) continue;
    if (!childrenMap.has(pole.parent_pole_id)) childrenMap.set(pole.parent_pole_id, []);
    childrenMap.get(pole.parent_pole_id).push(pole);
  }

  const confirmedDark = poles.filter((p) => classifyPole(p) === "dark");
  const boundaries = confirmedDark.filter((pole) => {
    const parent = pole.parent_pole_id ? byId.get(pole.parent_pole_id) : null;
    return !parent || classifyPole(parent) !== "dark";
  });

  if (boundaries.length === 0) {
    return localizeWithoutTopology(confirmedDark, [], transformer, poles);
  }

  return boundaries.map((boundary) => {
    const affected = collectDownstream(boundary, childrenMap);
    const parent = byId.get(boundary.parent_pole_id);
    const unknownCount = affected.filter((p) => classifyPole(p) === "unknown").length;

    return {
      fault_type: "span",
      localization_level: "span",
      dt_id: transformer.dt_id,
      feeder_id: transformer.feeder_id,
      last_live_pole_id: parent ? parent.pole_id : null,
      first_dark_pole_id: boundary.pole_id,
      lat: parent ? (parent.lat + boundary.lat) / 2 : boundary.lat,
      lon: parent ? (parent.lon + boundary.lon) / 2 : boundary.lon,
      pincode: boundary.pincode || mostCommonPincode(affected),
      affected_pole_ids: affected.map((p) => p.pole_id),
      confidence: unknownCount > 0 ? 0.8 : 0.95,
      confidence_reason:
        unknownCount > 0
          ? `Confirmed boundary, with ${unknownCount} downstream pole(s) inferred because they have no device.`
          : "Confirmed topology with an exact live/dark boundary on the span.",
    };
  });
}

function collectDownstream(startPole, childrenMap) {
  const result = [];
  const stack = [startPole];
  const visited = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current.pole_id)) continue;
    visited.add(current.pole_id);

    if (classifyPole(current) === "live") continue;

    result.push(current);
    stack.push(...(childrenMap.get(current.pole_id) || []));
  }

  return result;
}

function localizeWithoutTopology(confirmedDark, confirmedLive, transformer, poles = confirmedDark) {
  const avgLat = confirmedDark.reduce((sum, pole) => sum + pole.lat, 0) / confirmedDark.length;
  const avgLon = confirmedDark.reduce((sum, pole) => sum + pole.lon, 0) / confirmedDark.length;

  return [
    {
      fault_type: "span",
      localization_level: "dt",
      dt_id: transformer.dt_id,
      feeder_id: transformer.feeder_id,
      lat: avgLat,
      lon: avgLon,
      pincode: mostCommonPincode(confirmedDark) || mostCommonPincode(poles),
      affected_pole_ids: confirmedDark.map((p) => p.pole_id),
      confidence: confirmedLive.length > 0 ? 0.42 : 0.55,
      confidence_reason: `No recorded pole ordering for this DT, so this is an approximate location from ${confirmedDark.length} dark pole coordinate(s).`,
    },
  ];
}

export {
  classifyPole,
  collectDownstream,
  localizeDT,
  localizeFeeder,
  localizePoleSet,
  localizeWithTopology,
  localizeWithoutTopology,
  mostCommonPincode,
};
