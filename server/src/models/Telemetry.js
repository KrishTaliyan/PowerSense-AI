import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema(
  {
    device_id: { type: String, required: true, index: true },
    pole_id: { type: String, required: true, index: true },

    event: {
      type: String,
      enum: ["heartbeat", "power_lost", "power_restored", "boot"],
      required: true,
    },
    energized: { type: Boolean, required: true },

    ts: { type: Date, required: true }, // device ka apna clock, ±90s skew
    received_at: { type: Date, default: Date.now }, // hamara server clock, dedup ke liye trustworthy

    seq: { type: Number, required: true }, // per-device monotonic, boot pe reset
    battery_mv: { type: Number, default: null },
    rssi: { type: Number, default: null },
    fw: { type: String, default: null },

    // Ingest ke waqt hi mark kar denge agar ye duplicate/stale nikla —
    // fault-engine ko sirf valid records process karne honge
    is_duplicate: { type: Boolean, default: false },
    is_stale: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Duplicate detection ke liye: same device + same seq = same message
telemetrySchema.index({ device_id: 1, seq: 1 });

export default mongoose.model("Telemetry", telemetrySchema);
