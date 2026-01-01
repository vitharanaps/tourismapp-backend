import 'dotenv/config';
import pool from '../config/db.js';

async function run() {
    try {
        console.log('🚀 Adding is_blocked column to users table...');

        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
    `);

        console.log('✅ Successfully added is_blocked column to users table');
        console.log('ℹ️  All existing users have is_blocked set to FALSE by default');
    } catch (err) {
        console.error('❌ Error updating users table:', err);
    } finally {
        await pool.end();
    }
}

run();
