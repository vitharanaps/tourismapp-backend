// src/models/booking.model.js
import pool from "../config/db.js";

export async function createBooking(userId, data) {
    const { listingId, startDate, endDate, guests, totalPrice, currency } = data;

    // 1. Check Listing Type & Capacity
    const listingRes = await pool.query(
        "SELECT type, tour_capacity FROM listings WHERE id = $1",
        [listingId]
    );
    const listing = listingRes.rows[0];

    if (!listing) {
        throw new Error("Listing not found");
    }

    if (listing.type === 'tour' && listing.tour_capacity) {
        // 2. Check existing bookings
        const bookedRes = await pool.query(
            `SELECT COALESCE(SUM(guests), 0) as total_guests 
             FROM bookings 
             WHERE listing_id = $1 AND status != 'cancelled'`,
            [listingId]
        );
        const currentGuests = parseInt(bookedRes.rows[0].total_guests);

        if (currentGuests + guests > listing.tour_capacity) {
            throw new Error(`Tour is fully booked. Only ${listing.tour_capacity - currentGuests} seats remaining.`);
        }
    }

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
            l.city as listing_city,
            u.name as vendor_name
     FROM bookings b
     JOIN listings l ON b.listing_id = l.id
     JOIN users u ON b.vendor_id = u.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
        [userId]
    );
    return result.rows;
}

export async function getVendorBookings(vendorId, businessId = null) {
    let query = `SELECT b.*, 
            l.title as listing_title, 
            l.images as listing_images,
            l.price as base_price,
            u.name as user_name,
            u.email as user_email
     FROM bookings b
     JOIN listings l ON b.listing_id = l.id
     JOIN users u ON b.user_id = u.id
     WHERE l.vendor_id = $1`;
    const params = [vendorId];

    if (businessId) {
        query = `SELECT b.*, 
                l.title as listing_title, 
                l.images as listing_images,
                l.price as base_price,
                u.name as user_name,
                u.email as user_email
         FROM bookings b
         JOIN listings l ON b.listing_id = l.id
         JOIN users u ON b.user_id = u.id
         WHERE l.business_id = $1`;
        params[0] = businessId;
    }

    query += " ORDER BY b.created_at DESC";
    const result = await pool.query(query, params);
    return result.rows;
}
