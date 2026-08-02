import { randomUUID } from "crypto";
import Device from "../models/Device.js";
import Pole from "../models/Pole.js";
import ScheduledOutage from "../models/ScheduledOutage.js";
import Transformer from "../models/Transformer.js";
import { localizeDT, localizeFeeder } from "../fault-engine/localize.js";
import { ingestTelemetry, createTicketsForFaults } from "../services/telemetryService.js";
import { checkAndVerifyTicketsForAffectedPoles } from "../ticket-engine/ticketService.js";

async function getDefaultTransformer(preferKnownTopology = true) {
  return (
    (await Transformer.findOne(
      preferKnownTopology ? { has_known_topology: true } : {}
    ).sort({ dt_id: 1 })) || (await Transformer.findOne().sort({ dt_id: 1 }))
  );
}

async function getDefaultFeeder() {
  const transformer = await Transformer.findOne().sort({ feeder_id: 1 });
  return transformer?.feeder_id || null;
}

function buildChildrenMap(poles) {
  const childrenMap = new Map();
  for (const pole of poles) {
    if (!pole.parent_pole_id) continue;
    if (!childrenMap.has(pole.parent_pole_id)) childrenMap.set(pole.parent_pole_id, []);
    childrenMap.get(pole.parent_pole_id).push(pole);
  }
  return childrenMap;
}

function collectTopologyDownstream(startPole, childrenMap) {
  const result = [];
  const stack = [startPole];
  const visited = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current.pole_id)) continue;
    visited.add(current.pole_id);
    result.push(current);
    stack.push(...(childrenMap.get(current.pole_id) || []));
  }

  return result;
}

async function selectSpanPoles(dtId, fromSeq = 5) {
  const transformer = await Transformer.findOne({ dt_id: dtId });
  const poles = await Pole.find({ dt_id: dtId }).sort({ seq_on_line: 1, pole_id: 1 });
  if (!transformer || poles.length === 0) return [];

  if (transformer.has_known_topology) {
    const childrenMap = buildChildrenMap(poles);
    const startPole =
      poles.find((pole) => Number(pole.seq_on_line) >= Number(fromSeq) && pole.parent_pole_id) ||
      poles.find((pole) => pole.parent_pole_id) ||
      poles[0];
    return collectTopologyDownstream(startPole, childrenMap);
  }

  const orderedByLocation = [...poles].sort((a, b) => {
    const aDistance = Math.hypot(a.lat - transformer.lat, a.lon - transformer.lon);
    const bDistance = Math.hypot(b.lat - transformer.lat, b.lon - transformer.lon);
    return aDistance - bDistance;
  });
  const startIndex = Math.max(0, Math.min(Number(fromSeq) || 5, orderedByLocation.length - 1));
  return orderedByLocation.slice(startIndex);
}

async function nextSeqForDevice(deviceId) {
  const device = await Device.findOne({ device_id: deviceId });
  return Number(device?.last_seq || 0) + 1;
}

async function emitTelemetryForPoles(poles, energized, event) {
  const results = [];

  for (const pole of poles) {
    if (!pole.device_id) continue;

    const seq = await nextSeqForDevice(pole.device_id);
    const result = await ingestTelemetry(
      {
        device_id: pole.device_id,
        pole_id: pole.pole_id,
        event,
        energized,
        ts: new Date().toISOString(),
        seq,
        battery_mv: 3600 + Math.floor(Math.random() * 400),
        rssi: -90 + Math.floor(Math.random() * 35),
        fw: "1.4.2",
      },
      { skipDetection: true }
    );

    results.push({ pole_id: pole.pole_id, applied: result.applied });
  }

  return results;
}

async function createDtTickets(dtId) {
  return createTicketsForFaults(await localizeDT(dtId));
}

async function injectSpanFault(dtId, fromSeq = 5) {
  const target = dtId ? await Transformer.findOne({ dt_id: dtId }) : await getDefaultTransformer(true);
  if (!target) return { target: null, telemetry: [], tickets: [] };

  const affectedPoles = await selectSpanPoles(target.dt_id, fromSeq);
  const telemetry = await emitTelemetryForPoles(affectedPoles, false, "power_lost");
  const tickets = await createDtTickets(target.dt_id);

  return {
    target: { dt_id: target.dt_id, feeder_id: target.feeder_id, from_seq: fromSeq },
    telemetry,
    tickets,
  };
}

async function injectTransformerFault(dtId) {
  const target = dtId ? await Transformer.findOne({ dt_id: dtId }) : await getDefaultTransformer(false);
  if (!target) return { target: null, telemetry: [], tickets: [] };

  const poles = await Pole.find({ dt_id: target.dt_id });
  const telemetry = await emitTelemetryForPoles(poles, false, "power_lost");
  const tickets = await createDtTickets(target.dt_id);

  return {
    target: { dt_id: target.dt_id, feeder_id: target.feeder_id },
    telemetry,
    tickets,
  };
}

async function injectFeederFault(feederId) {
  const targetFeederId = feederId || (await getDefaultFeeder());
  if (!targetFeederId) return { target: null, telemetry: [], tickets: [] };

  const poles = await Pole.find({ feeder_id: targetFeederId });
  const telemetry = await emitTelemetryForPoles(poles, false, "power_lost");
  const tickets = await createTicketsForFaults(await localizeFeeder(targetFeederId));

  return {
    target: { feeder_id: targetFeederId },
    telemetry,
    tickets,
  };
}

async function repairFault(dtId, fromSeq = 5) {
  const target = dtId ? await Transformer.findOne({ dt_id: dtId }) : await getDefaultTransformer(true);
  if (!target) return { target: null, telemetry: [], verified: [] };

  const affectedPoles = await selectSpanPoles(target.dt_id, fromSeq);
  const telemetry = await emitTelemetryForPoles(affectedPoles, true, "power_restored");
  const verified = await checkAndVerifyTicketsForAffectedPoles(affectedPoles.map((pole) => pole.pole_id));

  return {
    target: { dt_id: target.dt_id, feeder_id: target.feeder_id, from_seq: fromSeq },
    telemetry,
    verified,
  };
}

async function repairTransformerFault(dtId) {
  const target = dtId ? await Transformer.findOne({ dt_id: dtId }) : await getDefaultTransformer(false);
  if (!target) return { target: null, telemetry: [], verified: [] };

  const poles = await Pole.find({ dt_id: target.dt_id });
  const telemetry = await emitTelemetryForPoles(poles, true, "power_restored");
  const verified = await checkAndVerifyTicketsForAffectedPoles(poles.map((pole) => pole.pole_id));

  return {
    target: { dt_id: target.dt_id, feeder_id: target.feeder_id },
    telemetry,
    verified,
  };
}

async function repairFeederFault(feederId) {
  const targetFeederId = feederId || (await getDefaultFeeder());
  if (!targetFeederId) return { target: null, telemetry: [], verified: [] };

  const poles = await Pole.find({ feeder_id: targetFeederId });
  const telemetry = await emitTelemetryForPoles(poles, true, "power_restored");
  const verified = await checkAndVerifyTicketsForAffectedPoles(poles.map((pole) => pole.pole_id));

  return {
    target: { feeder_id: targetFeederId },
    telemetry,
    verified,
  };
}

async function injectScheduledOutage(dtId) {
  const target = dtId ? await Transformer.findOne({ dt_id: dtId }) : await getDefaultTransformer(false);
  if (!target) return { target: null, telemetry: [], outage: null };

  const now = new Date();
  const outage = await ScheduledOutage.create({
    outage_id: `SO-${randomUUID().slice(0, 8).toUpperCase()}`,
    scope: "dt",
    target_id: target.dt_id,
    start: new Date(now.getTime() - 60 * 1000),
    end: new Date(now.getTime() + 30 * 60 * 1000),
    reason: "Simulator load-shedding window",
  });

  const poles = await Pole.find({ dt_id: target.dt_id });
  const telemetry = await emitTelemetryForPoles(poles, false, "power_lost");

  return {
    target: { dt_id: target.dt_id, feeder_id: target.feeder_id },
    telemetry,
    outage,
  };
}

async function killDevice(deviceId) {
  const device = deviceId
    ? await Device.findOne({ device_id: deviceId })
    : await Device.findOne().sort({ last_seen_at: -1 });
  if (!device) return { device: null };

  device.last_seen_at = new Date(Date.now() - 60 * 60 * 1000);
  await device.save();
  return { device };
}

async function generateDuplicateMessage(deviceId) {
  const device = deviceId
    ? await Device.findOne({ device_id: deviceId })
    : await Device.findOne().sort({ last_seen_at: -1 });
  if (!device) return { record: null, applied: false };

  return ingestTelemetry({
    device_id: device.device_id,
    pole_id: device.pole_id,
    event: "heartbeat",
    energized: true,
    ts: new Date().toISOString(),
    seq: device.last_seq,
    battery_mv: device.battery_mv,
    rssi: device.rssi,
    fw: device.fw,
  });
}

async function generateDelayedMessage(deviceId) {
  const device = deviceId
    ? await Device.findOne({ device_id: deviceId })
    : await Device.findOne().sort({ last_seen_at: -1 });
  if (!device) return { record: null, applied: false };

  return ingestTelemetry({
    device_id: device.device_id,
    pole_id: device.pole_id,
    event: "heartbeat",
    energized: true,
    ts: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    seq: Math.max(0, Number(device.last_seq || 0) - 1),
    battery_mv: device.battery_mv,
    rssi: device.rssi,
    fw: device.fw,
  });
}

export {
  generateDelayedMessage,
  generateDuplicateMessage,
  injectFeederFault,
  injectScheduledOutage,
  injectSpanFault,
  injectTransformerFault,
  killDevice,
  repairFault,
  repairFeederFault,
  repairTransformerFault,
};
