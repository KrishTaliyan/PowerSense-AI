import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Pole from "../src/models/Pole.js";
import Transformer from "../src/models/Transformer.js";
import Device from "../src/models/Device.js";
import Telemetry from "../src/models/Telemetry.js";
import Ticket from "../src/models/Ticket.js";
import ScheduledOutage from "../src/models/ScheduledOutage.js";
import generateNetwork from "../src/simulation/generateNetwork.js";

async function seed() {
  await connectDB();

  const { transformers, poles } = generateNetwork();

  await Promise.all([
    Pole.deleteMany({}),
    Transformer.deleteMany({}),
    Device.deleteMany({}),
    Telemetry.deleteMany({}),
    Ticket.deleteMany({}),
    ScheduledOutage.deleteMany({}),
  ]);

  await Transformer.insertMany(transformers);
  await Pole.insertMany(poles);

  const devices = poles
    .filter((p) => p.device_id)
    .map((p) => {
      const isLegacy = Math.random() < 0.08;
      return {
        device_id: p.device_id,
        pole_id: p.pole_id,
        fw: isLegacy ? "1.2.4" : "1.4.2",
        is_legacy_firmware: isLegacy,
        last_seen_at: new Date(),
        last_seq: 0,
      };
    });

  await Device.insertMany(devices);

  console.log(`Seeded: ${transformers.length} transformers, ${poles.length} poles, ${devices.length} devices`);
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
