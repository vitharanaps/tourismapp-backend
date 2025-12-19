// src/routes/vendor.routes.js
import { Router } from "express";
import { isAuthenticated, hasRole } from "../middleware/auth.js";
import {
  createVendorListing,
  getVendorListings,
} from "../controllers/vendor.controller.js";

const router = Router();

// GET /api/vendor/listings
router.get(
  "/listings",
  isAuthenticated,
  hasRole("businessOwner", "admin"),
  getVendorListings
);

// POST /api/vendor/listings
router.post(
  "/listings",
  isAuthenticated,
  hasRole("businessOwner", "admin"),
  createVendorListing
);

export default router;
