// src/routes/booking.routes.js
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { createBooking, getUserBookings } from "../controllers/booking.controller.js";

const router = Router();

router.use(isAuthenticated);

router.post("/", createBooking);
router.get("/", getUserBookings);

export default router;
