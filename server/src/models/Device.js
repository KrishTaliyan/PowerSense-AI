import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    device_id: { type: String, required: true, unique: true, index: true },
    pole_id: { type: String, required: true, index: true },
    fw: { type: String, default: null },

    last_seq: { type: Number, default: 0 }, // dedup/ordering ke liye
    last_seen_at: { type: Date, default: null },
    battery_mv: { type: Number, default: null },
    rssi: { type: Number, default: null },

    // firmware 1.2.x power_lost bhejta hi nahi — sirf heartbeat rukta hai
    is_legacy_firmware: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Device", deviceSchema);