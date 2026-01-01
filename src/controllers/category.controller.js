import * as CategoryModel from '../models/category.model.js';

// Public: Get all active categories
export async function getCategories(req, res) {
    try {
        const categories = await CategoryModel.getAllCategories(false);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
}

// Admin: Get all categories (including inactive)
export async function getAllCategoriesAdmin(req, res) {
    try {
        const categories = await CategoryModel.getAllCategories(true);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
}

// Public: Get category by ID
export async function getCategoryById(req, res) {
    try {
        const { id } = req.params;
        const category = await CategoryModel.getCategoryById(id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
}

// Public: Get category by slug
export async function getCategoryBySlug(req, res) {
    try {
        const { slug } = req.params;
        const category = await CategoryModel.getCategoryBySlug(slug);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
}

// Admin: Create new category
export async function createCategory(req, res) {
    try {
        const { name, slug, icon, description, display_order } = req.body;

        if (!name || !slug || !icon) {
            return res.status(400).json({ message: 'Name, slug, and icon are required' });
        }

        const category = await CategoryModel.createCategory({
            name,
            slug,
            icon,
            description,
            display_order
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Category name or slug already exists' });
        }

        res.status(500).json({ message: 'Failed to create category' });
    }
}

// Admin: Update category
export async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const { name, slug, icon, description, is_active, display_order } = req.body;

        const category = await CategoryModel.updateCategory(id, {
            name,
            slug,
            icon,
            description,
            is_active,
            display_order
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Category name or slug already exists' });
        }

        res.status(500).json({ message: 'Failed to update category' });
    }
}

// Admin: Delete category (soft delete)
export async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        const category = await CategoryModel.deleteCategory(id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully', category });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Failed to delete category' });
    }
}

// Admin: Reorder categories
export async function reorderCategories(req, res) {
    try {
        const { orders } = req.body;

        if (!Array.isArray(orders)) {
            return res.status(400).json({ message: 'Orders must be an array' });
        }

        await CategoryModel.reorderCategories(orders);
        res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        console.error('Error reordering categories:', error);
        res.status(500).json({ message: 'Failed to reorder categories' });
    }
}
