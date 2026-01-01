// controllers/bookingFlow.controller.js
import pool from '../config/db.js';

import * as bookingFlowModel from "../models/bookingFlow.model.js";
// controllers/bookingFlow.controller.js - FIX sendUserRequest

export const sendUserRequest = async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    // ✅ GET VENDOR_ID FROM LISTING (REAL DATA!)
    const listingQuery = `
    SELECT vendor_id, type as business_type 
    FROM listings 
    WHERE id = $1
  `;

    const listingResult = await pool.query(listingQuery, [req.body.listingId]);

    if (!listingResult.rows[0]) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const listing = listingResult.rows[0];
    console.log(
      `✅ Listing ${req.body.listingId} → Vendor ID: ${listing.vendor_id}`
    );

    // Map frontend → model data
    const requestData = {
      listing_id: req.body.listingId,
      business_type: listing.business_type || 'hotel', user_id: userId,
      vendor_id: listing.vendor_id,
      requested_start: req.body.startDate,
      requested_end: req.body.endDate,
      quantity: req.body.guests,
      duration: req.body.nights,
      user_message: req.body.message,
    };

    console.log("📤 To model:", requestData);
    const request = await bookingFlowModel.createUserRequest(requestData);

    res.status(201).json({
      success: true,
      data: request,
      message: "Request sent successfully!",
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getRequestStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await bookingFlowModel.getUserRequestStatus(
      userId,
      req.params.listingId
    );
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
      vendor_id: vendorId,
    });
    res.status(201).json({
      success: true,
      data: offer,
      message: "Offer sent to customer!",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { paymentMethod } = req.body;
    const userId = req.user.id;

    console.log("💰 Accepting offer:", { offerId, paymentMethod, userId });

    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    const booking = await bookingFlowModel.acceptOffer(offerId, userId, paymentMethod);
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("❌ Error in acceptOffer:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getVendorRequests = async (req, res) => {
  const userId = req.user?.id;
  const { businessId } = req.query;
  console.log("📥 GET /api/booking/dashboard - userId:", userId, "businessId:", businessId);
  try {
    if (businessId) {
      const accessCheck = await pool.query(
        `SELECT 1 FROM businesses b
         LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
         WHERE b.id = $2 AND (b.owner_id = $1 OR bs.user_id = $1)`,
        [userId, businessId]
      );
      if (accessCheck.rows.length === 0) {
      }
    }
    const requests = await bookingFlowModel.getVendorRequests(userId, businessId);
    console.log("📤 Found requests:", requests.length);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("❌ Error in getVendorRequests:", error);
    res.status(500).json({ error: error.message });
  }
};

export const cancelOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const vendorId = req.user.id;

    const result = await pool.query(
      `UPDATE vendor_offers 
             SET status = 'cancelled' 
             WHERE id = $1 AND vendor_id = $2
             RETURNING *`,
      [offerId, vendorId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Offer not found or unauthorized" });
    }

    // Also update the request status back to 'pending' ? Or 'cancelled'?
    // Usually if an offer is cancelled, the request might be considered 'pending' again if there are no other offers, 
    // but for simplicity let's just leave the request status or set it to 'pending' if needed. 
    // The user request "cancel offer" implies just the offer is invalid.

    return res.json({ success: true, message: "Offer cancelled", data: result.rows[0] });
  } catch (err) {
    console.error("Cancel offer error:", err);
    return res.status(500).json({ message: "Failed to cancel offer" });
  }
};

export const getUserRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await bookingFlowModel.getUserRequests(userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
