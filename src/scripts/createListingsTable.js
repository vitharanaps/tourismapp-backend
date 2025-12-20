import pool from "../config/db.js";

async function createListingsTable() {
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

        console.log("✅ Listings table created/verified successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating listings table:", err);
        process.exit(1);
    }
}

createListingsTable();
