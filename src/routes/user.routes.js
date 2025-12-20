// src/routes/user.routes.js
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { updateProfile, getWishlist, toggleWishlist } from "../controllers/user.controller.js";

import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(isAuthenticated);

router.put("/profile", upload.single("avatar"), updateProfile);
router.get("/wishlist", getWishlist);
router.post("/wishlist", toggleWishlist);

export default router;
