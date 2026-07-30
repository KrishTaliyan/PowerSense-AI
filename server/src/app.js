// server/src/app.js
// Core Express app setup. Kept separate from server.js so the app
// itself is testable (e.g. supertest) without binding a real port.

import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Simple liveness check — useful for Docker healthchecks later
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "powerfault-ai-server" });
});

export default app;