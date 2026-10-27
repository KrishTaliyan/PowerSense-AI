import compression from "compression";
import cors from "cors";
import express from "express";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import simulationRoutes from "./routes/simulationRoutes.js";
import telemetryRoutes from "./routes/telemetryRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import topologyRoutes from "./routes/topologyRoutes.js";

const app = express();

app.disable("x-powered-by");
app.use(compression());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api", telemetryRoutes);
app.use("/api", ticketRoutes);
app.use("/api", simulationRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", topologyRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "powerfault-ai-server" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Malformed JSON bodies and other unhandled errors still answer in JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error("Unhandled API error:", err.message);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});

export default app;
