// Temporary route to update user role
import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

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
