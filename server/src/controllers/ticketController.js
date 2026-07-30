import Ticket from "../models/Ticket.js";
import Pole from "../models/Pole.js";

export async function updateTicketStatus(req, res) {
  const { ticket_id } = req.params;
  const { status } = req.body;

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
        error: "Cannot mark resolved: some affected poles are still dark",
      });
    }
    ticket.resolved_at = new Date();
  }

  if (status === "acknowledged") ticket.acknowledged_at = new Date();
  if (status === "crew_assigned") ticket.crew_assigned_at = new Date();
  if (status === "closed") ticket.closed_at = new Date();

  ticket.status = status;
  await ticket.save();
  return res.json(ticket);
}

export async function listTickets(req, res) {
  const tickets = await Ticket.find().sort({ detected_at: -1 });
  return res.json(tickets);
}

export async function getTicket(req, res) {
  const ticket = await Ticket.findOne({ ticket_id: req.params.ticket_id });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  return res.json(ticket);
}