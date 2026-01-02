-- Add views_count to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;

-- Function to increment views
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id INT)
RETURNS void AS $$
BEGIN
    UPDATE listings 
    SET views_count = views_count + 1 
    WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;
