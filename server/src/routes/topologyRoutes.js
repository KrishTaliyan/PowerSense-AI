import { Router } from "express";
import { listPoles, listTransformers } from "../controllers/topologyController.js";

const router = Router();

router.get("/transformers", listTransformers);
router.get("/poles", listPoles);

export default router;
