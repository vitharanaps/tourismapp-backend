// src/routes/listing.routes.js
import { Router } from "express";
import { getAllListings, getListingById, toggleListingStatus, getExploreListings, getUniqueCities } from "../controllers/listing.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router();

router.get("/", getAllListings);
router.get("/explore", getExploreListings);
router.get("/cities", getUniqueCities);
router.get("/:id", getListingById);
router.patch("/:id/status", isAuthenticated, toggleListingStatus);

export default router;
