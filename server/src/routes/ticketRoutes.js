import { Router } from "express";
import { updateTicketStatus, listTickets, getTicket } from "../controllers/ticketController.js";

const router = Router();
router.get("/tickets", listTickets);
router.get("/tickets/:ticket_id", getTicket);
router.patch("/tickets/:ticket_id/status", updateTicketStatus);

export default router;