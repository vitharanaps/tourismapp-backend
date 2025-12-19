// src/controllers/vendor.controller.js
import pool from "../config/db.js";
import { createListing, getListingsByVendor } from "../models/listing.model.js";

export async function createVendorListing(req, res) {
  try {
    const userId = req.user.id;

    const vendorResult = await pool.query(
      "SELECT id FROM vendors WHERE user_id = $1",
      [userId]
    );
    if (vendorResult.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "No vendor profile for this user" });
    }
    const vendorId = vendorResult.rows[0].id;

    const listing = await createListing(vendorId, req.body);
    return res.status(201).json({ listing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error creating listing" });
  }
}

export async function getVendorListings(req, res) {
  try {
    const userId = req.user.id;

    const vendorResult = await pool.query(
      "SELECT id FROM vendors WHERE user_id = $1",
      [userId]
    );
    if (vendorResult.rows.length === 0) {
      return res.status(200).json({ listings: [] });
    }
    const vendorId = vendorResult.rows[0].id;

    const listings = await getListingsByVendor(vendorId);
    return res.json({ listings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching listings" });
  }
}
