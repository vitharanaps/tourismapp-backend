import pool from "../config/db.js";
import { createListing, getListingsByVendor, updateListing, deleteListing, toggleFeaturedStatus } from "../models/listing.model.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { b2Client } from "../b2Client.js";
import crypto from "crypto";

// GET /api/vendor/listings
export const getVendorListings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessId } = req.query;

    if (businessId) {
      // 1. Verify access (owner or staff)
      const accessCheck = await pool.query(
        `SELECT 1 FROM businesses b
         LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
         WHERE b.id = $2 AND (b.owner_id = $1 OR bs.user_id = $1)`,
        [userId, businessId]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ message: "Unauthorized access to this business listings" });
      }
    }

    const listings = await getListingsByVendor(userId, businessId);
    return res.status(200).json(listings);
  } catch (err) {
    console.error("getVendorListings error", err);
    return res.status(500).json({ message: "Failed to fetch listings" });
  }
};

// POST /api/vendor/listings
export const createVendorListing = async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("User ID:", req.user.id);
    console.log("Body:", req.body);
    console.log("Files:", req.files?.length || 0);

    const vendorId = req.user.id;
    const {
      title,
      description,
      type,
      price,
      currency,
      address,
      city,
      country,
      lat,
      lng,
      amenities,
      business_id,
      category_id,
      subcategory_id,
      price_unit // Added
    } = req.body;

    if (!title || !type || price == null) {
      return res.status(400).json({ message: "Title, type, and price are required" });
    }

    // Upload images to B2
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      console.log("Uploading", req.files.length, "images to B2...");
      for (const file of req.files) {
        try {
          const ext = file.originalname.split(".").pop();
          const key = `listings/${crypto.randomUUID()}.${ext || "jpg"}`;

          console.log("Uploading:", key);
          await b2Client.send(new PutObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }));

          // Construct public URL
          const publicUrl = `https://${process.env.B2_BUCKET}.${process.env.B2_ENDPOINT}/${key}`;
          imageUrls.push(publicUrl);
          console.log("Uploaded:", publicUrl);
        } catch (uploadErr) {
          console.error("⚠️ Failed to upload image:", uploadErr.message);
          console.log("⚠️ Skipping this image and continuing...");
          // Continue with other images or without images
        }
      }
    }

    // Parse amenities from FormData
    let parsedAmenities = [];
    if (typeof amenities === 'string') {
      parsedAmenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(amenities)) {
      parsedAmenities = amenities;
    }

    // Fetch category/subcategory settings for snapshotting
    let has_booking_flow = true;
    let date_type = 'range';

    if (category_id || subcategory_id) {
      const catRes = await pool.query(
        `SELECT has_booking_flow, date_type FROM categories WHERE id = $1`,
        [subcategory_id || category_id]
      );
      if (catRes.rows[0]) {
        has_booking_flow = catRes.rows[0].has_booking_flow;
        date_type = catRes.rows[0].date_type;
      }
    }

    const listingData = {
      title,
      description,
      type,
      price: parseFloat(price),
      currency,
      images: imageUrls,
      address: address || "",
      city: city || "",
      country: country || "",
      lat,
      lng,
      amenities: parsedAmenities,
      business_id: business_id ? parseInt(business_id) : null,
      category_id: category_id ? parseInt(category_id) : null,
      subcategory_id: subcategory_id ? parseInt(subcategory_id) : null,
      has_booking_flow: has_booking_flow,
      date_type: date_type,
      price_unit, // Added
    };

    console.log("Creating listing with data:", listingData);

    const listing = await createListing(vendorId, listingData);
    console.log("✅ Listing created successfully:", listing.id);
    return res.status(201).json(listing);
  } catch (err) {
    console.error("❌ createVendorListing error:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({ message: "Failed to create listing", error: err.message });
  }
};

// PUT /api/vendor/listings/:id
export const updateVendorListing = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const {
      title,
      description,
      type,
      price,
      currency,
      address,
      city,
      country,
      lat,
      lng,
      amenities,
      existingImages,
      business_id,
      category_id,
      subcategory_id,
      price_unit
    } = req.body;

    // Handle existing images
    let imageUrls = [];
    if (existingImages) {
      imageUrls = Array.isArray(existingImages) ? existingImages : [existingImages];
    }

    // Upload new images to B2
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const ext = file.originalname.split(".").pop();
          const key = `listings/${crypto.randomUUID()}.${ext || "jpg"}`;
          await b2Client.send(new PutObjectCommand({
            Bucket: process.env.B2_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }));
          const publicUrl = `https://${process.env.B2_BUCKET}.${process.env.B2_ENDPOINT}/${key}`;
          imageUrls.push(publicUrl);
        } catch (uploadErr) {
          console.error("⚠️ Failed to upload image:", uploadErr.message);
        }
      }
    }

    // Parse amenities
    let parsedAmenities = [];
    if (typeof amenities === 'string') {
      parsedAmenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(amenities)) {
      parsedAmenities = amenities;
    }

    // Fetch category/subcategory settings for snapshotting
    let has_booking_flow = true;
    let date_type = "range";

    if (category_id || subcategory_id) {
      const catRes = await pool.query(
        `SELECT has_booking_flow, date_type FROM categories WHERE id = $1`,
        [subcategory_id || category_id]
      );
      if (catRes.rows[0]) {
        has_booking_flow = catRes.rows[0].has_booking_flow;
        date_type = catRes.rows[0].date_type;
      }
    }

    const listingData = {
      title,
      description,
      type,
      price: parseFloat(price),
      currency,
      images: imageUrls,
      address: address || "",
      city: city || "",
      country: country || "",
      lat,
      lng,
      amenities: parsedAmenities,
      business_id: business_id ? parseInt(business_id) : null,
      category_id: category_id ? parseInt(category_id) : undefined,
      subcategory_id: subcategory_id ? parseInt(subcategory_id) : undefined,
      has_booking_flow: has_booking_flow,
      date_type: date_type,
      price_unit
    };

    const listing = await updateListing(id, vendorId, listingData);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }

    return res.status(200).json(listing);
  } catch (err) {
    console.error("❌ updateVendorListing error:", err.message);
    return res.status(500).json({ message: "Failed to update listing", error: err.message });
  }
};

// DELETE /api/vendor/listings/:id
export const deleteVendorListing = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const listing = await deleteListing(id, vendorId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }
    return res.status(200).json({ message: "Listing deleted successfully" });
  } catch (err) {
    console.error("❌ deleteVendorListing error:", err.message);
    return res.status(500).json({ message: "Failed to delete listing", error: err.message });
  }
};

// PATCH /api/vendor/listings/:id/feature
export const toggleVendorListingFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured, duration } = req.body; // duration in hours

    const listing = await toggleFeaturedStatus(id, is_featured, duration);
    return res.json(listing);

  } catch (err) {
    console.error("toggleFeatured error", err);
    return res.status(500).json({ message: "Failed to update featured status" });
  }
};
