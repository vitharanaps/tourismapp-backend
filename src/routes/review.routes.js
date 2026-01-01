// backend/src/routes/review.routes.js
import { Router } from "express";
import { addReview, getListingReviews, getEligibleBookings } from "../controllers/review.controller.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router();

router.post("/", isAuthenticated, addReview);
router.get("/listing/:listingId", getListingReviews);
router.get("/eligible/:listingId", isAuthenticated, getEligibleBookings);

export default router;
