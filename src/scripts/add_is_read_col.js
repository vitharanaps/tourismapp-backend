import 'dotenv/config';
import pool from '../config/db.js';

async function run() {
    try {
        await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;");
        console.log("✅ Successfully added is_read column to messages table.");
    } catch (err) {
        console.error("❌ Error updating schema:", err);
    } finally {
        await pool.end();
    }
}

run();
