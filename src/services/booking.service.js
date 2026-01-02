// ============================================
// BOOKING SERVICE
// Handles all booking validation and business logic
// ============================================

import pool from '../config/db.js';

export class BookingService {
    /**
     * Validate booking data against category configuration
     */
    static async validateBookingRequest(categoryId, bookingData) {
        const category = await pool.query(
            'SELECT booking_config FROM categories WHERE id = $1',
            [categoryId]
        );

        if (category.rows.length === 0) {
            throw new Error('Invalid category');
        }

        const config = category.rows[0].booking_config;
        const errors = [];

        // Check if booking is required
        if (!config.requires_booking) {
            // Booking is optional, skip validation
            return { valid: true, config };
        }

        // Validate date type
        if (config.date_type === 'range') {
            if (!bookingData.start_date || !bookingData.end_date) {
                errors.push('Start date and end date are required for range bookings');
            }

            if (bookingData.start_date && bookingData.end_date) {
                const start = new Date(bookingData.start_date);
                const end = new Date(bookingData.end_date);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

                if (config.min_booking_days && days < config.min_booking_days) {
                    errors.push(`Minimum booking duration is ${config.min_booking_days} days`);
                }

                if (config.max_booking_days && days > config.max_booking_days) {
                    errors.push(`Maximum booking duration is ${config.max_booking_days} days`);
                }
            }
        } else if (config.date_type === 'single') {
            if (!bookingData.booking_date) {
                errors.push('Booking date is required');
            }
        }

        // Validate advance booking
        if (config.advance_booking_days && bookingData.start_date) {
            const bookingDate = new Date(bookingData.start_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysInAdvance = Math.ceil((bookingDate - today) / (1000 * 60 * 60 * 24));

            if (daysInAdvance < config.advance_booking_days) {
                errors.push(`Bookings must be made at least ${config.advance_booking_days} days in advance`);
            }
        }

        // Validate time requirement
        if (config.requires_time && !bookingData.booking_time) {
            errors.push('Booking time is required');
        }

        // Validate guests
        if (config.requires_guests) {
            if (!bookingData.guests || !bookingData.guests.total || bookingData.guests.total < 1) {
                errors.push('Guest count is required');
            }

            // Validate guest types if specified
            if (config.guest_types && config.guest_types.length > 0) {
                const guestData = bookingData.guests || {};
                let totalGuests = 0;

                config.guest_types.forEach(guestType => {
                    if (guestData[guestType]) {
                        totalGuests += parseInt(guestData[guestType]);
                    }
                });

                if (totalGuests !== (guestData.total || 0)) {
                    errors.push('Guest breakdown does not match total');
                }
            }
        }

        // Validate custom fields
        if (config.custom_fields && config.custom_fields.length > 0) {
            const customData = bookingData.custom_data || {};

            config.custom_fields.forEach(field => {
                if (field.required && !customData[field.name]) {
                    errors.push(`${field.label} is required`);
                }
            });
        }

        if (errors.length > 0) {
            return { valid: false, errors, config };
        }

        return { valid: true, config };
    }

    /**
     * Create a new booking
     */
    static async createBooking(userId, listingId, bookingData) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get listing details
            const listingResult = await client.query(
                'SELECT vendor_id, business_id, category_id, price, currency FROM listings WHERE id = $1',
                [listingId]
            );

            if (listingResult.rows.length === 0) {
                throw new Error('Listing not found');
            }

            const listing = listingResult.rows[0];

            // Validate booking against category rules
            const validation = await this.validateBookingRequest(
                listing.category_id,
                bookingData
            );

            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            // Check availability (if applicable)
            if (bookingData.start_date && bookingData.end_date) {
                const conflictCheck = await client.query(
                    `SELECT COUNT(*) FROM bookings
                     WHERE listing_id = $1
                     AND status NOT IN ('cancelled', 'rejected')
                     AND (
                         (start_date <= $2 AND end_date >= $2) OR
                         (start_date <= $3 AND end_date >= $3) OR
                         (start_date >= $2 AND end_date <= $3)
                     )`,
                    [listingId, bookingData.start_date, bookingData.end_date]
                );

                if (parseInt(conflictCheck.rows[0].count) > 0) {
                    throw new Error('Listing not available for selected dates');
                }
            }

            // Calculate total price (you can enhance this with dynamic pricing)
            const totalPrice = bookingData.total_price || listing.price;

            // Insert booking
            const bookingResult = await client.query(
                `INSERT INTO bookings (
                    user_id, listing_id, vendor_id, business_id, category_id,
                    booking_date, start_date, end_date, booking_time,
                    guests, total_price, currency, custom_data, pricing_breakdown
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *`,
                [
                    userId,
                    listingId,
                    listing.vendor_id,
                    listing.business_id,
                    listing.category_id,
                    bookingData.booking_date || null,
                    bookingData.start_date || null,
                    bookingData.end_date || null,
                    bookingData.booking_time || null,
                    JSON.stringify(bookingData.guests || { total: 1 }),
                    totalPrice,
                    bookingData.currency || listing.currency || 'USD',
                    JSON.stringify(bookingData.custom_data || {}),
                    JSON.stringify(bookingData.pricing_breakdown || {})
                ]
            );

            await client.query('COMMIT');

            return bookingResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get booking details with category config
     */
    static async getBookingDetails(bookingId, userId = null) {
        let query = `
            SELECT b.*,
                   l.title as listing_title,
                   l.images as listing_images,
                   l.address as listing_address,
                   l.city as listing_city,
                   c.name as category_name,
                   c.slug as category_slug,
                   c.booking_config as category_config,
                   u.name as customer_name,
                   u.email as customer_email,
                   v.name as vendor_name,
                   v.email as vendor_email
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN categories c ON b.category_id = c.id
            JOIN users u ON b.user_id = u.id
            JOIN users v ON b.vendor_id = v.id
            WHERE b.id = $1
        `;

        const params = [bookingId];

        if (userId) {
            query += ' AND (b.user_id = $2 OR b.vendor_id = $2)';
            params.push(userId);
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            throw new Error('Booking not found');
        }

        return result.rows[0];
    }

    /**
     * Update booking status
     */
    static async updateBookingStatus(bookingId, status, userId, userRole) {
        const allowedTransitions = {
            pending: ['confirmed', 'rejected', 'cancelled'],
            confirmed: ['completed', 'cancelled'],
            cancelled: [],
            rejected: [],
            completed: []
        };

        // Get current booking
        const bookingResult = await pool.query(
            'SELECT * FROM bookings WHERE id = $1',
            [bookingId]
        );

        if (bookingResult.rows.length === 0) {
            throw new Error('Booking not found');
        }

        const booking = bookingResult.rows[0];

        // Check authorization
        if (userRole === 'customer' && booking.user_id !== userId) {
            throw new Error('Unauthorized');
        }

        if (userRole === 'vendor' && booking.vendor_id !== userId) {
            throw new Error('Unauthorized');
        }

        // Validate status transition
        if (!allowedTransitions[booking.status]?.includes(status)) {
            throw new Error(`Cannot transition from ${booking.status} to ${status}`);
        }

        // Update booking
        const updateResult = await pool.query(
            `UPDATE bookings
             SET status = $1,
                 updated_at = NOW(),
                 ${status === 'confirmed' ? 'confirmed_at = NOW(),' : ''}
                 ${status === 'cancelled' ? 'cancelled_at = NOW(),' : ''}
                 ${status === 'completed' ? 'completed_at = NOW(),' : ''}
                 vendor_notes = $3
             WHERE id = $2
             RETURNING *`,
            [status, bookingId, booking.vendor_notes]
        );

        return updateResult.rows[0];
    }

    /**
     * Cancel booking with validation
     */
    static async cancelBooking(bookingId, userId, reason) {
        const booking = await this.getBookingDetails(bookingId, userId);

        // Get cancellation policy
        const categoryResult = await pool.query(
            'SELECT booking_config FROM categories WHERE id = $1',
            [booking.category_id]
        );

        const config = categoryResult.rows[0].booking_config;
        const cancellationHours = config.cancellation_hours || 24;

        // Check if cancellation is allowed
        const bookingDate = booking.start_date || booking.booking_date;
        if (bookingDate) {
            const hoursUntilBooking = (new Date(bookingDate) - new Date()) / (1000 * 60 * 60);

            if (hoursUntilBooking < cancellationHours) {
                throw new Error(
                    `Cancellation must be made at least ${cancellationHours} hours before the booking`
                );
            }
        }

        // Cancel booking
        const result = await pool.query(
            `UPDATE bookings
             SET status = 'cancelled',
                 cancelled_at = NOW(),
                 cancellation_reason = $2
             WHERE id = $1
             RETURNING *`,
            [bookingId, reason]
        );

        return result.rows[0];
    }

    /**
     * Get user bookings with filters
     */
    static async getUserBookings(userId, filters = {}) {
        let query = `
            SELECT b.*,
                   l.title as listing_title,
                   l.images as listing_images,
                   c.name as category_name,
                   c.slug as category_slug
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = $1
        `;

        const params = [userId];
        let paramIndex = 2;

        if (filters.status) {
            query += ` AND b.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters.category_id) {
            query += ` AND b.category_id = $${paramIndex}`;
            params.push(filters.category_id);
            paramIndex++;
        }

        query += ' ORDER BY b.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filters.limit);
        }

        const result = await pool.query(query, params);
        return result.rows;
    }
}
