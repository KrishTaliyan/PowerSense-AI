import { Router } from "express";
import {
  postDelayedMessage,
  postDuplicateMessage,
  postFirmware12Device,
  postFeederFault,
  postConfiguredSimulation,
  postKillDevice,
  postMissingTelemetry,
  postMultipleFaults,
  postRepair,
  postScheduledOutage,
  postSpanFault,
  postTransformerFault,
} from "../controllers/simulationController.js";

const router = Router();
router.post("/simulate/span-fault", postSpanFault);
router.post("/simulate/transformer-fault", postTransformerFault);
router.post("/simulate/feeder-fault", postFeederFault);
router.post("/simulate/configured", postConfiguredSimulation);
router.post("/simulate/repair", postRepair);
router.post("/simulate/scheduled-outage", postScheduledOutage);
router.post("/simulate/kill-device", postKillDevice);
router.post("/simulate/missing-telemetry", postMissingTelemetry);
router.post("/simulate/firmware-12-device", postFirmware12Device);
router.post("/simulate/multiple-faults", postMultipleFaults);
router.post("/simulate/duplicate-message", postDuplicateMessage);
router.post("/simulate/delayed-message", postDelayedMessage);

export default router;
