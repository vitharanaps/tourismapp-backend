// backend/src/scripts/createBookingsTable.js
import 'dotenv/config';
import pool from "../config/db.js";

// Force a longer timeout for this script
pool.options.connectionTimeoutMillis = 60000;
pool.options.idleTimeoutMillis = 60000;

async function createBookingsTable() {
    try {
        console.log("🏗️ Creating bookings table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                vendor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                offer_id INTEGER, -- Will be linked later if using vendor_offers
                request_id INTEGER, -- Will be linked later if using user_requests
                business_type VARCHAR(50),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                guests INTEGER NOT NULL DEFAULT 1,
                total_price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'USD',
                payment_method VARCHAR(50) DEFAULT 'cash',
                payment_status VARCHAR(50) DEFAULT 'unpaid',
                status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'appealed', 'completed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Bookings table created/verified successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating bookings table:", err);
        process.exit(1);
    }
}

createBookingsTable();
