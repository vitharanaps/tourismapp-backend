import pool from '../config/db.js';

export async function getAllCategories(includeInactive = false) {
    const query = includeInactive
        ? 'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
        : 'SELECT * FROM categories WHERE is_active = TRUE ORDER BY display_order ASC, name ASC';

    const result = await pool.query(query);
    return result.rows;
}

export async function getMainCategories(includeInactive = false) {
    const query = includeInactive
        ? 'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY display_order ASC, name ASC'
        : 'SELECT * FROM categories WHERE parent_id IS NULL AND is_active = TRUE ORDER BY display_order ASC, name ASC';

    const result = await pool.query(query);
    return result.rows;
}

export async function getCategoryById(id) {
    const result = await pool.query(
        'SELECT * FROM categories WHERE id = $1',
        [id]
    );
    return result.rows[0];
}

export async function getCategoryBySlug(slug) {
    const result = await pool.query(
        'SELECT * FROM categories WHERE slug = $1',
        [slug]
    );
    return result.rows[0];
}

export async function getSubcategories(parentId) {
    const result = await pool.query(
        'SELECT * FROM categories WHERE parent_id = $1 AND is_active = TRUE ORDER BY display_order ASC, name ASC',
        [parentId]
    );
    return result.rows;
}

export async function createCategory(data) {
    const { name, slug, icon, description, display_order, amenities, date_type, has_booking_flow, parent_id } = data;

    const result = await pool.query(
        `INSERT INTO categories (name, slug, icon, description, display_order, amenities, date_type, has_booking_flow, parent_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
        [
            name,
            slug,
            icon,
            description || null,
            display_order || 0,
            amenities || [],
            date_type || 'range',
            has_booking_flow !== undefined ? has_booking_flow : true,
            parent_id || null
        ]
    );

    return result.rows[0];
}

export async function updateCategory(id, data) {
    const { name, slug, icon, description, is_active, display_order, amenities, date_type, has_booking_flow, parent_id } = data;

    const result = await pool.query(
        `UPDATE categories 
     SET name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         icon = COALESCE($3, icon),
         description = COALESCE($4, description),
         is_active = COALESCE($5, is_active),
         display_order = COALESCE($6, display_order),
         amenities = COALESCE($7, amenities),
         date_type = COALESCE($8, date_type),
         has_booking_flow = COALESCE($9, has_booking_flow),
         parent_id = $10,
         updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
        [name, slug, icon, description, is_active, display_order, amenities, date_type, has_booking_flow, parent_id, id]
    );

    return result.rows[0];
}

export async function deleteCategory(id) {
    // Soft delete by setting is_active to false
    const result = await pool.query(
        `UPDATE categories 
     SET is_active = FALSE, updated_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
        [id]
    );

    return result.rows[0];
}

export async function hardDeleteCategory(id) {
    // Check if any listings use this category
    const listingsCheck = await pool.query(
        'SELECT COUNT(*) FROM listings WHERE category_id = $1',
        [id]
    );

    if (parseInt(listingsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete category with associated listings');
    }

    const result = await pool.query(
        'DELETE FROM categories WHERE id = $1 RETURNING *',
        [id]
    );

    return result.rows[0];
}

export async function reorderCategories(orders) {
    // orders is an array of { id, display_order }
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const { id, display_order } of orders) {
            await client.query(
                'UPDATE categories SET display_order = $1, updated_at = NOW() WHERE id = $2',
                [display_order, id]
            );
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
