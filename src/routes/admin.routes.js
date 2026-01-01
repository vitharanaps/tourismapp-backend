import { Router } from "express";
import * as AdminController from "../controllers/admin.controller.js";
import { isAuthenticated, isAdmin } from "../middleware/auth.js";
import pool from "../config/db.js";

const router = Router();

// User Management Routes (Admin only)
router.get("/users", isAuthenticated, isAdmin, AdminController.getAllUsers);
router.get("/users/stats", isAuthenticated, isAdmin, AdminController.getUserStats);
router.get("/users/:id", isAuthenticated, isAdmin, AdminController.getUserById);
router.put("/users/:id", isAuthenticated, isAdmin, AdminController.updateUser);
router.patch("/users/:id/block", isAuthenticated, isAdmin, AdminController.blockUser);
router.patch("/users/:id/unblock", isAuthenticated, isAdmin, AdminController.unblockUser);
router.delete("/users/:id", isAuthenticated, isAdmin, AdminController.deleteUser);

// Business Management Routes (Admin only)
router.get("/businesses", isAuthenticated, isAdmin, AdminController.getAllBusinesses);
router.get("/businesses/stats", isAuthenticated, isAdmin, AdminController.getBusinessStats);
router.get("/businesses/:id", isAuthenticated, isAdmin, AdminController.getBusinessById);
router.put("/businesses/:id", isAuthenticated, isAdmin, AdminController.updateBusiness);
router.patch("/businesses/:id/block", isAuthenticated, isAdmin, AdminController.blockBusiness);
router.patch("/businesses/:id/unblock", isAuthenticated, isAdmin, AdminController.unblockBusiness);
router.delete("/businesses/:id", isAuthenticated, isAdmin, AdminController.deleteBusiness);

// Listing Management Routes (Admin only)
router.get("/listings", isAuthenticated, isAdmin, AdminController.getAllListings);
router.get("/listings/stats", isAuthenticated, isAdmin, AdminController.getListingStats);
router.get("/listings/:id", isAuthenticated, isAdmin, AdminController.getListingById);
router.put("/listings/:id", isAuthenticated, isAdmin, AdminController.updateListing);
router.patch("/listings/:id/toggle-active", isAuthenticated, isAdmin, AdminController.toggleListingActive);
router.delete("/listings/:id", isAuthenticated, isAdmin, AdminController.deleteListing);

// Legacy routes (keep for backward compatibility)
router.post("/update-role", async (req, res) => {
    try {
        const { email, role } = req.body;

        const result = await pool.query(
            `UPDATE users SET role = $1 WHERE email = $2 RETURNING *`,
            [role, email]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (err) {
        console.error("Error updating role:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/create-listings-table", async (req, res) => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        images TEXT[],
        address VARCHAR(255),
        city VARCHAR(100),
        country VARCHAR(100),
        lat DECIMAL(10, 7),
        lng DECIMAL(10, 7),
        amenities TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        res.json({ success: true, message: "Listings table created successfully" });
    } catch (err) {
        console.error("Error creating listings table:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
