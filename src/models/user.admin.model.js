import pool from '../config/db.js';

export async function getAllUsers(filters = {}) {
    const { search, role, status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
    SELECT id, name, email, role, avatar_url, is_blocked, created_at
    FROM users
    WHERE 1=1
  `;

    const params = [];
    let paramIndex = 1;

    if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (role) {
        query += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
    }

    if (status === 'blocked') {
        query += ` AND is_blocked = TRUE`;
    } else if (status === 'active') {
        query += ` AND is_blocked = FALSE`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
        countQuery += ` AND (name ILIKE $${countParamIndex} OR email ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
        countParamIndex++;
    }

    if (role) {
        countQuery += ` AND role = $${countParamIndex}`;
        countParams.push(role);
        countParamIndex++;
    }

    if (status === 'blocked') {
        countQuery += ` AND is_blocked = TRUE`;
    } else if (status === 'active') {
        countQuery += ` AND is_blocked = FALSE`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
        users: result.rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
    };
}

export async function getUserById(id) {
    const result = await pool.query(
        'SELECT id, name, email, role, avatar_url, is_blocked, created_at FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0];
}

export async function updateUser(id, data) {
    const { name, email, role } = data;

    const result = await pool.query(
        `UPDATE users 
     SET name = COALESCE($1, name),
         email = COALESCE($2, email),
         role = COALESCE($3, role)
     WHERE id = $4
     RETURNING id, name, email, role, avatar_url, is_blocked, created_at`,
        [name, email, role, id]
    );

    return result.rows[0];
}

export async function blockUser(id) {
    const result = await pool.query(
        `UPDATE users 
     SET is_blocked = TRUE 
     WHERE id = $1 
     RETURNING id, name, email, role, is_blocked`,
        [id]
    );

    return result.rows[0];
}

export async function unblockUser(id) {
    const result = await pool.query(
        `UPDATE users 
     SET is_blocked = FALSE 
     WHERE id = $1 
     RETURNING id, name, email, role, is_blocked`,
        [id]
    );

    return result.rows[0];
}

export async function deleteUser(id) {
    // Check if user has active listings or bookings
    const listingsCheck = await pool.query(
        'SELECT COUNT(*) FROM listings WHERE vendor_id = $1',
        [id]
    );

    const bookingsCheck = await pool.query(
        'SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND status NOT IN (\'cancelled\', \'completed\')',
        [id]
    );

    if (parseInt(listingsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete user with active listings');
    }

    if (parseInt(bookingsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete user with active bookings');
    }

    // Soft delete by blocking the account
    const result = await pool.query(
        `UPDATE users 
     SET is_blocked = TRUE 
     WHERE id = $1 
     RETURNING id, name, email`,
        [id]
    );

    return result.rows[0];
}

export async function getUserStats() {
    const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_blocked = FALSE) as active,
      COUNT(*) FILTER (WHERE is_blocked = TRUE) as blocked,
      COUNT(*) FILTER (WHERE role = 'businessOwner') as business_owners,
      COUNT(*) FILTER (WHERE role = 'admin') as admins
    FROM users
  `);

    return result.rows[0];
}
