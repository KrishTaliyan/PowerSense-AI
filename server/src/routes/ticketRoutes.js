import { Router } from "express";
import {
  getTicket,
  getTicketReplay,
  listTickets,
  updateTicketStatus,
} from "../controllers/ticketController.js";

const router = Router();
router.get("/tickets", listTickets);
router.get("/tickets/:ticket_id/replay", getTicketReplay);
router.get("/tickets/:ticket_id", getTicket);
router.patch("/tickets/:ticket_id/status", updateTicketStatus);

export default router;
