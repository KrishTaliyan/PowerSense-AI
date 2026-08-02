import { Router } from "express";
import { listRecentTelemetry, postTelemetry } from "../controllers/telemetryController.js";

const router = Router();
router.post("/telemetry", postTelemetry);
router.get("/telemetry/recent", listRecentTelemetry);

export default router;
