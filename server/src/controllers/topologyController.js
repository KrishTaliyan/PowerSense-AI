import Pole from "../models/Pole.js";
import Transformer from "../models/Transformer.js";

export async function listTransformers(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 80), 200);
    const transformers = await Transformer.find().sort({ feeder_id: 1, dt_id: 1 }).limit(limit).lean();

    const poleCounts = await Pole.aggregate([
      { $group: { _id: "$dt_id", pole_count: { $sum: 1 }, device_count: { $sum: { $cond: ["$device_id", 1, 0] } } } },
    ]);
    const countsByDt = new Map(poleCounts.map((row) => [row._id, row]));

    return res.json(
      transformers.map((transformer) => ({
        ...transformer,
        pole_count: countsByDt.get(transformer.dt_id)?.pole_count || 0,
        device_count: countsByDt.get(transformer.dt_id)?.device_count || 0,
      }))
    );
  } catch (err) {
    console.error("Transformer list error:", err.message);
    return res.status(500).json({ error: "Failed to list transformers" });
  }
}

export async function listPoles(req, res) {
  try {
    const query = {};
    if (req.query.dt_id) query.dt_id = req.query.dt_id;
    if (req.query.feeder_id) query.feeder_id = req.query.feeder_id;

    const limit = Math.min(Number(req.query.limit || 500), 2000);
    const poles = await Pole.find(query)
      .sort({ feeder_id: 1, dt_id: 1, seq_on_line: 1, pole_id: 1 })
      .limit(limit)
      .select("-__v");

    return res.json(poles);
  } catch (err) {
    console.error("Pole list error:", err.message);
    return res.status(500).json({ error: "Failed to list poles" });
  }
}
