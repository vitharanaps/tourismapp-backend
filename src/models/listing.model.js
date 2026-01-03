// src/models/listing.model.js
import pool from "../config/db.js";



export async function createListing(vendorId, data) {
  let {
    title,
    description,
    type,
    price,
    currency,
    images,
    address,
    city,
    country,
    lat,
    lng,
    amenities,
    category_id,
    subcategory_id,
    has_booking_flow,
    date_type,
  } = data;

  // Inherit location from business if not provided
  if ((!address || !city) && data.business_id) {
    const business = await pool.query(
      "SELECT address, city, country FROM businesses WHERE id = $1",
      [data.business_id]
    );
    if (business.rows[0]) {
      address = address || business.rows[0].address;
      city = city || business.rows[0].city;
      country = country || business.rows[0].country;
    }
  }

  const result = await pool.query(
    `INSERT INTO listings
     (vendor_id, business_id, title, description, type, price, currency, images,
      address, city, country, lat, lng, amenities, category_id, subcategory_id,
      has_booking_flow, date_type)
     VALUES
     ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      vendorId,
      data.business_id,
      title,
      description,
      type,
      price,
      currency,
      images,
      address,
      city,
      country,
      lat,
      lng,
      amenities,
      category_id,
      subcategory_id,
      has_booking_flow,
      date_type
    ]
  );

  return result.rows[0];
}

export async function getListingsByVendor(vendorId, businessId = null) {
  if (businessId) {
    // If businessId is provided, we fetch by businessId. 
    // Access control should be handled by the controller/middleware.
    const result = await pool.query(
      "SELECT * FROM listings WHERE business_id = $1 AND is_deleted = false ORDER BY created_at DESC",
      [businessId]
    );
    return result.rows;
  }

  // Fallback to fetch all listings for a vendor across all their businesses
  const result = await pool.query(
    "SELECT * FROM listings WHERE vendor_id = $1 AND is_deleted = false ORDER BY created_at DESC",
    [vendorId]
  );
  return result.rows;
}
export async function updateListing(listingId, vendorId, data) {
  const {
    title,
    description,
    type,
    price,
    currency,
    images,
    address,
    city,
    country,
    lat,
    lng,
    amenities,
    category_id,
    subcategory_id,
    has_booking_flow,
    date_type,
  } = data;

  const result = await pool.query(
    `UPDATE listings
     SET business_id = $1, title = $2, description = $3, type = $4, price = $5, currency = $6,
    images = $7, address = $8, city = $9, country = $10, lat = $11,
    lng = $12, amenities = $13, category_id = $14, subcategory_id = $15,
    has_booking_flow = $16, date_type = $17, updated_at = NOW()
     WHERE id = $18 AND vendor_id = $19
     RETURNING * `,
    [
      data.business_id,
      title,
      description,
      type,
      price,
      currency,
      images,
      address,
      city,
      country,
      lat,
      lng,
      amenities,
      category_id,
      subcategory_id,
      has_booking_flow,
      date_type,
      listingId,
      vendorId,
    ]
  );

  return result.rows[0];
}

export async function deleteListing(listingId, vendorId) {
  // Soft delete
  const result = await pool.query(
    "UPDATE listings SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND vendor_id = $2 RETURNING id",
    [listingId, vendorId]
  );
  return result.rows[0];
}

export async function toggleFeaturedStatus(listingId, isFeatured, durationHours = 24) {
  let expiresAt = null;
  if (isFeatured) {
    const date = new Date();
    date.setHours(date.getHours() + durationHours);
    expiresAt = date;
  }

  const result = await pool.query(
    `UPDATE listings 
         SET is_featured = $1, featured_expires_at = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
    [isFeatured, expiresAt, listingId]
  );
  return result.rows[0];
}
// 
// Clear expired featured listings
export async function clearExpiredFeaturedListings() {
  await pool.query(`
    UPDATE listings
    SET is_featured = false,
        featured_expires_at = NULL
    WHERE is_featured = true
      AND featured_expires_at IS NOT NULL
      AND featured_expires_at < NOW()
      
  `);
}



// Get filtered listings for explore page
export async function getFilteredListings(filters = {}) {
  const { category, city, rating, search, sort = 'newest', page = 1, limit = 12 } = filters;
  const offset = (page - 1) * limit;

  let query = `
    SELECT l.*, 
           b.name as business_name,
           c.name as category_name, 
           c.slug as category_slug,
           c.icon as category_icon,
           COALESCE(AVG(r.rating), 0) as avg_rating,
           COUNT(DISTINCT r.id) as review_count,
           l.views_count,
           (SELECT COUNT(*) FROM bookings WHERE listing_id = l.id) as booking_count
    FROM listings l
    LEFT JOIN businesses b ON l.business_id = b.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN reviews r ON l.id = r.listing_id
    WHERE l.is_active = TRUE
  `;

  const params = [];
  let paramIndex = 1;

  // Category filter (by slug or ID)
  if (category) {
    if (typeof category === 'string' && isNaN(Number(category))) {
      query += ` AND c.slug = $${paramIndex}`;
    } else {
      query += ` AND l.category_id = $${paramIndex}`;
    }
    params.push(category);
    paramIndex++;
  }

  // City filter
  if (city) {
    query += ` AND l.city ILIKE $${paramIndex}`;
    params.push(`%${city}%`);
    paramIndex++;
  }

  // Keyword search
  if (search) {
    query += ` AND (l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Price range
  if (filters.minPrice !== undefined) {
    query += ` AND l.price >= $${paramIndex}`;
    params.push(parseFloat(filters.minPrice));
    paramIndex++;
  }
  if (filters.maxPrice !== undefined) {
    query += ` AND l.price <= $${paramIndex}`;
    params.push(parseFloat(filters.maxPrice));
    paramIndex++;
  }

  query += ` GROUP BY l.id, b.name, c.name, c.slug, c.icon`;

  // Rating filter (applied after GROUP BY)
  if (rating) {
    query += ` HAVING COALESCE(AVG(r.rating), 0) >= ${parseFloat(rating)}`;
  }

  // Sorting (FEATURED FIRST)
const featuredOrder = `
  l.is_featured DESC,
  CASE 
    WHEN l.is_featured = true AND l.featured_expires_at > NOW() THEN 1
    ELSE 0
  END DESC
`;

switch (sort) {
  case 'rating':
    query += ` ORDER BY ${featuredOrder}, avg_rating DESC, l.created_at DESC`;
    break;
  case 'price_low':
    query += ` ORDER BY ${featuredOrder}, l.price ASC`;
    break;
  case 'price_high':
    query += ` ORDER BY ${featuredOrder}, l.price DESC`;
    break;
  case 'newest':
  default:
    query += ` ORDER BY ${featuredOrder}, l.created_at DESC`;
}


  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(DISTINCT l.id) as count
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    ${rating ? 'LEFT JOIN reviews r ON l.id = r.listing_id' : ''}
    WHERE l.is_active = TRUE
  `;

  const countParams = [];
  let countParamIndex = 1;

  if (category) {
    if (typeof category === 'string' && isNaN(Number(category))) {
      countQuery += ` AND c.slug = $${countParamIndex}`;
    } else {
      countQuery += ` AND l.category_id = $${countParamIndex}`;
    }
    countParams.push(category);
    countParamIndex++;
  }

  if (city) {
    countQuery += ` AND l.city ILIKE $${countParamIndex}`;
    countParams.push(`%${city}%`);
    countParamIndex++;
  }

  if (search) {
    countQuery += ` AND (l.title ILIKE $${countParamIndex} OR l.description ILIKE $${countParamIndex})`;
    countParams.push(`%${search}%`);
    countParamIndex++;
  }

  if (filters.minPrice !== undefined) {
    countQuery += ` AND l.price >= $${countParamIndex}`;
    countParams.push(parseFloat(filters.minPrice));
    countParamIndex++;
  }

  if (filters.maxPrice !== undefined) {
    countQuery += ` AND l.price <= $${countParamIndex}`;
    countParams.push(parseFloat(filters.maxPrice));
    countParamIndex++;
  }

  if (rating) {
    countQuery += ` GROUP BY l.id HAVING COALESCE(AVG(r.rating), 0) >= ${parseFloat(rating)}`;
    countQuery = `SELECT COUNT(*) as count FROM (${countQuery}) AS filtered_listings`;
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    listings: result.rows,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  };
}

// Get unique cities from listings
export async function getUniqueCities() {
  const result = await pool.query(`
    SELECT DISTINCT city 
    FROM listings 
    WHERE city IS NOT NULL AND city != '' AND is_active = TRUE
    ORDER BY city ASC
  `);

  return result.rows.map(row => row.city);
}

// Get home featured listings
export async function getHomeFeaturedListings(limit = 4) {
  // 1️⃣ Clear expired featured listings first
  await pool.query(`
    UPDATE listings
    SET is_featured = false,
        featured_expires_at = NULL
    WHERE is_featured = true
      AND featured_expires_at IS NOT NULL
      AND featured_expires_at < NOW()
  `);

  // 2️⃣ Fetch top featured listings by rating
  const result = await pool.query(`
    SELECT l.*,
           b.name AS business_name,
           c.name AS category_name,
           COALESCE(AVG(r.rating), 0) AS avg_rating,
           COUNT(DISTINCT r.id) AS review_count
    FROM listings l
    LEFT JOIN reviews r ON l.id = r.listing_id
    LEFT JOIN businesses b ON l.business_id = b.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.is_active = TRUE
      AND l.is_featured = TRUE
      AND (l.featured_expires_at IS NULL OR l.featured_expires_at > NOW())
    GROUP BY l.id, b.name, c.name
    ORDER BY avg_rating DESC, l.created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
}

