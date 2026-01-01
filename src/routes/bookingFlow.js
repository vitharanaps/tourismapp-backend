// routes/bookingFlow.js - CORRECT IMPORT
import express from 'express';
import * as bookingFlowController from '../controllers/bookingFlow.controller.js';
import * as bookingController from '../controllers/booking.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.post('/request', isAuthenticated, bookingFlowController.sendUserRequest);
router.get('/status/:listingId', isAuthenticated, bookingFlowController.getRequestStatus);
router.patch('/offers/:offerId/accept', isAuthenticated, bookingFlowController.acceptOffer);
router.patch('/offers/:offerId/cancel', isAuthenticated, bookingFlowController.cancelOffer);

router.post('/offer', isAuthenticated, bookingFlowController.sendVendorOffer);
router.get('/dashboard', isAuthenticated, bookingFlowController.getVendorRequests);
router.get('/user-requests', isAuthenticated, bookingFlowController.getUserRequests);
router.get('/vendor/bookings', isAuthenticated, bookingController.getVendorBookings);

export default router;
