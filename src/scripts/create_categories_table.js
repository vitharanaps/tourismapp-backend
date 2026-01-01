import 'dotenv/config';
import pool from '../config/db.js';

const categories = [
    { name: 'Hotels', slug: 'hotels', icon: '🏨', description: 'Accommodations and lodging options', display_order: 1 },
    { name: 'Restaurants', slug: 'restaurants', icon: '🍽️', description: 'Dining and food experiences', display_order: 2 },
    { name: 'Tours', slug: 'tours', icon: '🎯', description: 'Guided tours and excursions', display_order: 3 },
    { name: 'Vehicles', slug: 'vehicles', icon: '🚗', description: 'Vehicle rentals and transportation', display_order: 4 },
    { name: 'Events', slug: 'events', icon: '🎉', description: 'Special events and celebrations', display_order: 5 },
    { name: 'Guides', slug: 'guides', icon: '🧭', description: 'Tour guides and local experts', display_order: 6 },
    { name: 'Camping', slug: 'camping', icon: '🏕️', description: 'Camping sites and outdoor stays', display_order: 7 },
    { name: 'Beaches', slug: 'beaches', icon: '🏖️', description: 'Beach destinations and activities', display_order: 8 },
    { name: 'Cultural', slug: 'cultural', icon: '🕌', description: 'Cultural sites and heritage experiences', display_order: 9 },
    { name: 'Wellness', slug: 'wellness', icon: '💆‍♀️', description: 'Spa, wellness, and relaxation', display_order: 10 },
    { name: 'Shopping', slug: 'shopping', icon: '🛍️', description: 'Shopping destinations and markets', display_order: 11 },
    { name: 'Nightlife', slug: 'nightlife', icon: '🌃', description: 'Nightlife and entertainment venues', display_order: 12 }
];

async function run() {
    try {
        console.log('🚀 Creating categories table...');

        // Create categories table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('✅ Categories table created successfully');

        // Check if categories already exist
        const existingCategories = await pool.query('SELECT COUNT(*) FROM categories');
        const count = parseInt(existingCategories.rows[0].count);

        if (count === 0) {
            console.log('📝 Seeding initial categories...');

            for (const category of categories) {
                await pool.query(
                    `INSERT INTO categories (name, slug, icon, description, display_order) 
           VALUES ($1, $2, $3, $4, $5)`,
                    [category.name, category.slug, category.icon, category.description, category.display_order]
                );
            }

            console.log(`✅ Successfully seeded ${categories.length} categories`);
        } else {
            console.log(`ℹ️  Categories table already has ${count} entries, skipping seed`);
        }

        // Add category_id to listings table if it doesn't exist
        console.log('🔧 Adding category_id column to listings table...');
        await pool.query(`
      ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id);
    `);
        console.log('✅ Listings table updated successfully');

        console.log('🎉 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Error running migration:', err);
    } finally {
        await pool.end();
    }
}

run();
