import 'dotenv/config';
import pool from '../config/db.js';

async function run() {
    try {
        console.log('🚀 Adding is_blocked column to businesses table...');

        await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
    `);

        console.log('✅ Successfully added is_blocked column to businesses table');
        console.log('ℹ️  All existing businesses have is_blocked set to FALSE by default');

        // Verify listings table has is_active column
        console.log('🔍 Checking listings table for is_active column...');
        const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'listings' AND column_name = 'is_active';
    `);

        if (checkResult.rows.length > 0) {
            console.log('✅ Listings table already has is_active column');
        } else {
            console.log('⚠️  Listings table does not have is_active column - this should have been added previously');
        }
    } catch (err) {
        console.error('❌ Error updating tables:', err);
    } finally {
        await pool.end();
    }
}

run();
