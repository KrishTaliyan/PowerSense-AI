import Ticket from "../models/Ticket.js";
import Pole from "../models/Pole.js";
import { randomUUID } from "crypto";

async function upsertTicketFromFault(fault) {
  const existing = await Ticket.findOne({
    dt_id: fault.dt_id,
    status: { $nin: ["closed"] },
    $or: [
      { first_dark_pole_id: fault.first_dark_pole_id },
      { affected_pole_ids: { $in: fault.affected_pole_ids } },
    ],
  });

  if (existing) {
    existing.affected_pole_ids = [
      ...new Set([...existing.affected_pole_ids, ...fault.affected_pole_ids]),
    ];
    existing.affected_pole_count = existing.affected_pole_ids.length;
    existing.confidence = fault.confidence;
    existing.confidence_reason = fault.confidence_reason;
    await existing.save();
    return existing;
  }

  return Ticket.create({
    ticket_id: `TKT-${randomUUID().slice(0, 8).toUpperCase()}`,
    fault_type: fault.fault_type,
    status: "detected",
    last_live_pole_id: fault.last_live_pole_id || null,
    first_dark_pole_id: fault.first_dark_pole_id || null,
    dt_id: fault.dt_id,
    feeder_id: fault.feeder_id || null,
    lat: fault.lat,
    lon: fault.lon,
    pincode: fault.pincode || null,
    affected_pole_ids: fault.affected_pole_ids,
    affected_pole_count: fault.affected_pole_ids.length,
    confidence: fault.confidence,
    confidence_reason: fault.confidence_reason,
    localization_level: fault.localization_level,
    detected_at: new Date(),
  });
}


async function checkAndVerifyTicketsForPole(pole_id) {
  const openTickets = await Ticket.find({
    affected_pole_ids: pole_id,
    status: { $nin: ["verified", "closed"] },
  });

  for (const ticket of openTickets) {
    const poles = await Pole.find({ pole_id: { $in: ticket.affected_pole_ids } });
    const allLive = poles.every((p) => p.is_energized);

    if (allLive) {
      ticket.status = "verified";
      ticket.verified_at = new Date();
      await ticket.save();
    }
  }
}

export { upsertTicketFromFault, checkAndVerifyTicketsForPole };