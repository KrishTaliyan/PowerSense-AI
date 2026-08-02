import Ticket from "../models/Ticket.js";
import {
  enrichTicketWithRestoration,
  enrichTicketsWithRestoration,
} from "../ticket-engine/ticketService.js";

export async function updateTicketStatus(req, res) {
  try {
    const { ticket_id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["acknowledged", "crew_assigned", "resolved", "closed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status transition. Use acknowledged, crew_assigned, resolved, or closed.",
      });
    }

    const ticket = await Ticket.findOne({ ticket_id });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (status === "closed" && ticket.status !== "verified") {
      return res.json({
        ...(await enrichTicketWithRestoration(ticket)),
        blocked: true,
        message: "This ticket can be closed after telemetry verifies that power is back.",
      });
    }

    if (status === "resolved") {
      const restoration = await enrichTicketWithRestoration(ticket);
      if (!restoration.can_verify_repair) {
        const remaining = restoration.remaining_dark_poles || ticket.affected_pole_count || 0;
        return res.json({
          ...restoration,
          blocked: true,
          message: `${remaining} affected pole${remaining === 1 ? "" : "s"} still need power before this repair can be verified.`,
        });
      }

      ticket.resolved_at = new Date();
      ticket.verified_at = new Date();
      ticket.status = "verified";
      await ticket.save();
      return res.json(await enrichTicketWithRestoration(ticket));
    }

    if (status === "acknowledged") ticket.acknowledged_at = new Date();
    if (status === "crew_assigned") ticket.crew_assigned_at = new Date();
    if (status === "closed") ticket.closed_at = new Date();

    ticket.status = status;
    await ticket.save();
    return res.json(await enrichTicketWithRestoration(ticket));
  } catch (err) {
    console.error("Ticket status update error:", err.message);
    return res.status(500).json({ error: "Failed to update ticket" });
  }
}

export async function listTickets(req, res) {
  try {
    const tickets = await Ticket.find().sort({ detected_at: -1 }).limit(100).select("-__v").lean();
    return res.json(await enrichTicketsWithRestoration(tickets));
  } catch (err) {
    console.error("Ticket list error:", err.message);
    return res.status(500).json({ error: "Failed to list tickets" });
  }
}

export async function getTicket(req, res) {
  try {
    const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id }).select("-__v").lean();
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    return res.json(await enrichTicketWithRestoration(ticket));
  } catch (err) {
    console.error("Ticket get error:", err.message);
    return res.status(500).json({ error: "Failed to load ticket" });
  }
}
