import mongoose from "mongoose";

const scheduledOutageSchema = new mongoose.Schema(
  {
    outage_id: { type: String, required: true, unique: true, index: true },
    scope: { type: String, enum: ["feeder", "dt"], required: true },
    target_id: { type: String, required: true, index: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String, default: null },
    is_cancelled: { type: Boolean, default: false }, // feed doesn't always update this
  },
  { timestamps: true }
);

export default mongoose.model("ScheduledOutage", scheduledOutageSchema);