// backend/src/scripts/updateListingsColumns.js
import 'dotenv/config';
import pool from '../config/db.js';

async function updateListingsColumns() {
    try {
        console.log('🏗️ Adding rating and review_count columns to listings table...');

        await pool.query(`
            ALTER TABLE listings 
            ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
        `);

        console.log('✅ listings table updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating listings table:', err);
        process.exit(1);
    }
}

updateListingsColumns();
