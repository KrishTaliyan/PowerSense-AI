import { ingestTelemetry } from "../services/telemetryService.js";

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