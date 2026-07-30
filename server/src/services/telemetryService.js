// server/src/services/telemetryService.js
import Telemetry from "../models/Telemetry.js";
import Device from "../models/Device.js";
import Pole from "../models/Pole.js";
import { localizeDT } from "../fault-engine/localize.js";
import { upsertTicketFromFault, checkAndVerifyTicketsForPole } from "../ticket-engine/ticketService.js";

export async function ingestTelemetry(payload) {
  const { device_id, pole_id, event, energized, ts, seq, battery_mv, rssi, fw } = payload;

  const device = await Device.findOne({ device_id });

  let isDuplicate = false;
  let isStale = false;

  if (device) {
    const isReboot = event === "boot" || seq < device.last_seq - 100; // large seq drop = reboot
    if (!isReboot && seq <= device.last_seq) {
      isDuplicate = seq === device.last_seq;
      isStale = seq < device.last_seq;
    }
  }

  const record = await Telemetry.create({
    device_id,
    pole_id,
    event,
    energized,
    ts: new Date(ts),
    seq,
    battery_mv,
    rssi,
    fw,
    is_duplicate: isDuplicate,
    is_stale: isStale,
  });

  const shouldApply = !isDuplicate && !isStale;

  if (shouldApply) {
    await Device.findOneAndUpdate(
      { device_id },
      { last_seq: seq, last_seen_at: new Date(), battery_mv, rssi, fw },
      { upsert: true }
    );

    const pole = await Pole.findOneAndUpdate(
      { pole_id },
      { is_energized: energized, last_telemetry_at: new Date() },
      { new: true }
    );

    // Sirf tab localize/ticket-check karo jab power gayi ho —
    // power_restored ka handling alag hoga (Phase 6 mein, ticket verify karne ke liye)
    if (!energized && pole) {
      const faults = await localizeDT(pole.dt_id);
      if (faults) {
        const faultList = Array.isArray(faults) ? faults : [faults];
        for (const fault of faultList) {
          await upsertTicketFromFault(fault);
        }
      }
    } else if (energized && pole) {
      await checkAndVerifyTicketsForPole(pole_id);
    }
  }

  return { record, applied: shouldApply };
}