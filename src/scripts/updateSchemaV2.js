import 'dotenv/config';
import pool from "../config/db.js";

async function updateSchemaV2() {
    try {
        console.log("🏗️ Updating schema for Soft Delete and Featured Listings...");

        // 1. Add is_deleted to businesses
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='is_deleted') THEN
                    ALTER TABLE businesses ADD COLUMN is_deleted BOOLEAN DEFAULT false;
                END IF;
            END $$;
        `);
        console.log("✅ is_deleted added to businesses.");

        // 2. Add is_deleted, is_featured, featured_expires_at to listings
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_deleted') THEN
                    ALTER TABLE listings ADD COLUMN is_deleted BOOLEAN DEFAULT false;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_featured') THEN
                    ALTER TABLE listings ADD COLUMN is_featured BOOLEAN DEFAULT false;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='featured_expires_at') THEN
                    ALTER TABLE listings ADD COLUMN featured_expires_at TIMESTAMP;
                END IF;
            END $$;
        `);
        console.log("✅ is_deleted, is_featured, featured_expires_at added to listings.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error updating schema:", err);
        process.exit(1);
    }
}

updateSchemaV2();
