import dotenv from 'dotenv';
dotenv.config();
import pool from '../config/db.js';

async function migrate() {
    try {
        console.log("Starting Sub-category Migration...");

        // 1. Add parent_id to categories
        await pool.query(`
            ALTER TABLE categories 
            ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
        `);
        console.log("Added parent_id to categories table.");

        // 2. Add subcategory_id to listings
        await pool.query(`
            ALTER TABLE listings 
            ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
        `);
        console.log("Added subcategory_id to listings table.");

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
