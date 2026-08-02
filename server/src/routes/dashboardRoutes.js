import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.get("/dashboard", getDashboard);

export default router;
