// src/controllers/listing.controller.js
import pool from "../config/db.js";

export async function getAllListings(req, res) {
    try {
        // Basic implementation: fetch all. Can extend with filters.
        // Assuming filters come in query params e.g. ?category=hotel&priceMax=100
        const { category, minPrice, maxPrice, query } = req.query;

        let sql = `SELECT * FROM listings WHERE 1=1`;
        const params = [];

        if (category) {
            params.push(category);
            sql += ` AND type = $${params.length}`;
        }

        // Add more filters as needed

        sql += ` ORDER BY created_at DESC`;

        const result = await pool.query(sql, params);
        return res.json(result.rows);
    } catch (err) {
        console.error("Get listings error:", err);
        return res.status(500).json({ message: "Failed to retrieve listings" });
    }
}

export async function getListingById(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM listings WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Listing not found" });
        }

        // Optional: Fetch reviews or vendor details here if needed

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Get listing error:", err);
        return res.status(500).json({ message: "Failed to retrieve listing" });
    }
}
