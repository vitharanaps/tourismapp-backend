// routes/vendorListings.mjs or .js (with "type": "module" in package.json)
import express from "express";
import { Listing } from "../models/Listing.js";      // note .js extension
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// POST /api/vendor/listings
router.post("/listings", authMiddleware, async (req, res) => {
  try {
    const vendorId = req.user.id;

    const {
      title,
      description,
      type,
      price,
      currency,
      images,
      address,
      city,
      country,
      lat,
      lng,
      amenities,
    } = req.body;

    if (!title || !type || price == null) {
      return res
        .status(400)
        .json({ message: "Title, type, and price are required" });
    }

    const listing = await Listing.create({
      vendorId,
      title,
      description,
      type,
      price,
      currency,
      images: images || [], // array of B2 URLs
      address: address || "",
      city: city || "",
      country: country || "",
      location: lat && lng ? { lat, lng } : null,
      amenities: amenities || [],
      status: "active",
    });

    return res.status(201).json(listing);
  } catch (err) {
    console.error("create listing error", err);
    return res.status(500).json({ message: "Failed to create listing" });
  }
});

export default router;
