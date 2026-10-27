import { ingestTelemetry } from "../services/telemetryService.js";
import Telemetry from "../models/Telemetry.js";

function parseLimit(value, fallback, max) {
  const limit = Number.parseInt(value, 10);
  return Number.isFinite(limit) && limit > 0 ? Math.min(limit, max) : fallback;
}

export async function postTelemetry(req, res) {
  const { device_id, pole_id, event, energized, ts, seq } = req.body;

  if (!device_id || !pole_id || !event || energized === undefined || !ts || seq === undefined) {
    return res.status(400).json({ error: "Missing required telemetry fields" });
  }

  try {
    const { record, applied } = await ingestTelemetry(req.body);
    return res.status(201).json({ id: record._id, applied });
  } catch (err) {
    console.error("Telemetry ingest error:", err.message);
    return res.status(500).json({ error: "Failed to process telemetry" });
  }
}

export async function listRecentTelemetry(req, res) {
  try {
    const limit = parseLimit(req.query.limit, 50, 200);
    const records = await Telemetry.find()
      .sort({ received_at: -1 })
      .limit(limit)
      .select("-__v")
      .lean();

    return res.json(records);
  } catch (err) {
    console.error("Telemetry list error:", err.message);
    return res.status(500).json({ error: "Failed to list telemetry" });
  }
}
