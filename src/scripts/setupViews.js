// backend/src/scripts/setupViews.js
import 'dotenv/config';
import pool from '../config/db.js';

async function setupViewsTable() {
    try {
        console.log('🏗️ Setting up listing_views table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS listing_views (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        view_date DATE DEFAULT CURRENT_DATE,
        view_count INTEGER DEFAULT 1,
        UNIQUE(listing_id, view_date)
      );
    `);
        console.log('✅ listing_views table ready.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up listing_views table:', err);
        process.exit(1);
    }
}

setupViewsTable();
