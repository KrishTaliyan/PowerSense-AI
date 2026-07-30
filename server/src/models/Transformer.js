import mongoose from "mongoose";

const transformerSchema = new mongoose.Schema(
  {
    dt_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    feeder_id: { type: String, required: true, index: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    capacity_kva: { type: Number, default: null },
    households_served: { type: Number, default: null },

    // 60% DTs ke liye pole-order missing hota — ye flag Pole-level
    // per-poll compute karne ke bajaye yahin cache karenge
    has_known_topology: { type: Boolean, default: false },

    is_energized: { type: Boolean, default: true },
    last_telemetry_at: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Transformer", transformerSchema);