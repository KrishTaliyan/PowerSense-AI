import Ticket from "../models/Ticket.js";
import Pole from "../models/Pole.js";

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
      return res.status(409).json({
        error: "Cannot close: ticket has not been verified by telemetry yet",
      });
    }

    if (status === "resolved") {
      const poles = await Pole.find({ pole_id: { $in: ticket.affected_pole_ids } });
      const anyDark = poles.some((p) => !p.is_energized);
      if (anyDark) {
        return res.status(409).json({
          error: "Cannot mark resolved: affected poles are still dark in telemetry",
        });
      }

      ticket.resolved_at = new Date();
      ticket.verified_at = new Date();
      ticket.status = "verified";
      await ticket.save();
      return res.json(ticket);
    }

    if (status === "acknowledged") ticket.acknowledged_at = new Date();
    if (status === "crew_assigned") ticket.crew_assigned_at = new Date();
    if (status === "closed") ticket.closed_at = new Date();

    ticket.status = status;
    await ticket.save();
    return res.json(ticket);
  } catch (err) {
    console.error("Ticket status update error:", err.message);
    return res.status(500).json({ error: "Failed to update ticket" });
  }
}

export async function listTickets(req, res) {
  try {
    const tickets = await Ticket.find().sort({ detected_at: -1 }).limit(100);
    return res.json(tickets);
  } catch (err) {
    console.error("Ticket list error:", err.message);
    return res.status(500).json({ error: "Failed to list tickets" });
  }
}

export async function getTicket(req, res) {
  try {
    const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    return res.json(ticket);
  } catch (err) {
    console.error("Ticket get error:", err.message);
    return res.status(500).json({ error: "Failed to load ticket" });
  }
}
