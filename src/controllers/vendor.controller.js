// src/controllers/vendor.controller.js
import { Listing } from "../models/Listing.js";

// GET /api/vendor/listings
export const getVendorListings = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const listings = await Listing.find({ vendorId }).lean(); // adjust if using Prisma
    return res.status(200).json(listings);
  } catch (err) {
    console.error("getVendorListings error", err);
    return res.status(500).json({ message: "Failed to fetch listings" });
  }
};

// POST /api/vendor/listings
export const createVendorListing = async (req, res) => {
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
      images: images || [], // array of B2 URLs from frontend
      address: address || "",
      city: city || "",
      country: country || "",
      location: lat && lng ? { lat, lng } : null,
      amenities: amenities || [],
      status: "active",
    });

    return res.status(201).json(listing);
  } catch (err) {
    console.error("createVendorListing error", err);
    return res.status(500).json({ message: "Failed to create listing" });
  }
};
