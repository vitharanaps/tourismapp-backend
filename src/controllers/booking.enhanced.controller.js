// ============================================
// ENHANCED BOOKING CONTROLLER
// Dynamic booking handling based on category configuration
// ============================================

import { BookingService } from '../services/booking.service.js';
import pool from '../config/db.js';

/**
 * Create a new booking
 * POST /api/bookings
 */
export async function createBooking(req, res) {
    try {
        const userId = req.user.id;
        const { listingId, ...bookingData } = req.body;

        if (!listingId) {
            return res.status(400).json({ message: 'Listing ID is required' });
        }

        const booking = await BookingService.createBooking(
            userId,
            listingId,
            bookingData
        );

        return res.status(201).json({
            message: 'Booking created successfully',
            booking
        });
    } catch (error) {
        console.error('Create booking error:', error);
        return res.status(400).json({
            message: error.message || 'Failed to create booking'
        });
    }
}

/**
 * Get booking requirements for a listing
 * GET /api/bookings/requirements/:listingId
 */
export async function getBookingRequirements(req, res) {
    try {
        const { listingId } = req.params;

        const result = await pool.query(
            `SELECT l.*, c.booking_config, c.name as category_name, c.slug as category_slug
             FROM listings l
             JOIN categories c ON l.category_id = c.id
             WHERE l.id = $1`,
            [listingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        const listing = result.rows[0];

        return res.json({
            listingId: listing.id,
            category: {
                id: listing.category_id,
                name: listing.category_name,
                slug: listing.category_slug
            },
            bookingConfig: listing.booking_config,
            pricing: {
                basePrice: listing.price,
                currency: listing.currency || 'USD'
            }
        });
    } catch (error) {
        console.error('Get booking requirements error:', error);
        return res.status(500).json({ message: 'Failed to retrieve booking requirements' });
    }
}

/**
 * Get user's bookings
 * GET /api/bookings/user
 */
export async function getUserBookings(req, res) {
    try {
        const userId = req.user.id;
        const { status, category_id, limit } = req.query;

        const bookings = await BookingService.getUserBookings(userId, {
            status,
            category_id: category_id ? parseInt(category_id) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });

        return res.json({ bookings });
    } catch (error) {
        console.error('Get user bookings error:', error);
        return res.status(500).json({ message: 'Failed to retrieve bookings' });
    }
}

/**
 * Get vendor's bookings
 * GET /api/bookings/vendor
 */
export async function getVendorBookings(req, res) {
    try {
        const vendorId = req.user.id;
        const { status, category_id, business_id } = req.query;

        let query = `
            SELECT b.*,
                   l.title as listing_title,
                   l.images as listing_images,
                   c.name as category_name,
                   c.slug as category_slug,
                   u.name as customer_name,
                   u.email as customer_email
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN categories c ON b.category_id = c.id
            JOIN users u ON b.user_id = u.id
            WHERE b.vendor_id = $1
        `;

        const params = [vendorId];
        let paramIndex = 2;

        if (business_id) {
            query += ` AND b.business_id = $${paramIndex}`;
            params.push(business_id);
            paramIndex++;
        }

        if (status) {
            query += ` AND b.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (category_id) {
            query += ` AND b.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }

        query += ' ORDER BY b.created_at DESC';

        const result = await pool.query(query, params);

        return res.json({ bookings: result.rows });
    } catch (error) {
        console.error('Get vendor bookings error:', error);
        return res.status(500).json({ message: 'Failed to retrieve bookings' });
    }
}

/**
 * Get booking details
 * GET /api/bookings/:id
 */
export async function getBookingDetails(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const booking = await BookingService.getBookingDetails(id, userId);

        return res.json({ booking });
    } catch (error) {
        console.error('Get booking details error:', error);
        return res.status(404).json({
            message: error.message || 'Booking not found'
        });
    }
}

/**
 * Update booking status (vendor action)
 * PATCH /api/bookings/:id/status
 */
export async function updateBookingStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role || 'vendor';

        if (!['confirmed', 'rejected', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const booking = await BookingService.updateBookingStatus(
            id,
            status,
            userId,
            userRole
        );

        return res.json({
            message: `Booking ${status} successfully`,
            booking
        });
    } catch (error) {
        console.error('Update booking status error:', error);
        return res.status(400).json({
            message: error.message || 'Failed to update booking'
        });
    }
}

/**
 * Cancel booking (user action)
 * POST /api/bookings/:id/cancel
 */
export async function cancelBooking(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const booking = await BookingService.cancelBooking(id, userId, reason);

        return res.json({
            message: 'Booking cancelled successfully',
            booking
        });
    } catch (error) {
        console.error('Cancel booking error:', error);
        return res.status(400).json({
            message: error.message || 'Failed to cancel booking'
        });
    }
}

/**
 * Check availability for a listing
 * POST /api/bookings/check-availability
 */
export async function checkAvailability(req, res) {
    try {
        const { listingId, start_date, end_date, booking_date } = req.body;

        if (!listingId) {
            return res.status(400).json({ message: 'Listing ID is required' });
        }

        // Get listing category
        const listingResult = await pool.query(
            'SELECT category_id FROM listings WHERE id = $1',
            [listingId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        const { category_id } = listingResult.rows[0];

        // Get category config
        const categoryResult = await pool.query(
            'SELECT booking_config FROM categories WHERE id = $1',
            [category_id]
        );

        const config = categoryResult.rows[0].booking_config;

        // Check for conflicts based on date type
        let conflictQuery = '';
        let params = [listingId];

        if (config.date_type === 'range' && start_date && end_date) {
            conflictQuery = `
                SELECT COUNT(*) FROM bookings
                WHERE listing_id = $1
                AND status NOT IN ('cancelled', 'rejected')
                AND (
                    (start_date <= $2 AND end_date >= $2) OR
                    (start_date <= $3 AND end_date >= $3) OR
                    (start_date >= $2 AND end_date <= $3)
                )
            `;
            params.push(start_date, end_date);
        } else if (config.date_type === 'single' && booking_date) {
            conflictQuery = `
                SELECT COUNT(*) FROM bookings
                WHERE listing_id = $1
                AND status NOT IN ('cancelled', 'rejected')
                AND booking_date = $2
            `;
            params.push(booking_date);
        } else {
            // No date validation needed
            return res.json({ available: true });
        }

        const conflictResult = await pool.query(conflictQuery, params);
        const hasConflict = parseInt(conflictResult.rows[0].count) > 0;

        return res.json({
            available: !hasConflict,
            message: hasConflict ? 'Selected dates are not available' : 'Available'
        });
    } catch (error) {
        console.error('Check availability error:', error);
        return res.status(500).json({ message: 'Failed to check availability' });
    }
}

/**
 * Validate booking data
 * POST /api/bookings/validate
 */
export async function validateBooking(req, res) {
    try {
        const { listingId, ...bookingData } = req.body;

        // Get listing category
        const listingResult = await pool.query(
            'SELECT category_id FROM listings WHERE id = $1',
            [listingId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        const { category_id } = listingResult.rows[0];

        // Validate booking
        const validation = await BookingService.validateBookingRequest(
            category_id,
            bookingData
        );

        if (!validation.valid) {
            return res.status(400).json({
                valid: false,
                errors: validation.errors
            });
        }

        return res.json({
            valid: true,
            message: 'Booking data is valid'
        });
    } catch (error) {
        console.error('Validate booking error:', error);
        return res.status(500).json({ message: 'Validation failed' });
    }
}
