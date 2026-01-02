import pkg from 'pg';
const { Client } = pkg;

async function testHardcoded() {
    const url = 'postgresql://neondb_owner:npg_Lui9Rm2OjkMN@ep-still-base-a1j06dhd.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
    console.log("Testing hardcoded connection to:", url.split('@')[1]);
    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log("Connecting...");
        // Set a manual timeout for the connect promise
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Manual timeout after 15s')), 15000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        console.log("Connected successfully!");
        const res = await client.query('SELECT NOW()');
        console.log("Query result:", res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("Connection error details:", err);
        process.exit(1);
    }
}

testHardcoded();
