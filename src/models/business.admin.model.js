import pool from '../config/db.js';

export async function getAllBusinesses(filters = {}) {
    const { search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
    SELECT b.*, u.name as owner_name, u.email as owner_email,
           COUNT(l.id) as listing_count
    FROM businesses b
    LEFT JOIN users u ON b.owner_id = u.id
    LEFT JOIN listings l ON l.business_id = b.id
    WHERE 1=1
  `;

    const params = [];
    let paramIndex = 1;

    if (search) {
        query += ` AND b.name ILIKE $${paramIndex}`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    query += ` GROUP BY b.id, u.name, u.email ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM businesses b WHERE 1=1';
    const countParams = [];

    if (search) {
        countQuery += ' AND b.name ILIKE $1';
        countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
        businesses: result.rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
    };
}

export async function getBusinessById(id) {
    const result = await pool.query(
        `SELECT b.*, u.name as owner_name, u.email as owner_email
     FROM businesses b
     LEFT JOIN users u ON b.owner_id = u.id
     WHERE b.id = $1`,
        [id]
    );
    return result.rows[0];
}

export async function updateBusiness(id, data) {
    const { name, description, type } = data;

    const result = await pool.query(
        `UPDATE businesses 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         type = COALESCE($3, type)
     WHERE id = $4
     RETURNING *`,
        [name, description, type, id]
    );

    return result.rows[0];
}

export async function blockBusiness(id) {
    const result = await pool.query(
        `UPDATE businesses 
     SET is_blocked = TRUE 
     WHERE id = $1 
     RETURNING *`,
        [id]
    );

    return result.rows[0];
}

export async function unblockBusiness(id) {
    const result = await pool.query(
        `UPDATE businesses 
     SET is_blocked = FALSE 
     WHERE id = $1 
     RETURNING *`,
        [id]
    );

    return result.rows[0];
}

export async function deleteBusiness(id) {
    // Check if business has active listings
    const listingsCheck = await pool.query(
        'SELECT COUNT(*) FROM listings WHERE business_id = $1 AND is_active = TRUE',
        [id]
    );

    if (parseInt(listingsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete business with active listings');
    }

    // Soft delete by blocking
    const result = await pool.query(
        `UPDATE businesses 
     SET is_blocked = TRUE 
     WHERE id = $1 
     RETURNING *`,
        [id]
    );

    return result.rows[0];
}

export async function getBusinessStats() {
    const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_blocked = FALSE) as active,
      COUNT(*) FILTER (WHERE is_blocked = TRUE) as blocked
    FROM businesses
  `);

    return result.rows[0];
}
