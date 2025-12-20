// src/models/booking.model.js
import pool from "../config/db.js";

export async function createBooking(userId, data) {
    const { listingId, startDate, endDate, guests, totalPrice, currency } = data;

    const result = await pool.query(
        `INSERT INTO bookings
     (user_id, listing_id, start_date, end_date, guests, total_price, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [userId, listingId, startDate, endDate, guests, totalPrice, currency]
    );
    return result.rows[0];
}

export async function getUserBookings(userId) {
    const result = await pool.query(
        `SELECT b.*, 
            l.title as listing_title, 
            l.images as listing_images,
            l.address as listing_address,
            l.city as listing_city
     FROM bookings b
     JOIN listings l ON b.listing_id = l.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
        [userId]
    );
    return result.rows;
}
