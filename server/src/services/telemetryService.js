import Telemetry from "../models/Telemetry.js";
import Device from "../models/Device.js";
import Pole from "../models/Pole.js";
import ScheduledOutage from "../models/ScheduledOutage.js";
import { localizeDT } from "../fault-engine/localize.js";
import { checkAndVerifyTicketsForPole, upsertTicketFromFault } from "../ticket-engine/ticketService.js";

function classifySequence(device, event, seq) {
  if (!device) return { isDuplicate: false, isStale: false, isReboot: false };

  const lastSeq = Number(device.last_seq || 0);
  const currentSeq = Number(seq);
  const isReboot = event === "boot" || currentSeq < lastSeq - 100;

  if (isReboot || currentSeq > lastSeq) {
    return { isDuplicate: false, isStale: false, isReboot };
  }

  return {
    isDuplicate: currentSeq === lastSeq,
    isStale: currentSeq < lastSeq,
    isReboot: false,
  };
}

async function hasActiveScheduledOutage(pole, at = new Date()) {
  const outage = await ScheduledOutage.findOne({
    is_cancelled: false,
    start: { $lte: at },
    end: { $gte: at },
    $or: [
      { scope: "dt", target_id: pole.dt_id },
      { scope: "feeder", target_id: pole.feeder_id },
    ],
  });

  return Boolean(outage);
}

async function createTicketsForFaults(faults) {
  const faultList = Array.isArray(faults) ? faults : [faults].filter(Boolean);
  const tickets = [];

  for (const fault of faultList) {
    tickets.push(await upsertTicketFromFault(fault));
  }

  return tickets;
}

export async function ingestTelemetry(payload, options = {}) {
  const {
    device_id,
    pole_id,
    event,
    energized,
    ts,
    seq,
    battery_mv = null,
    rssi = null,
    fw = null,
  } = payload;

  const device = await Device.findOne({ device_id });
  const sequence = classifySequence(device, event, seq);
  const telemetryTs = new Date(ts);

  if (Number.isNaN(telemetryTs.getTime())) {
    throw new Error("Invalid telemetry timestamp");
  }

  const record = await Telemetry.create({
    device_id,
    pole_id,
    event,
    energized,
    ts: telemetryTs,
    seq,
    battery_mv,
    rssi,
    fw,
    is_duplicate: sequence.isDuplicate,
    is_stale: sequence.isStale,
  });

  const shouldApply = !sequence.isDuplicate && !sequence.isStale;
  let pole = null;
  let suppressedReason = null;
  let tickets = [];

  if (shouldApply) {
    await Device.findOneAndUpdate(
      { device_id },
      {
        pole_id,
        last_seq: seq,
        last_seen_at: new Date(),
        battery_mv,
        rssi,
        fw,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    pole = await Pole.findOneAndUpdate(
      { pole_id },
      { is_energized: energized, last_telemetry_at: new Date() },
      { new: true }
    );

    if (pole && !options.skipDetection) {
      if (energized) {
        tickets = await checkAndVerifyTicketsForPole(pole_id);
      } else if (await hasActiveScheduledOutage(pole, telemetryTs)) {
        suppressedReason = "scheduled_outage";
      } else {
        tickets = await createTicketsForFaults(await localizeDT(pole.dt_id));
      }
    }
  }

  return {
    record,
    applied: shouldApply,
    suppressed_reason: suppressedReason,
    tickets,
  };
}

export { classifySequence, createTicketsForFaults, hasActiveScheduledOutage };
