import 'dotenv/config';
import 'dotenv/config';
import { Client } from '@neondatabase/serverless';

async function testDirect() {
    console.log("Testing direct connection to:", process.env.DATABASE_URL.split('@')[1]);
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: true,
        connectionTimeoutMillis: 30000,
    });

    try {
        console.log("Connecting...");
        await client.connect();
        console.log("Connected successfully!");
        const res = await client.query('SELECT NOW()');
        console.log("Query result:", res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("Connection error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code,
            detail: err.detail,
            hint: err.hint
        });
        process.exit(1);
    }
}

testDirect();
