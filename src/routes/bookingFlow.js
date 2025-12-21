// routes/bookingFlow.js
import express from 'express';
import * as bookingFlowController from '../controllers/bookingFlow.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ✅ USER FLOW
router.post('/request', authMiddleware, bookingFlowController.sendUserRequest);
router.get('/status/:listingId', authMiddleware, bookingFlowController.getRequestStatus);
router.patch('/offers/:offerId/accept', authMiddleware, bookingFlowController.acceptOffer);

// ✅ VENDOR FLOW
router.post('/offer', authMiddleware, bookingFlowController.sendVendorOffer);
router.get('/dashboard', authMiddleware, bookingFlowController.getVendorRequests);

export default router;
