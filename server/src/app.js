// server/src/app.js
// Core Express app setup. Kept separate from server.js so the app
// itself is testable (e.g. supertest) without binding a real port.

import express from "express";
import cors from "cors";
import telemetryRoutes from "./routes/telemetryRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", telemetryRoutes);
app.use("/api", ticketRoutes);
// Simple liveness check — useful for Docker healthchecks later
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "powerfault-ai-server" });
});

export default app;