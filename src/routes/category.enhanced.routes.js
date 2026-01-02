// ============================================
// ENHANCED CATEGORY ROUTES
// Category management with booking configuration
// ============================================

import express from 'express';
import * as CategoryController from '../controllers/category.enhanced.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all active categories with booking configuration
 * Query: ?include_inactive=true (admin only)
 */
router.get('/', CategoryController.getAllCategories);

/**
 * Get category by slug with full details
 */
router.get('/:slug', CategoryController.getCategoryBySlug);

/**
 * Get booking configuration for a category
 * Returns just the booking rules for frontend consumption
 */
router.get('/:slug/booking-config', CategoryController.getCategoryBookingConfig);

/**
 * Get listings for a category
 * Query: ?page=1&limit=12&city=Paris&rating=4&search=luxury&sort=newest
 */
router.get('/:slug/listings', CategoryController.getCategoryListings);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * Create a new category
 * Body: { name, slug, icon, description, booking_config, display_order }
 */
router.post(
    '/',
    isAuthenticated,
    isAdmin,
    CategoryController.createCategory
);

/**
 * Update category
 * Body: { name?, slug?, icon?, description?, booking_config?, display_order?, is_active? }
 */
router.patch(
    '/:id',
    isAuthenticated,
    isAdmin,
    CategoryController.updateCategory
);

/**
 * Delete category (soft delete by default)
 * Query: ?hard_delete=true (permanent deletion)
 */
router.delete(
    '/:id',
    isAuthenticated,
    isAdmin,
    CategoryController.deleteCategory
);

/**
 * Reorder categories
 * Body: { orders: [{id: 1, display_order: 0}, {id: 2, display_order: 1}, ...] }
 */
router.post(
    '/reorder',
    isAuthenticated,
    isAdmin,
    CategoryController.reorderCategories
);

export default router;
