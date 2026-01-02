// ============================================
// ENHANCED BOOKING ROUTES
// Dynamic booking system routes
// ============================================

import express from 'express';
import * as BookingController from '../controllers/booking.enhanced.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get booking requirements for a listing
 * Returns the category configuration and what fields are required
 */
router.get(
    '/requirements/:listingId',
    BookingController.getBookingRequirements
);

/**
 * Check availability for specific dates
 * Body: { listingId, start_date, end_date, booking_date }
 */
router.post(
    '/check-availability',
    BookingController.checkAvailability
);

/**
 * Validate booking data before submission
 * Body: { listingId, ...bookingData }
 */
router.post(
    '/validate',
    BookingController.validateBooking
);

// ============================================
// AUTHENTICATED USER ROUTES
// ============================================

/**
 * Create a new booking
 * Body: { listingId, start_date, end_date, booking_date, booking_time, guests, custom_data }
 */
router.post(
    '/',
    isAuthenticated,
    BookingController.createBooking
);

/**
 * Get user's bookings
 * Query: ?status=pending&category_id=1&limit=10
 */
router.get(
    '/user',
    isAuthenticated,
    BookingController.getUserBookings
);

/**
 * Get booking details
 */
router.get(
    '/:id',
    isAuthenticated,
    BookingController.getBookingDetails
);

/**
 * Cancel a booking
 * Body: { reason }
 */
router.post(
    '/:id/cancel',
    isAuthenticated,
    BookingController.cancelBooking
);

// ============================================
// VENDOR ROUTES
// ============================================

/**
 * Get vendor's bookings
 * Query: ?status=pending&category_id=1&business_id=5
 */
router.get(
    '/vendor',
    isAuthenticated,
    BookingController.getVendorBookings
);

/**
 * Update booking status (vendor action)
 * Body: { status: 'confirmed'|'rejected'|'completed', notes }
 */
router.patch(
    '/:id/status',
    isAuthenticated,
    BookingController.updateBookingStatus
);

export default router;
