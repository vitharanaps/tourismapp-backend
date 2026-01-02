import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

// Use the same pool configuration as db.js
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('🚀 Updating categories table schema (v2)...');

        // Add amenities, date_type, and has_booking_flow columns
        await pool.query(`
            ALTER TABLE categories 
            ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS date_type VARCHAR(20) DEFAULT 'range',
            ADD COLUMN IF NOT EXISTS has_booking_flow BOOLEAN DEFAULT TRUE;
        `);

        console.log('✅ Categories table updated with new columns.');

        // Update existing categories with some defaults if needed
        // For example, set Vehicles and Guides to 'single' date type
        await pool.query(`
            UPDATE categories SET date_type = 'single' WHERE slug IN ('vehicles', 'guides', 'tours');
        `);

        await pool.query(`
            UPDATE categories SET date_type = 'none' WHERE slug IN ('restaurants', 'shopping', 'nightlife');
        `);

        // Set has_booking_flow = false for some categories
        await pool.query(`
            UPDATE categories SET has_booking_flow = FALSE WHERE slug IN ('restaurants', 'shopping', 'nightlife', 'beaches');
        `);

        console.log('✅ Initial data updated for existing categories.');
        console.log('🎉 Migration v2 completed successfully!');
    } catch (err) {
        console.error('❌ Error running migration v2:', err);
    } finally {
        await pool.end();
    }
}

run();
