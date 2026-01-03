// src/routes/listing.routes.js
import { Router } from "express";
import {
  getAllListings,
  getListingById,
  toggleListingStatus,
  getExploreListings,
  getUniqueCities,
   featureListing,
    getHomeFeaturedListings
} from "../controllers/listing.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router();

router.get("/", getAllListings);
router.get("/explore", getExploreListings);
router.get("/cities", getUniqueCities);
router.get("/:id", getListingById);
router.get("/home/featured", getHomeFeaturedListings);

// vendor protected routes
router.patch("/:id/status", isAuthenticated, toggleListingStatus);
router.put("/:id/feature", isAuthenticated, featureListing);


export default router;
