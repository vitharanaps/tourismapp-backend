// src/controllers/listing.controller.js
import pool from "../config/db.js";

export async function getAllListings(req, res) {
    try {
        // Basic implementation: fetch all. Can extend with filters.
        // Assuming filters come in query params e.g. ?category=hotel&priceMax=100
        const { category, minPrice, maxPrice, query } = req.query;

        let sql = `SELECT * FROM listings WHERE is_active = true`;
        const params = [];

        if (category) {
            params.push(category);
            sql += ` AND type = $${params.length}`;
        }

        // Add more filters as needed

        sql += ` ORDER BY created_at DESC`;

        const result = await pool.query(sql, params);
        return res.json(result.rows);
    } catch (err) {
        console.error("Get listings error:", err);
        return res.status(500).json({ message: "Failed to retrieve listings" });
    }
}

export async function getListingById(req, res) {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT l.*, b.name as business_name, b.description as business_description, b.city as business_city, b.phone as business_phone, b.email as business_email
             FROM listings l 
             LEFT JOIN businesses b ON l.business_id = b.id 
             WHERE l.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Listing not found" });
        }

        const listing = result.rows[0];

        // Increment view counts
        try {
            // Increment today's view count in per-day table
            await pool.query(`
                INSERT INTO listing_views (listing_id, view_date, view_count)
                VALUES ($1, CURRENT_DATE, 1)
                ON CONFLICT (listing_id, view_date)
                DO UPDATE SET view_count = listing_views.view_count + 1
            `, [id]);

            // Increment total views count in main listings table
            await pool.query(`
                UPDATE listings SET views_count = views_count + 1 WHERE id = $1
            `, [id]);
        } catch (vErr) {
            console.error("View count increment error:", vErr);
        }

        // Fetch today's views
        const viewsRes = await pool.query(`
            SELECT view_count FROM listing_views 
            WHERE listing_id = $1 AND view_date = CURRENT_DATE
        `, [id]);

        listing.today_views = viewsRes.rows[0]?.view_count || 0;

        // Fetch booking count
        try {
            const bookingsRes = await pool.query(`
                SELECT COUNT(*) FROM bookings WHERE listing_id = $1
            `, [id]);
            listing.booking_count = parseInt(bookingsRes.rows[0]?.count) || 0;
        } catch (oErr) {
            console.error("Booking count fetch error:", oErr);
            listing.booking_count = 0;
        }

        return res.json(listing);
    } catch (err) {
        console.error("Get listing error:", err);
        return res.status(500).json({ message: "Failed to retrieve listing" });
    }
}

export async function toggleListingStatus(req, res) {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;
        const { is_active } = req.body;

        const result = await pool.query(
            `UPDATE listings SET is_active = $1 
             WHERE id = $2 AND vendor_id = $3
             RETURNING *`,
            [is_active, id, vendorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Listing not found or unauthorized" });
        }

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Toggle listing status error:", err);
        return res.status(500).json({ message: "Failed to update listing status" });
    }
}

// Get filtered listings for explore page
export async function getExploreListings(req, res) {
  try {
    const { category, city, rating, search, sort, page, limit, minPrice, maxPrice } = req.query;

    const ListingModel = await import('../models/listing.model.js');

    // 🔥 AUTO CLEAN EXPIRED FEATURED
    await ListingModel.clearExpiredFeaturedListings();

    const result = await ListingModel.getFilteredListings({
      category,
      city,
      rating: rating ? parseFloat(rating) : undefined,
      search,
      minPrice,
      maxPrice,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 12
    });

    return res.json(result);
  } catch (err) {
    console.error('Get explore listings error:', err);
    return res.status(500).json({ message: 'Failed to retrieve listings' });
  }
}

// feature a listing
export async function featureListing(req, res) {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const { durationDays = 30 } = req.body;

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM listings WHERE id = $1 AND vendor_id = $2`,
      [id, vendorId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 🔐 PAYMENT SHOULD BE VERIFIED HERE
    // if (!paymentVerified) return res.status(402).json({ message: "Payment required" });

    const ListingModel = await import('../models/listing.model.js');

    const updated = await ListingModel.toggleFeaturedStatus(
      id,
      true,
      durationDays * 24 // convert days → hours
    );

    return res.json(updated);
  } catch (err) {
    console.error("Feature listing error:", err);
    return res.status(500).json({ message: "Failed to feature listing" });
  }
}


// Get unique cities
export async function getUniqueCities(req, res) {
    try {
        const ListingModel = await import('../models/listing.model.js');
        const cities = await ListingModel.getUniqueCities();
        return res.json(cities);
    } catch (err) {
        console.error('Get unique cities error:', err);
        return res.status(500).json({ message: 'Failed to retrieve cities' });
    }
}
// get home featured listings
export async function getHomeFeaturedListings(req, res) {
  try {
    const ListingModel = await import('../models/listing.model.js');

    const featuredListings = await ListingModel.getHomeFeaturedListings(4);

    return res.json(featuredListings);
  } catch (err) {
    console.error("Home featured listings error:", err);
    return res.status(500).json({ message: "Failed to load featured listings" });
  }
}
