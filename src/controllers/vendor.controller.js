import { createListing, getListingsByVendor } from "../models/listing.model.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { b2Client } from "../b2Client.js";
import crypto from "crypto";

// GET /api/vendor/listings
export const getVendorListings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const listings = await getListingsByVendor(vendorId);
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
