
import 'dotenv/config';
import pool from "../config/db.js";

async function createWishlistTable() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, listing_id)
      );
    `);
        console.log("✅ Wishlists table check/creation successful.");
    } catch (error) {
        console.error("❌ Error creating wishlists table:", error);
    } finally {
        await pool.end();
    }
}

createWishlistTable();
