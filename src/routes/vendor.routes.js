// src/routes/vendor.routes.js
import { Router } from "express";
import { isAuthenticated, hasRole } from "../middleware/auth.js";
import {
  createVendorListing,
  getVendorListings,
  updateVendorListing,
  deleteVendorListing,
  toggleVendorListingFeatured,
} from "../controllers/vendor.controller.js";

import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// GET /api/vendor/listings
router.get(
  "/listings",
  isAuthenticated,
  getVendorListings
);

// POST /api/vendor/listings
router.post(
  "/listings",
  isAuthenticated,
  hasRole("businessOwner", "admin"),
  upload.array("images", 5),
  createVendorListing
);

// PUT /api/vendor/listings/:id
router.put(
  "/listings/:id",
  isAuthenticated,
  hasRole("businessOwner", "admin"),
  upload.array("images", 5),
  updateVendorListing
);

// DELETE /api/vendor/listings/:id
router.delete(
  "/listings/:id",
  isAuthenticated,
  hasRole("businessOwner", "admin"),
  deleteVendorListing
);

// PATCH /api/vendor/listings/:id/feature
router.patch(
  "/listings/:id/feature",
  isAuthenticated,
  hasRole("businessOwner", "admin"),
  toggleVendorListingFeatured
);

export default router;
