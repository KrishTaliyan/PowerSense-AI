import {
  generateDelayedMessage,
  generateDuplicateMessage,
  injectFeederFault,
  injectScheduledOutage,
  injectSpanFault,
  injectTransformerFault,
  killDevice,
  repairFault,
  repairFeederFault,
  repairTransformerFault,
} from "../simulation/simulateFault.js";

function summarizeSimulation(result) {
  return {
    target: result.target || null,
    telemetry_count: result.telemetry?.length || 0,
    tickets: result.tickets || [],
    verified: result.verified || [],
    outage: result.outage || null,
  };
}

export async function postSpanFault(req, res) {
  try {
    const result = await injectSpanFault(req.body.dt_id, req.body.from_seq ?? 5);
    res.status(201).json(summarizeSimulation(result));
  } catch (err) {
    console.error("Span fault simulation error:", err.message);
    res.status(500).json({ error: "Failed to inject span fault" });
  }
}

export async function postTransformerFault(req, res) {
  try {
    const result = await injectTransformerFault(req.body.dt_id);
    res.status(201).json(summarizeSimulation(result));
  } catch (err) {
    console.error("Transformer fault simulation error:", err.message);
    res.status(500).json({ error: "Failed to inject transformer fault" });
  }
}

export async function postFeederFault(req, res) {
  try {
    const result = await injectFeederFault(req.body.feeder_id);
    res.status(201).json(summarizeSimulation(result));
  } catch (err) {
    console.error("Feeder fault simulation error:", err.message);
    res.status(500).json({ error: "Failed to inject feeder fault" });
  }
}

export async function postRepair(req, res) {
  try {
    const { scope = "span", dt_id, feeder_id, from_seq = 5 } = req.body;
    const result =
      scope === "feeder"
        ? await repairFeederFault(feeder_id)
        : scope === "transformer"
          ? await repairTransformerFault(dt_id)
          : await repairFault(dt_id, from_seq);

    res.status(200).json(summarizeSimulation(result));
  } catch (err) {
    console.error("Repair simulation error:", err.message);
    res.status(500).json({ error: "Failed to repair simulated fault" });
  }
}

export async function postScheduledOutage(req, res) {
  try {
    const result = await injectScheduledOutage(req.body.dt_id);
    res.status(201).json(summarizeSimulation(result));
  } catch (err) {
    console.error("Scheduled outage simulation error:", err.message);
    res.status(500).json({ error: "Failed to inject scheduled outage" });
  }
}

export async function postKillDevice(req, res) {
  try {
    const result = await killDevice(req.body.device_id);
    res.status(200).json(result);
  } catch (err) {
    console.error("Kill device simulation error:", err.message);
    res.status(500).json({ error: "Failed to kill device" });
  }
}

export async function postDuplicateMessage(req, res) {
  try {
    const result = await generateDuplicateMessage(req.body.device_id);
    res.status(201).json({
      id: result.record?._id,
      applied: result.applied,
      is_duplicate: result.record?.is_duplicate || false,
    });
  } catch (err) {
    console.error("Duplicate message simulation error:", err.message);
    res.status(500).json({ error: "Failed to generate duplicate message" });
  }
}

export async function postDelayedMessage(req, res) {
  try {
    const result = await generateDelayedMessage(req.body.device_id);
    res.status(201).json({
      id: result.record?._id,
      applied: result.applied,
      is_stale: result.record?.is_stale || false,
    });
  } catch (err) {
    console.error("Delayed message simulation error:", err.message);
    res.status(500).json({ error: "Failed to generate delayed message" });
  }
}
