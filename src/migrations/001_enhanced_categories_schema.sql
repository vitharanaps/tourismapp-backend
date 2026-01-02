-- ============================================
-- PRODUCTION-READY MULTI-VENDOR TOURISM PLATFORM
-- Dynamic Category & Booking System
-- ============================================

-- Drop existing tables if needed (for fresh migration)
-- DROP TABLE IF EXISTS booking_custom_fields CASCADE;
-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS listings CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;

-- ============================================
-- 1. ENHANCED CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100), -- Icon identifier (e.g., 'hotel', 'restaurant')
    description TEXT,

    -- Booking Configuration (JSONB for flexibility)
    booking_config JSONB NOT NULL DEFAULT '{
        "requires_booking": false,
        "date_type": "none",
        "requires_time": false,
        "requires_guests": false,
        "guest_types": [],
        "min_booking_days": 1,
        "max_booking_days": null,
        "advance_booking_days": 0,
        "cancellation_hours": 24,
        "custom_fields": []
    }'::jsonb,

    -- Display & Status
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_booking_config ON categories USING gin(booking_config);

-- ============================================
-- 2. ENHANCED LISTINGS TABLE
-- ============================================
-- Assuming you have a listings table, let's enhance it
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_id INT REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS availability_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{"base_price": 0, "currency": "USD", "pricing_type": "fixed"}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_availability ON listings USING gin(availability_config);

-- ============================================
-- 3. ENHANCED BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,

    -- References
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    vendor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INT REFERENCES businesses(id) ON DELETE SET NULL,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

    -- Booking Dates (Flexible for different category types)
    booking_date DATE, -- Single date for events, day trips
    start_date DATE, -- Start date for range bookings (hotels, vehicles)
    end_date DATE, -- End date for range bookings
    booking_time TIME, -- Time slot for restaurants, tours

    -- Guests Configuration (JSONB for flexibility)
    guests JSONB DEFAULT '{"total": 1}'::jsonb,
    -- Example: {"total": 3, "adults": 2, "children": 1, "infants": 0}

    -- Pricing
    total_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    pricing_breakdown JSONB DEFAULT '{}'::jsonb,
    -- Example: {"base": 100, "service_fee": 10, "taxes": 5, "discount": 0}

    -- Custom Fields (Dynamic based on category)
    custom_data JSONB DEFAULT '{}'::jsonb,
    -- Example for vehicle: {"license_number": "ABC123", "pickup_location": "Airport"}
    -- Example for restaurant: {"dietary_restrictions": "vegetarian", "special_occasion": "birthday"}

    -- Status & Payment
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, confirmed, cancelled, completed, rejected
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),

    -- Notes
    user_notes TEXT,
    vendor_notes TEXT,
    cancellation_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_date_range CHECK (
        (start_date IS NULL AND end_date IS NULL) OR
        (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date) OR
        (booking_date IS NOT NULL)
    ),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected'))
);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor ON bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_category ON bookings(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_custom_data ON bookings USING gin(custom_data);

-- ============================================
-- 4. BOOKING AVAILABILITY TABLE (Optional but recommended)
-- ============================================
CREATE TABLE IF NOT EXISTS booking_availability (
    id SERIAL PRIMARY KEY,
    listing_id INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

    -- Date Range
    date DATE NOT NULL,
    available_slots INT DEFAULT 1, -- For time-based bookings
    blocked BOOLEAN DEFAULT FALSE,

    -- Time Slots (for restaurants, tours, etc.)
    time_slots JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"time": "10:00", "capacity": 20, "booked": 5}, {"time": "14:00", "capacity": 20, "booked": 0}]

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(listing_id, date)
);

CREATE INDEX IF NOT EXISTS idx_availability_listing_date ON booking_availability(listing_id, date);

-- ============================================
-- 5. INSERT DEFAULT CATEGORIES
-- ============================================

-- Hotels (Range booking with guests)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Hotels', 'hotels', 'hotel', 'Accommodations and stays', '{
    "requires_booking": true,
    "date_type": "range",
    "requires_time": false,
    "requires_guests": true,
    "guest_types": ["adults", "children"],
    "min_booking_days": 1,
    "max_booking_days": 30,
    "advance_booking_days": 0,
    "cancellation_hours": 24,
    "custom_fields": [
        {"name": "room_type", "label": "Room Type", "type": "select", "options": ["Single", "Double", "Suite"], "required": false},
        {"name": "special_requests", "label": "Special Requests", "type": "textarea", "required": false}
    ]
}'::jsonb, 1)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Restaurants (View only, optional booking)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Restaurants', 'restaurants', 'restaurant', 'Dining and food experiences', '{
    "requires_booking": false,
    "date_type": "single",
    "requires_time": true,
    "requires_guests": true,
    "guest_types": ["guests"],
    "min_booking_days": 1,
    "max_booking_days": 1,
    "advance_booking_days": 0,
    "cancellation_hours": 2,
    "custom_fields": [
        {"name": "dietary_restrictions", "label": "Dietary Restrictions", "type": "text", "required": false},
        {"name": "occasion", "label": "Special Occasion", "type": "select", "options": ["Birthday", "Anniversary", "Business", "Other"], "required": false}
    ]
}'::jsonb, 2)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Events (Single date with time and guests)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Events', 'events', 'calendar', 'Concerts, festivals, and gatherings', '{
    "requires_booking": true,
    "date_type": "single",
    "requires_time": true,
    "requires_guests": true,
    "guest_types": ["tickets"],
    "min_booking_days": 1,
    "max_booking_days": 1,
    "advance_booking_days": 1,
    "cancellation_hours": 48,
    "custom_fields": [
        {"name": "ticket_type", "label": "Ticket Type", "type": "select", "options": ["General", "VIP", "Student"], "required": true}
    ]
}'::jsonb, 3)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Vehicles (Range booking)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Vehicles', 'vehicles', 'car', 'Car rentals and transportation', '{
    "requires_booking": true,
    "date_type": "range",
    "requires_time": true,
    "requires_guests": false,
    "guest_types": [],
    "min_booking_days": 1,
    "max_booking_days": 90,
    "advance_booking_days": 0,
    "cancellation_hours": 24,
    "custom_fields": [
        {"name": "drivers_license", "label": "Driver License Number", "type": "text", "required": true},
        {"name": "pickup_location", "label": "Pickup Location", "type": "text", "required": true},
        {"name": "dropoff_location", "label": "Drop-off Location", "type": "text", "required": true}
    ]
}'::jsonb, 4)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Tours (Single date with time and guests)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Tours', 'tours', 'map', 'Guided tours and experiences', '{
    "requires_booking": true,
    "date_type": "single",
    "requires_time": true,
    "requires_guests": true,
    "guest_types": ["adults", "children"],
    "min_booking_days": 1,
    "max_booking_days": 1,
    "advance_booking_days": 1,
    "cancellation_hours": 24,
    "custom_fields": [
        {"name": "language_preference", "label": "Preferred Language", "type": "select", "options": ["English", "Spanish", "French", "German", "Chinese"], "required": false},
        {"name": "accessibility_needs", "label": "Accessibility Requirements", "type": "textarea", "required": false}
    ]
}'::jsonb, 5)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Beaches (View only - no booking)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Beaches', 'beaches', 'beach', 'Coastal destinations', '{
    "requires_booking": false,
    "date_type": "none",
    "requires_time": false,
    "requires_guests": false,
    "guest_types": [],
    "custom_fields": []
}'::jsonb, 6)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Shopping (View only - no booking)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Shopping', 'shopping', 'shopping-bag', 'Retail and markets', '{
    "requires_booking": false,
    "date_type": "none",
    "requires_time": false,
    "requires_guests": false,
    "guest_types": [],
    "custom_fields": []
}'::jsonb, 7)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Guides (Single date with time)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Guides', 'guides', 'user', 'Local guides and experts', '{
    "requires_booking": true,
    "date_type": "single",
    "requires_time": true,
    "requires_guests": true,
    "guest_types": ["people"],
    "min_booking_days": 1,
    "max_booking_days": 1,
    "advance_booking_days": 1,
    "cancellation_hours": 24,
    "custom_fields": [
        {"name": "service_type", "label": "Service Type", "type": "select", "options": ["Walking Tour", "Photography", "Translation", "Custom"], "required": true}
    ]
}'::jsonb, 8)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Camping (Range booking with guests)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Camping', 'camping', 'tent', 'Outdoor camping sites', '{
    "requires_booking": true,
    "date_type": "range",
    "requires_time": false,
    "requires_guests": true,
    "guest_types": ["adults", "children"],
    "min_booking_days": 1,
    "max_booking_days": 14,
    "advance_booking_days": 0,
    "cancellation_hours": 48,
    "custom_fields": [
        {"name": "tent_size", "label": "Tent Size", "type": "select", "options": ["Small (2 person)", "Medium (4 person)", "Large (6+ person)"], "required": false},
        {"name": "equipment_needed", "label": "Equipment Rental Needed", "type": "checkbox", "required": false}
    ]
}'::jsonb, 9)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Wellness (Single date with time)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Wellness', 'wellness', 'spa', 'Spa, yoga, and wellness services', '{
    "requires_booking": true,
    "date_type": "single",
    "requires_time": true,
    "requires_guests": false,
    "guest_types": [],
    "min_booking_days": 1,
    "max_booking_days": 1,
    "advance_booking_days": 0,
    "cancellation_hours": 12,
    "custom_fields": [
        {"name": "service_type", "label": "Service", "type": "select", "options": ["Massage", "Yoga Class", "Meditation", "Facial", "Full Package"], "required": true},
        {"name": "therapist_preference", "label": "Therapist Preference", "type": "select", "options": ["Male", "Female", "No Preference"], "required": false}
    ]
}'::jsonb, 10)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- Nightlife (Optional booking with time)
INSERT INTO categories (name, slug, icon, description, booking_config, display_order) VALUES
('Nightlife', 'nightlife', 'music', 'Bars, clubs, and entertainment', '{
    "requires_booking": false,
    "date_type": "single",
    "requires_time": true,
    "requires_guests": true,
    "guest_types": ["guests"],
    "min_booking_days": 1,
    "max_booking_days": 1,
    "advance_booking_days": 0,
    "cancellation_hours": 6,
    "custom_fields": [
        {"name": "table_preference", "label": "Table Preference", "type": "select", "options": ["Regular", "VIP", "Near Stage", "Quiet Area"], "required": false}
    ]
}'::jsonb, 11)
ON CONFLICT (slug) DO UPDATE SET booking_config = EXCLUDED.booking_config;

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to validate booking against category rules
CREATE OR REPLACE FUNCTION validate_booking_against_category()
RETURNS TRIGGER AS $$
DECLARE
    cat_config JSONB;
    requires_booking BOOLEAN;
    date_type TEXT;
BEGIN
    -- Get category config
    SELECT booking_config INTO cat_config
    FROM categories
    WHERE id = NEW.category_id;

    requires_booking := (cat_config->>'requires_booking')::boolean;
    date_type := cat_config->>'date_type';

    -- Validate based on date_type
    IF date_type = 'range' AND (NEW.start_date IS NULL OR NEW.end_date IS NULL) THEN
        RAISE EXCEPTION 'Range booking requires start_date and end_date';
    END IF;

    IF date_type = 'single' AND NEW.booking_date IS NULL THEN
        RAISE EXCEPTION 'Single date booking requires booking_date';
    END IF;

    IF date_type = 'none' AND requires_booking = true THEN
        RAISE EXCEPTION 'This category should not require booking';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_booking_trigger ON bookings;
CREATE TRIGGER validate_booking_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_against_category();

-- ============================================
-- 7. VIEWS FOR EASIER QUERYING
-- ============================================

-- View: Bookings with full details
CREATE OR REPLACE VIEW bookings_detailed AS
SELECT
    b.*,
    l.title as listing_title,
    l.images as listing_images,
    l.address as listing_address,
    l.city as listing_city,
    c.name as category_name,
    c.slug as category_slug,
    c.booking_config as category_config,
    u_customer.name as customer_name,
    u_customer.email as customer_email,
    u_vendor.name as vendor_name,
    u_vendor.email as vendor_email,
    bus.name as business_name
FROM bookings b
JOIN listings l ON b.listing_id = l.id
JOIN categories c ON b.category_id = c.id
JOIN users u_customer ON b.user_id = u_customer.id
JOIN users u_vendor ON b.vendor_id = u_vendor.id
LEFT JOIN businesses bus ON b.business_id = bus.id;

COMMENT ON VIEW bookings_detailed IS 'Complete booking information with all related data';
