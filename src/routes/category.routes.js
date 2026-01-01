import express from 'express';
import * as CategoryController from '../controllers/category.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', CategoryController.getCategories);
router.get('/:id', CategoryController.getCategoryById);
router.get('/slug/:slug', CategoryController.getCategoryBySlug);

// Admin routes
router.get('/admin/all', isAuthenticated, isAdmin, CategoryController.getAllCategoriesAdmin);
router.post('/admin', isAuthenticated, isAdmin, CategoryController.createCategory);
router.put('/admin/:id', isAuthenticated, isAdmin, CategoryController.updateCategory);
router.delete('/admin/:id', isAuthenticated, isAdmin, CategoryController.deleteCategory);
router.patch('/admin/reorder', isAuthenticated, isAdmin, CategoryController.reorderCategories);

export default router;
