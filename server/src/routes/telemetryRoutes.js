import { Router } from "express";
import { postTelemetry } from "../controllers/telemetryController.js";

const router = Router();
router.post("/telemetry", postTelemetry);

export default router;