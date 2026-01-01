// src/routes/listing.routes.js
import { Router } from "express";
import { getAllListings, getListingById, toggleListingStatus } from "../controllers/listing.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router();

router.get("/", getAllListings);
router.get("/:id", getListingById);
router.patch("/:id/status", isAuthenticated, toggleListingStatus);

export default router;
