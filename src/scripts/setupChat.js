import 'dotenv/config';
import pool from "../config/db.js";

async function setupChat() {
    try {
        // 1. Create chats table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chats (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                vendor_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER REFERENCES listings(id),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, vendor_id, listing_id)
            );
        `);
        console.log("✅ chats table created/verified.");

        // 2. Create messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ messages table created/verified.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error setting up chat tables:", err);
        process.exit(1);
    }
}

setupChat();
