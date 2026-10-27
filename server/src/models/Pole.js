
import mongoose from "mongoose";

const poleSchema = new mongoose.Schema(
  {

    pole_id: {
      type: String,
      required: true,
      unique: true,
      index: true, 
    },

    lat: { type: Number, required: true },
    lon: { type: Number, required: true },

    feeder_id: { type: String, required: true, index: true },
    dt_id: { type: String, required: true, index: true },


    seq_on_line: { type: Number, default: null },
    parent_pole_id: { type: String, default: null },

    pole_type: { type: String, default: null }, // cosmetic, jaise "LT-9m-PCC"
    ward: { type: String, default: null },

    pincode: { type: String, default: null },

   
    device_id: { type: String, default: null, index: true },

    is_energized: { type: Boolean, default: true },
    last_telemetry_at: { type: Date, default: null },
  },
  {
    timestamps: true, 
  }
);

// Dashboard counts dark poles on every poll.
poleSchema.index({ is_energized: 1 });
poleSchema.index({ feeder_id: 1, dt_id: 1, seq_on_line: 1, pole_id: 1 });

const Pole = mongoose.model("Pole", poleSchema);

export default Pole;