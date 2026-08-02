import { randomUUID } from "crypto";
import Ticket from "../models/Ticket.js";
import Pole from "../models/Pole.js";

function buildIncidentSummary(fault) {
  const affected = fault.affected_pole_ids?.length || 0;

  if (fault.fault_type === "feeder") {
    return `Feeder fault suspected on ${fault.feeder_id}. ${affected} downstream poles are affected. Confidence ${Math.round(
      fault.confidence * 100
    )}%. ${fault.confidence_reason}`;
  }

  if (fault.fault_type === "transformer") {
    return `Transformer-level outage detected at ${fault.dt_id}. ${affected} downstream poles are affected. Confidence ${Math.round(
      fault.confidence * 100
    )}%. ${fault.confidence_reason}`;
  }

  const span = fault.last_live_pole_id
    ? `${fault.last_live_pole_id} and ${fault.first_dark_pole_id}`
    : `upstream of ${fault.first_dark_pole_id}`;

  return `Span fault suspected between ${span}. ${affected} downstream poles are affected. Confidence ${Math.round(
    fault.confidence * 100
  )}%. ${fault.confidence_reason}`;
}

async function upsertTicketFromFault(fault) {
  if (!fault || !fault.affected_pole_ids?.length) return null;

  const matchConditions = [{ affected_pole_ids: { $in: fault.affected_pole_ids } }];
  if (fault.first_dark_pole_id) matchConditions.push({ first_dark_pole_id: fault.first_dark_pole_id });
  if (fault.fault_type === "feeder" && fault.feeder_id) matchConditions.push({ feeder_id: fault.feeder_id });
  if (fault.fault_type === "transformer" && fault.dt_id) matchConditions.push({ dt_id: fault.dt_id });

  const existing = await Ticket.findOne({
    status: { $nin: ["verified", "closed"] },
    $or: matchConditions,
  });

  if (existing) {
    existing.affected_pole_ids = [
      ...new Set([...existing.affected_pole_ids, ...fault.affected_pole_ids]),
    ];
    existing.affected_pole_count = existing.affected_pole_ids.length;
    existing.confidence = fault.confidence;
    existing.confidence_reason = fault.confidence_reason;
    existing.ai_summary = buildIncidentSummary(fault);
    existing.lat = fault.lat;
    existing.lon = fault.lon;
    existing.pincode = fault.pincode || existing.pincode;
    await existing.save();
    return existing;
  }

  return Ticket.create({
    ticket_id: `TKT-${randomUUID().slice(0, 8).toUpperCase()}`,
    fault_type: fault.fault_type,
    status: "detected",
    last_live_pole_id: fault.last_live_pole_id || null,
    first_dark_pole_id: fault.first_dark_pole_id || null,
    dt_id: fault.dt_id || null,
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
    ai_summary: buildIncidentSummary(fault),
  });
}

async function verifyTicketIfRestored(ticket) {
  const poles = await Pole.find({ pole_id: { $in: ticket.affected_pole_ids } });
  const allLive = poles.length > 0 && poles.every((p) => p.is_energized);

  if (!allLive) return null;

  ticket.status = "verified";
  ticket.verified_at = new Date();
  if (!ticket.resolved_at) ticket.resolved_at = ticket.verified_at;
  await ticket.save();
  return ticket;
}

function ticketToObject(ticket) {
  return typeof ticket?.toObject === "function" ? ticket.toObject() : ticket;
}

async function enrichTicketsWithRestoration(tickets = []) {
  const plainTickets = tickets.map(ticketToObject);
  const affectedPoleIds = [
    ...new Set(plainTickets.flatMap((ticket) => ticket?.affected_pole_ids || [])),
  ];
  const poles = affectedPoleIds.length
    ? await Pole.find({ pole_id: { $in: affectedPoleIds } }).select("pole_id is_energized").lean()
    : [];
  const energizedByPole = new Map(poles.map((pole) => [pole.pole_id, pole.is_energized === true]));

  return plainTickets.map((ticket) => {
    const isFinal = ["verified", "closed"].includes(ticket.status);
    const affected = ticket.affected_pole_ids || [];
    const remainingDarkPoleIds = isFinal
      ? []
      : affected.filter((poleId) => energizedByPole.get(poleId) !== true);
    const canVerifyRepair = !isFinal && affected.length > 0 && remainingDarkPoleIds.length === 0;

    return {
      ...ticket,
      can_verify_repair: canVerifyRepair,
      remaining_dark_poles: remainingDarkPoleIds.length,
      remaining_dark_pole_ids: remainingDarkPoleIds.slice(0, 20),
      restoration_state: isFinal
        ? "verified"
        : canVerifyRepair
          ? "ready_to_verify"
          : "waiting_for_power",
    };
  });
}

async function enrichTicketWithRestoration(ticket) {
  const [enriched] = await enrichTicketsWithRestoration([ticket]);
  return enriched;
}

async function checkAndVerifyTicketsForPole(poleId) {
  const openTickets = await Ticket.find({
    affected_pole_ids: poleId,
    status: { $nin: ["verified", "closed"] },
  });

  const verified = [];
  for (const ticket of openTickets) {
    const updated = await verifyTicketIfRestored(ticket);
    if (updated) verified.push(updated);
  }

  return verified;
}

async function checkAndVerifyTicketsForAffectedPoles(poleIds) {
  const openTickets = await Ticket.find({
    affected_pole_ids: { $in: poleIds },
    status: { $nin: ["verified", "closed"] },
  });

  const verified = [];
  for (const ticket of openTickets) {
    const updated = await verifyTicketIfRestored(ticket);
    if (updated) verified.push(updated);
  }

  return verified;
}

export {
  buildIncidentSummary,
  checkAndVerifyTicketsForAffectedPoles,
  checkAndVerifyTicketsForPole,
  enrichTicketWithRestoration,
  enrichTicketsWithRestoration,
  upsertTicketFromFault,
  verifyTicketIfRestored,
};
