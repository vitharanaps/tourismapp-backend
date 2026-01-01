// src/routes/booking.routes.js
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { createBooking, getUserBookings, cancelBooking, appealBooking, updateBookingPaymentStatus } from "../controllers/booking.controller.js";

const router = Router();

router.use(isAuthenticated);

router.post("/", createBooking);
router.get("/", getUserBookings);

// PATCH routes for booking status updates
router.patch("/:bookingId/cancel", cancelBooking);
router.patch("/:bookingId/appeal", appealBooking);
router.patch("/:bookingId/payment-status", updateBookingPaymentStatus);

export default router;
