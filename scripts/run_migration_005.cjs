const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '../src/migrations/005_add_tour_fields_to_listings.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration 005...');
        await pool.query(sql);
        console.log('Migration 005 completed successfully');
    } catch (error) {
        console.error('Migration 005 failed:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
