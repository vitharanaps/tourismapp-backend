// backend/src/controllers/review.controller.js
import pool from "../config/db.js";

export async function addReview(req, res) {
    try {
        const userId = req.user.id;
        const { listingId, rating, comment, bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required to leave a review." });
        }

        // Check if user has a confirmed booking for this listing
        const bookingCheck = await pool.query(
            `SELECT * FROM bookings 
             WHERE id = $1 AND user_id = $2 AND listing_id = $3`,
            [bookingId, userId, listingId]
        );

        if (bookingCheck.rows.length === 0) {
            return res.status(403).json({ message: "You can only review properties you have booked." });
        }

        // Check if the user has already reviewed this specific booking
        const existingReview = await pool.query(
            `SELECT * FROM reviews WHERE booking_id = $1`,
            [bookingId]
        );

        if (existingReview.rows.length > 0) {
            return res.status(400).json({ message: "You have already reviewed this booking." });
        }

        const result = await pool.query(
            `INSERT INTO reviews (listing_id, user_id, booking_id, rating, comment)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [listingId, userId, bookingId, rating, comment]
        );

        // Update listing average rating and count
        await pool.query(
            `UPDATE listings 
             SET rating = (SELECT AVG(rating) FROM reviews WHERE listing_id = $1),
                 review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = $1)
             WHERE id = $1`,
            [listingId]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Add review error:", err);
        return res.status(500).json({ message: "Failed to add review" });
    }
}

export async function getEligibleBookings(req, res) {
    try {
        const userId = req.user.id;
        const { listingId } = req.params;

        const result = await pool.query(
            `SELECT b.* 
             FROM bookings b
             LEFT JOIN reviews r ON b.id = r.booking_id
             WHERE b.user_id = $1 AND b.listing_id = $2 AND r.id IS NULL`,
            [userId, listingId]
        );

        return res.json(result.rows);
    } catch (err) {
        console.error("Get eligible bookings error:", err);
        return res.status(500).json({ message: "Failed to retrieve eligible bookings" });
    }
}

export async function getListingReviews(req, res) {
    try {
        const { listingId } = req.params;
        const { page = 1, limit = 10, sortBy = 'newest' } = req.query;
        const offset = (page - 1) * limit;

        let orderBy = 'r.created_at DESC';
        if (sortBy === 'highest_rating') {
            orderBy = 'r.rating DESC, r.created_at DESC';
        } else if (sortBy === 'lowest_rating') {
            orderBy = 'r.rating ASC, r.created_at DESC';
        }

        const result = await pool.query(
            `SELECT r.*, u.name as user_name, u.avatar_url as user_image
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             WHERE r.listing_id = $1
             ORDER BY ${orderBy}
             LIMIT $2 OFFSET $3`,
            [listingId, limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM reviews WHERE listing_id = $1`,
            [listingId]
        );

        return res.json({
            reviews: result.rows,
            totalCount: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Get reviews error:", err);
        return res.status(500).json({ message: "Failed to retrieve reviews" });
    }
}
