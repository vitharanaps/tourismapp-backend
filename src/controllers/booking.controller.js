import pool from "../config/db.js";
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

export async function getVendorBookings(req, res) {
    try {
        const userId = req.user.id;
        const { businessId } = req.query;

        if (businessId) {
            const accessCheck = await pool.query(
                `SELECT 1 FROM businesses b
                 LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
                 WHERE b.id = $2 AND (b.owner_id = $1 OR bs.user_id = $1)`,
                [userId, businessId]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ message: "Unauthorized access to this business bookings" });
            }
        }

        const bookings = await BookingModel.getVendorBookings(userId, businessId);
        return res.json(bookings);
    } catch (err) {
        console.error("Get vendor bookings error:", err);
        return res.status(500).json({ message: "Failed to retrieve vendor bookings" });
    }
}

export async function updateBookingPaymentStatus(req, res) {
    try {
        const { bookingId } = req.params;
        const { status } = req.body; // 'paid'
        const userId = req.user.id;

        // Verify it is a cash booking and unpaid
        const result = await pool.query(
            `UPDATE bookings 
             SET payment_status = $1 
             WHERE id = $2 
             AND payment_method = 'cash' 
             AND payment_status = 'unpaid'
             AND listing_id IN (SELECT id FROM listings WHERE vendor_id = $3)
             RETURNING *`,
            [status, bookingId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Booking not found or criteria not met (must be unpaid cash booking)" });
        }

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Update payment status error:", err);
        return res.status(500).json({ message: "Failed to update payment status" });
    }
}

export async function cancelBooking(req, res) {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role; // 'user' or 'businessOwner'/'admin'

        // Check ownership (either the user who booked, or the vendor of the listing)
        // This query checks both cases
        const result = await pool.query(
            `UPDATE bookings b
             SET status = 'cancelled', updated_at = NOW()
             FROM listings l
             WHERE b.listing_id = l.id
             AND b.id = $1
             AND (b.user_id = $2 OR l.vendor_id = $2)
             RETURNING b.*`,
            [bookingId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Cancel booking error:", err);
        return res.status(500).json({ message: "Failed to cancel booking" });
    }
}

export async function appealBooking(req, res) {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        // Only the user who booked can appeal
        const result = await pool.query(
            `UPDATE bookings 
             SET status = 'appealed', updated_at = NOW()
             WHERE id = $1 AND user_id = $2 AND status = 'cancelled'
             RETURNING *`,
            [bookingId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Booking not found or not eligible for appeal" });
        }

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Appeal booking error:", err);
        return res.status(500).json({ message: "Failed to appeal booking" });
    }
}
