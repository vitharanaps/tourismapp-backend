// src/controllers/booking.controller.js
import * as BookingModel from "../models/booking.model.js";

export async function createBooking(req, res) {
    try {
        const userId = req.user.id;
        const booking = await BookingModel.createBooking(userId, req.body);
        return res.status(201).json(booking);
    } catch (err) {
        console.error("Create booking error:", err);
        return res.status(500).json({ message: "Failed to create booking" });
    }
}

export async function getUserBookings(req, res) {
    try {
        const userId = req.user.id;
        const bookings = await BookingModel.getUserBookings(userId);
        return res.json(bookings);
    } catch (err) {
        console.error("Get bookings error:", err);
        return res.status(500).json({ message: "Failed to retrieve bookings" });
    }
}
