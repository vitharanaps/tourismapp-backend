// backend/src/scripts/setupReviews.js
import 'dotenv/config';
import pool from '../config/db.js';

async function setupReviews() {
    try {
        console.log('🏗️ Setting up reviews table and listing status...');

        // 1. Create reviews table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ reviews table ready.');

        // 2. Add is_active column to listings if it doesn't exist
        await pool.query(`
      ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
        console.log('✅ listings table updated with is_active column.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error in migration setupReviews:', err);
        process.exit(1);
    }
}

setupReviews();
