import { Router } from "express";
import {
  postDelayedMessage,
  postDuplicateMessage,
  postFeederFault,
  postConfiguredSimulation,
  postKillDevice,
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
router.post("/simulate/duplicate-message", postDuplicateMessage);
router.post("/simulate/delayed-message", postDelayedMessage);

export default router;
