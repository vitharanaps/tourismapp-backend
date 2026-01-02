// ============================================
// ENHANCED CATEGORY CONTROLLER
// Returns categories with booking configuration
// ============================================

import pool from '../config/db.js';
import * as CategoryModel from '../models/category.model.js';

/**
 * Get all categories with booking configuration
 * GET /api/categories
 */
export async function getAllCategories(req, res) {
    try {
        const { include_inactive } = req.query;
        const categories = await CategoryModel.getAllCategories(
            include_inactive === 'true'
        );

        // Format the response to make booking config more accessible
        const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            description: cat.description,
            displayOrder: cat.display_order,
            isActive: cat.is_active,
            bookingConfig: cat.booking_config,
            // Convenience flags for frontend
            requiresBooking: cat.booking_config.requires_booking,
            dateType: cat.booking_config.date_type,
            requiresTime: cat.booking_config.requires_time,
            requiresGuests: cat.booking_config.requires_guests
        }));

        return res.json({ categories: formattedCategories });
    } catch (error) {
        console.error('Get categories error:', error);
        return res.status(500).json({ message: 'Failed to retrieve categories' });
    }
}

/**
 * Get category by slug with full configuration
 * GET /api/categories/:slug
 */
export async function getCategoryBySlug(req, res) {
    try {
        const { slug } = req.params;
        const category = await CategoryModel.getCategoryBySlug(slug);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Get statistics for this category
        const statsResult = await pool.query(
            `SELECT
                COUNT(DISTINCT l.id) as listing_count,
                COUNT(DISTINCT b.id) as booking_count
             FROM categories c
             LEFT JOIN listings l ON c.id = l.category_id AND l.is_active = TRUE
             LEFT JOIN bookings b ON c.id = b.category_id
             WHERE c.id = $1`,
            [category.id]
        );

        const stats = statsResult.rows[0];

        return res.json({
            category: {
                id: category.id,
                name: category.name,
                slug: category.slug,
                icon: category.icon,
                description: category.description,
                bookingConfig: category.booking_config,
                displayOrder: category.display_order,
                isActive: category.is_active,
                stats: {
                    listingCount: parseInt(stats.listing_count),
                    bookingCount: parseInt(stats.booking_count)
                }
            }
        });
    } catch (error) {
        console.error('Get category by slug error:', error);
        return res.status(500).json({ message: 'Failed to retrieve category' });
    }
}

/**
 * Get booking configuration for a category
 * GET /api/categories/:slug/booking-config
 */
export async function getCategoryBookingConfig(req, res) {
    try {
        const { slug } = req.params;
        const category = await CategoryModel.getCategoryBySlug(slug);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        return res.json({
            categoryId: category.id,
            categoryName: category.name,
            slug: category.slug,
            bookingConfig: category.booking_config
        });
    } catch (error) {
        console.error('Get category booking config error:', error);
        return res.status(500).json({ message: 'Failed to retrieve booking configuration' });
    }
}

/**
 * Create a new category (Admin only)
 * POST /api/categories
 */
export async function createCategory(req, res) {
    try {
        const { name, slug, icon, description, booking_config, display_order } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ message: 'Name and slug are required' });
        }

        // Validate booking_config structure
        if (booking_config) {
            const requiredFields = [
                'requires_booking',
                'date_type',
                'requires_time',
                'requires_guests'
            ];

            for (const field of requiredFields) {
                if (!(field in booking_config)) {
                    return res.status(400).json({
                        message: `booking_config must include ${field}`
                    });
                }
            }
        }

        const result = await pool.query(
            `INSERT INTO categories (name, slug, icon, description, booking_config, display_order)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                name,
                slug,
                icon || null,
                description || null,
                JSON.stringify(booking_config || {}),
                display_order || 0
            ]
        );

        return res.status(201).json({
            message: 'Category created successfully',
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Create category error:', error);

        if (error.code === '23505') {
            // Unique violation
            return res.status(409).json({
                message: 'Category with this name or slug already exists'
            });
        }

        return res.status(500).json({ message: 'Failed to create category' });
    }
}

/**
 * Update category configuration (Admin only)
 * PATCH /api/categories/:id
 */
export async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build dynamic update query
        const allowedFields = [
            'name',
            'slug',
            'icon',
            'description',
            'booking_config',
            'display_order',
            'is_active'
        ];

        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                values.push(
                    key === 'booking_config' ? JSON.stringify(updates[key]) : updates[key]
                );
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        updateFields.push('updated_at = NOW()');
        values.push(id);

        const query = `
            UPDATE categories
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        return res.json({
            message: 'Category updated successfully',
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Update category error:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Category with this name or slug already exists'
            });
        }

        return res.status(500).json({ message: 'Failed to update category' });
    }
}

/**
 * Delete category (Admin only)
 * DELETE /api/categories/:id
 */
export async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        const { hard_delete } = req.query;

        let result;

        if (hard_delete === 'true') {
            // Check for associated listings
            const listingsCheck = await pool.query(
                'SELECT COUNT(*) FROM listings WHERE category_id = $1',
                [id]
            );

            if (parseInt(listingsCheck.rows[0].count) > 0) {
                return res.status(400).json({
                    message: 'Cannot delete category with associated listings'
                });
            }

            result = await pool.query(
                'DELETE FROM categories WHERE id = $1 RETURNING *',
                [id]
            );
        } else {
            // Soft delete
            result = await pool.query(
                'UPDATE categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
                [id]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        return res.json({
            message: hard_delete === 'true' ? 'Category deleted' : 'Category deactivated',
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Delete category error:', error);
        return res.status(500).json({ message: 'Failed to delete category' });
    }
}

/**
 * Reorder categories (Admin only)
 * POST /api/categories/reorder
 */
export async function reorderCategories(req, res) {
    try {
        const { orders } = req.body;
        // orders: [{id: 1, display_order: 0}, {id: 2, display_order: 1}, ...]

        if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ message: 'Invalid orders array' });
        }

        await CategoryModel.reorderCategories(orders);

        return res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        console.error('Reorder categories error:', error);
        return res.status(500).json({ message: 'Failed to reorder categories' });
    }
}

/**
 * Get category listings with booking info
 * GET /api/categories/:slug/listings
 */
export async function getCategoryListings(req, res) {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 12, city, rating, search, sort = 'newest' } = req.query;

        const category = await CategoryModel.getCategoryBySlug(slug);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Use existing listing model
        const ListingModel = await import('../models/listing.model.js');
        const result = await ListingModel.getFilteredListings({
            category: category.id,
            city,
            rating: rating ? parseFloat(rating) : undefined,
            search,
            sort,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.json({
            category: {
                id: category.id,
                name: category.name,
                slug: category.slug,
                bookingConfig: category.booking_config
            },
            ...result
        });
    } catch (error) {
        console.error('Get category listings error:', error);
        return res.status(500).json({ message: 'Failed to retrieve listings' });
    }
}
