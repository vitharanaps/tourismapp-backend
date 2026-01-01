import pool from '../config/db.js';

export async function getAllListings(filters = {}) {
    const { search, category_id, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
    SELECT l.*, b.name as business_name, c.name as category_name, c.icon as category_icon
    FROM listings l
    LEFT JOIN businesses b ON l.business_id = b.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE 1=1
  `;

    const params = [];
    let paramIndex = 1;

    if (search) {
        query += ` AND l.title ILIKE $${paramIndex}`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (category_id) {
        query += ` AND l.category_id = $${paramIndex}`;
        params.push(category_id);
        paramIndex++;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM listings l WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
        countQuery += ` AND l.title ILIKE $${countParamIndex}`;
        countParams.push(`%${search}%`);
        countParamIndex++;
    }

    if (category_id) {
        countQuery += ` AND l.category_id = $${countParamIndex}`;
        countParams.push(category_id);
        countParamIndex++;
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

export async function getListingById(id) {
    const result = await pool.query(
        `SELECT l.*, b.name as business_name, c.name as category_name
     FROM listings l
     LEFT JOIN businesses b ON l.business_id = b.id
     LEFT JOIN categories c ON l.category_id = c.id
     WHERE l.id = $1`,
        [id]
    );
    return result.rows[0];
}

export async function updateListing(id, data) {
    const { title, description, price, category_id } = data;

    const result = await pool.query(
        `UPDATE listings 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         category_id = COALESCE($4, category_id)
     WHERE id = $5
     RETURNING *`,
        [title, description, price, category_id, id]
    );

    return result.rows[0];
}

export async function toggleListingActive(id, is_active) {
    const result = await pool.query(
        `UPDATE listings 
     SET is_active = $1 
     WHERE id = $2 
     RETURNING *`,
        [is_active, id]
    );

    return result.rows[0];
}

export async function deleteListing(id) {
    const result = await pool.query(
        'DELETE FROM listings WHERE id = $1 RETURNING *',
        [id]
    );

    return result.rows[0];
}

export async function getListingStats() {
    const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = TRUE) as active,
      COUNT(*) FILTER (WHERE is_active = FALSE) as inactive
    FROM listings
  `);

    return result.rows[0];
}
