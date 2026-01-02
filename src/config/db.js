import dotenv from 'dotenv';
dotenv.config();
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  allowExitOnIdle: false,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection on startup with retry logic
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await pool.query('SELECT NOW()');
      console.log('Database connected successfully at:', res.rows[0].now);
      return;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('Failed to connect to database after multiple attempts');
      }
    }
  }
}

testConnection();

export default pool;
