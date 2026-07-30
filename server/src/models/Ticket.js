import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticket_id: { type: String, required: true, unique: true, index: true },

    fault_type: {
      type: String,
      enum: ["span", "transformer", "feeder"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "detected",
        "acknowledged",
        "crew_assigned",
        "resolved",
        "verified",
        "closed",
      ],
      default: "detected",
      index: true,
    },

    // Localization output
    last_live_pole_id: { type: String, default: null },
    first_dark_pole_id: { type: String, default: null },
    dt_id: { type: String, default: null },
    feeder_id: { type: String, default: null },
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    pincode: { type: String, default: null },

    affected_pole_ids: [{ type: String }],
    affected_pole_count: { type: Number, default: 0 },

    confidence: { type: Number, min: 0, max: 1, required: true },
    confidence_reason: { type: String, default: null },

    // Missing-topology fallback flag — span-level vs DT-level answer
    localization_level: {
      type: String,
      enum: ["span", "dt", "feeder"],
      required: true,
    },

    detected_at: { type: Date, required: true },
    acknowledged_at: { type: Date, default: null },
    crew_assigned_at: { type: Date, default: null },
    resolved_at: { type: Date, default: null }, // lineman claims fixed
    verified_at: { type: Date, default: null }, // telemetry confirms
    closed_at: { type: Date, default: null },

    ai_summary: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);