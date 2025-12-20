// src/routes/vendor.routes.js
import { Router } from "express";
import { isAuthenticated, hasRole } from "../middleware/auth.js";
import {
  createVendorListing,
  getVendorListings,
} from "../controllers/vendor.controller.js";

import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

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
  upload.array("images", 5),
  createVendorListing
);

export default router;
