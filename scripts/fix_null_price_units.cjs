const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function backfill() {
    try {
        console.log('Backfilling NULL price_unit values...');
        const res = await pool.query("UPDATE listings SET price_unit = 'night' WHERE price_unit IS NULL");
        console.log(`Updated ${res.rowCount} rows.`);
    } catch (error) {
        console.error('Backfill failed:', error);
    } finally {
        await pool.end();
    }
}

backfill();
