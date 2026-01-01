// backend/src/scripts/setupMultiBusiness.js
import 'dotenv/config';
import pool from "../config/db.js";

async function setupMultiBusiness() {
    try {
        console.log("🏗️ Setting up multi-business management tables...");

        // 1. Create businesses table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                id SERIAL PRIMARY KEY,
                owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL, -- e.g., 'hotel', 'vehicle', 'boat'
                description TEXT,
                address TEXT,
                city VARCHAR(100),
                country VARCHAR(100),
                logo_url TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ businesses table created/verified.");

        // 2. Create business_staff table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_staff (
                id SERIAL PRIMARY KEY,
                business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'manager', -- 'manager', 'editor', 'chat_agent'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(business_id, user_id)
            );
        `);
        console.log("✅ business_staff table created/verified.");

        // 3. Update listings table to include business_id
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='business_id') THEN
                    ALTER TABLE listings ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `);
        console.log("✅ listings table updated with business_id.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error setting up multi-business tables:", err);
        process.exit(1);
    }
}

setupMultiBusiness();
