const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function debugSchema() {
    try {
        console.log('Checking information_schema for price_unit column...');
        const schemaRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'listings' AND column_name = 'price_unit';
        `);

        if (schemaRes.rows.length > 0) {
            console.log('✅ Column price_unit EXISTS in listings table.');
            console.log('Type:', schemaRes.rows[0].data_type);
        } else {
            console.log('❌ Column price_unit DOES NOT EXIST in listings table.');
        }

        console.log('\nChecking one listing...');
        const listingRes = await pool.query('SELECT id, title, price_unit FROM listings LIMIT 1');
        if (listingRes.rows.length > 0) {
            console.log('Listing found:', listingRes.rows[0]);
        } else {
            console.log('No listings found in table.');
        }

    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        await pool.end();
    }
}

debugSchema();
