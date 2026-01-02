// backend/src/scripts/refactor_business_data.js
import pool from "../config/db.js";

async function migrate() {
    try {
        console.log("Starting business data refactoring migration...");

        // 1. Add email and phone to businesses table
        // Note: address, city, country already exist but let's ensure they are correct
        console.log("Adding email and phone columns to businesses...");
        await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    `);

        // 2. We can also make listing address/city optional if we want to inherit them
        console.log("Making listing address and city optional...");
        await pool.query(`
      ALTER TABLE listings 
      ALTER COLUMN address DROP NOT NULL,
      ALTER COLUMN city DROP NOT NULL;
    `);

        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    }
}

migrate();
