import { randomUUID } from "crypto";

const FEEDER_COUNT = 5;
const DT_PER_FEEDER = 10; // 5 * 10 = 50 transformers
const BASE_LAT = 12.9716;
const BASE_LON = 77.5946;
const PINCODES = ["560001", "560002", "560034", "560078", "560095"];
const WARDS = ["W-071", "W-084", "W-092", "W-103", "W-114"];

function jitter(base, spread) {
  return base + (Math.random() - 0.5) * spread;
}

function buildLine(startLat, startLon, dtId, feederId, count, prefix) {
  const poles = [];
  let lat = startLat;
  let lon = startLon;
  for (let i = 1; i <= count; i++) {
    lat = jitter(lat, 0.0015);
    lon = jitter(lon, 0.0015);
    poles.push({
      pole_id: `P-${prefix}-${String(i).padStart(3, "0")}`,
      lat,
      lon,
      dt_id: dtId,
      feeder_id: feederId,
      seq_on_line: i,
      parent_pole_id: i === 1 ? null : `P-${prefix}-${String(i - 1).padStart(3, "0")}`,
      pole_type: Math.random() > 0.5 ? "LT-9m-PCC" : "LT-8m-Steel",
      ward: WARDS[Math.floor(Math.random() * WARDS.length)],
      pincode: PINCODES[Math.floor(Math.random() * PINCODES.length)],
    });
  }
  return poles;
}

function buildBranch(startPole, dtId, feederId, count, prefix) {
  const poles = [];
  let lat = startPole.lat;
  let lon = startPole.lon;

  for (let i = 1; i <= count; i++) {
    lat = jitter(lat, 0.0015);
    lon = jitter(lon, 0.0015);
    poles.push({
      pole_id: `P-${prefix}-${String(i).padStart(3, "0")}`,
      lat,
      lon,
      dt_id: dtId,
      feeder_id: feederId,
      seq_on_line: Number(startPole.seq_on_line || 0) + i / 100,
      parent_pole_id: i === 1 ? startPole.pole_id : `P-${prefix}-${String(i - 1).padStart(3, "0")}`,
      pole_type: Math.random() > 0.5 ? "LT-9m-PCC" : "LT-8m-Steel",
      ward: WARDS[Math.floor(Math.random() * WARDS.length)],
      pincode: PINCODES[Math.floor(Math.random() * PINCODES.length)],
    });
  }

  return poles;
}

function generateNetwork() {
  const feeders = [];
  const transformers = [];
  let allPoles = [];

  for (let f = 1; f <= FEEDER_COUNT; f++) {
    const feederId = `F-${String(f).padStart(2, "0")}`;
    feeders.push({ feeder_id: feederId });

    for (let d = 1; d <= DT_PER_FEEDER; d++) {
      const dtId = `D-${feederId.slice(2)}-${String(d).padStart(2, "0")}`;
      const dtLat = jitter(BASE_LAT, 0.15);
      const dtLon = jitter(BASE_LON, 0.15);
      const hasKnownTopology = Math.random() < 0.4; // 60% will lose it below

      transformers.push({
        dt_id: dtId,
        feeder_id: feederId,
        lat: dtLat,
        lon: dtLon,
        capacity_kva: [63, 100, 160, 250][Math.floor(Math.random() * 4)],
        households_served: 150 + Math.floor(Math.random() * 300),
        has_known_topology: hasKnownTopology,
      });

      const mainCount = 45 + Math.floor(Math.random() * 50);
      let dtPoles = buildLine(dtLat, dtLon, dtId, feederId, mainCount, `${dtId}-M`);

      const branchCount = Math.floor(Math.random() * 3); // 0-2 branches
      for (let b = 1; b <= branchCount; b++) {
        const branchFrom = dtPoles[Math.floor(Math.random() * dtPoles.length)];
        const branchLen = 5 + Math.floor(Math.random() * 15);
        dtPoles = dtPoles.concat(buildBranch(branchFrom, dtId, feederId, branchLen, `${dtId}-B${b}`));
      }

      if (!hasKnownTopology) {
        dtPoles = dtPoles.map((p) => ({ ...p, seq_on_line: null, parent_pole_id: null }));
      }

      allPoles = allPoles.concat(dtPoles);
    }
  }

  // ~9% poles get no device at all
  allPoles = allPoles.map((p) => ({
    ...p,
    device_id: Math.random() < 0.09 ? null : `KSPDB-${p.pole_id}-${randomUUID().slice(0, 4)}`,
  }));

  // ~3% poles lose their pincode
  allPoles = allPoles.map((p) => (Math.random() < 0.03 ? { ...p, pincode: null } : p));

  return { feeders, transformers, poles: allPoles };
}

export default generateNetwork;
