import 'dotenv/config';
import pool from "../config/db.js";

async function setupBookingFlow() {
    try {
        // 1. Create user_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_requests (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                vendor_id INTEGER NOT NULL REFERENCES users(id),
                business_type VARCHAR(50),
                requested_start DATE,
                requested_end DATE,
                quantity INTEGER,
                duration INTEGER,
                user_message TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Fix status constraint to allow 'accepted'
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_requests_status_check') THEN
                    ALTER TABLE user_requests DROP CONSTRAINT user_requests_status_check;
                END IF;
                ALTER TABLE user_requests ADD CONSTRAINT user_requests_status_check 
                CHECK (status IN ('pending', 'responded', 'accepted', 'cancelled'));
            END $$;
        `);
        console.log("✅ user_requests table created/verified.");

        // 2. Create vendor_offers table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_offers (
                id SERIAL PRIMARY KEY,
                request_id INTEGER NOT NULL REFERENCES user_requests(id),
                vendor_id INTEGER NOT NULL REFERENCES users(id),
                offered_start DATE,
                offered_end DATE,
                offered_quantity INTEGER,
                offered_price DECIMAL(10, 2),
                offer_message TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ vendor_offers table created/verified.");

        // 3. Update bookings table to add offer_id and request_id if they don't exist
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='offer_id') THEN
                    ALTER TABLE bookings ADD COLUMN offer_id INTEGER REFERENCES vendor_offers(id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='request_id') THEN
                    ALTER TABLE bookings ADD COLUMN request_id INTEGER REFERENCES user_requests(id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='business_type') THEN
                    ALTER TABLE bookings ADD COLUMN business_type VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_method') THEN
                    ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='payment_status') THEN
                    ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='currency') THEN
                    ALTER TABLE bookings ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
                END IF;
            END $$;
        `);
        console.log("✅ bookings table updated with payment columns.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error setting up booking flow tables:", err);
        process.exit(1);
    }
}

setupBookingFlow();
