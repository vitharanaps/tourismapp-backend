// controllers/bookingFlow.controller.js
import * as bookingFlowModel from '../models/bookingFlow.model.js';

export const sendUserRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const request = await bookingFlowModel.createUserRequest({
      ...req.body,
      user_id: userId
    });
    
    res.status(201).json({
      success: true,
      data: request,
      message: 'Request sent to business owner!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await bookingFlowModel.getUserRequestStatus(userId, req.params.listingId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const sendVendorOffer = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const offer = await bookingFlowModel.createVendorOffer({
      ...req.body,
      vendor_id: vendorId
    });
    res.status(201).json({
      success: true,
      data: offer,
      message: 'Offer sent to customer!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acceptOffer = async (req, res) => {
  try {
    const userId = req.user.id;
    const booking = await bookingFlowModel.acceptOffer(req.params.offerId, userId);
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking confirmed successfully!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendorRequests = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const requests = await bookingFlowModel.getVendorRequests(vendorId);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
