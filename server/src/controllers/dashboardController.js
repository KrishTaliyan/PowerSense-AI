import Device from "../models/Device.js";
import Pole from "../models/Pole.js";
import Telemetry from "../models/Telemetry.js";
import Ticket from "../models/Ticket.js";
import Transformer from "../models/Transformer.js";
import { enrichTicketsWithRestoration } from "../ticket-engine/ticketService.js";

function minutesBetween(a, b) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

export async function getDashboard(req, res) {
  try {
    const offlineCutoff = new Date(Date.now() - 15 * 60 * 1000);

    const [
      activeFaults,
      criticalFaults,
      devicesOffline,
      darkPoles,
      transformers,
      tickets,
      recentTelemetry,
      resolvedTickets,
    ] = await Promise.all([
      Ticket.countDocuments({ status: { $nin: ["verified", "closed"] } }),
      Ticket.countDocuments({
        status: { $nin: ["verified", "closed"] },
        $or: [{ fault_type: { $in: ["feeder", "transformer"] } }, { affected_pole_count: { $gte: 25 } }],
      }),
      Device.countDocuments({
        $or: [{ last_seen_at: null }, { last_seen_at: { $lt: offlineCutoff } }],
      }),
      Pole.countDocuments({ is_energized: false }),
      Transformer.countDocuments(),
      Ticket.find().sort({ detected_at: -1 }).limit(20).select("-__v").lean(),
      Telemetry.find().sort({ received_at: -1 }).limit(25).select("-__v"),
      Ticket.find({ verified_at: { $ne: null } }).select("detected_at verified_at"),
    ]);

    const avgResolutionMinutes = average(
      resolvedTickets.map((ticket) => minutesBetween(ticket.detected_at, ticket.verified_at))
    );

    return res.json({
      stats: {
        active_faults: activeFaults,
        critical_faults: criticalFaults,
        devices_offline: devicesOffline,
        affected_poles: darkPoles,
        transformers,
        average_detection_seconds: null,
        average_resolution_minutes: avgResolutionMinutes,
      },
      tickets: await enrichTicketsWithRestoration(tickets),
      recent_telemetry: recentTelemetry,
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    return res.status(500).json({ error: "Failed to load dashboard" });
  }
}
