-- Add featured columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_expires_at TIMESTAMP;

-- Create platform_settings table for admin configurations
CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default featured price (e.g., $50 for 1 month)
INSERT INTO platform_settings (key, value, description) 
VALUES ('featured_price_monthly', '50.00', 'Price for featuring a listing for 1 month')
ON CONFLICT (key) DO NOTHING;

-- Index for featured listings performance
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(is_featured, featured_expires_at);
