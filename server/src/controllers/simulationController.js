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

export async function postConfiguredSimulation(req, res) {
  try {
    const {
      fault_type = "span",
      severity = 50,
      dt_id,
      feeder_id,
      noise = {},
      repair_after_fault = false,
    } = req.body;
    const severityNumber = Math.max(1, Math.min(100, Number(severity) || 50));
    const fromSeq = Math.max(1, Math.round(12 - severityNumber / 10));

    const faultResult =
      fault_type === "feeder"
        ? await injectFeederFault(feeder_id)
        : fault_type === "transformer"
          ? await injectTransformerFault(dt_id)
          : await injectSpanFault(dt_id, fromSeq);

    const noiseResults = [];
    if (noise.kill_device) noiseResults.push({ type: "offline_device", result: await killDevice(noise.device_id) });
    if (noise.duplicate_packet) {
      noiseResults.push({
        type: "duplicate_packet",
        result: await generateDuplicateMessage(noise.device_id),
      });
    }
    if (noise.delayed_packet) {
      noiseResults.push({
        type: "delayed_packet",
        result: await generateDelayedMessage(noise.device_id),
      });
    }

    const repairResult = repair_after_fault
      ? fault_type === "feeder"
        ? await repairFeederFault(feeder_id)
        : fault_type === "transformer"
          ? await repairTransformerFault(dt_id)
          : await repairFault(dt_id, fromSeq)
      : null;

    res.status(201).json({
      ...summarizeSimulation(faultResult),
      configured: {
        fault_type,
        severity: severityNumber,
        from_seq: fromSeq,
        noise: Object.keys(noise).filter((key) => noise[key] === true),
        repaired: Boolean(repairResult),
      },
      noise_results: noiseResults.map((entry) => ({
        type: entry.type,
        applied: entry.result?.applied ?? Boolean(entry.result?.device),
      })),
      repair: repairResult ? summarizeSimulation(repairResult) : null,
      verified: repairResult?.verified || faultResult.verified || [],
    });
  } catch (err) {
    console.error("Configured simulation error:", err.message);
    res.status(500).json({ error: "Failed to run configured simulation" });
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
