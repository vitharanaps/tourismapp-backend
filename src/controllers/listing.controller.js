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
        const result = await pool.query(`SELECT * FROM listings WHERE id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Listing not found" });
        }

        const listing = result.rows[0];

        // Increment today's view count
        try {
            await pool.query(`
                INSERT INTO listing_views (listing_id, view_date, view_count)
                VALUES ($1, CURRENT_DATE, 1)
                ON CONFLICT (listing_id, view_date)
                DO UPDATE SET view_count = listing_views.view_count + 1
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

        // Fetch order count (accepted requests or confirmed bookings)
        const ordersRes = await pool.query(`
            SELECT COUNT(*) FROM bookings WHERE listing_id = $1
        `, [id]);
        listing.order_count = parseInt(ordersRes.rows[0]?.count) || 0;

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
    const { category, city, rating, search, sort, page, limit } = req.query;
    
    const ListingModel = await import('../models/listing.model.js');
    const result = await ListingModel.getFilteredListings({
      category,
      city,
      rating: rating ? parseFloat(rating) : undefined,
      search,
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
