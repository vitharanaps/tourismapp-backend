import * as UserAdminModel from '../models/user.admin.model.js';
import * as BusinessAdminModel from '../models/business.admin.model.js';
import * as ListingAdminModel from '../models/listing.admin.model.js';

// ===== USER MANAGEMENT =====

// Get all users with filters
export async function getAllUsers(req, res) {
    try {
        const { search, role, status, page, limit } = req.query;

        const result = await UserAdminModel.getAllUsers({
            search,
            role,
            status,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
}

// Get user by ID
export async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const user = await UserAdminModel.getUserById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
}

// Update user
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;

        // Prevent admin from modifying their own role
        if (parseInt(id) === req.user.id && role && role !== req.user.role) {
            return res.status(403).json({ message: 'Cannot change your own role' });
        }

        const user = await UserAdminModel.updateUser(id, { name, email, role });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Email already exists' });
        }

        res.status(500).json({ message: 'Failed to update user' });
    }
}

// Block user
export async function blockUser(req, res) {
    try {
        const { id } = req.params;

        // Prevent admin from blocking themselves
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({ message: 'Cannot block your own account' });
        }

        const user = await UserAdminModel.blockUser(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User blocked successfully', user });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Failed to block user' });
    }
}

// Unblock user
export async function unblockUser(req, res) {
    try {
        const { id } = req.params;
        const user = await UserAdminModel.unblockUser(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User unblocked successfully', user });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Failed to unblock user' });
    }
}

// Delete user
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        const user = await UserAdminModel.deleteUser(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully', user });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(400).json({ message: error.message || 'Failed to delete user' });
    }
}

// Get user statistics
export async function getUserStats(req, res) {
    try {
        const stats = await UserAdminModel.getUserStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Failed to fetch user statistics' });
    }
}

// ===== BUSINESS MANAGEMENT =====

export async function getAllBusinesses(req, res) {
    try {
        const { search, page, limit } = req.query;
        const result = await BusinessAdminModel.getAllBusinesses({
            search,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).json({ message: 'Failed to fetch businesses' });
    }
}

export async function getBusinessStats(req, res) {
    try {
        const stats = await BusinessAdminModel.getBusinessStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching business stats:', error);
        res.status(500).json({ message: 'Failed to fetch business statistics' });
    }
}

export async function getBusinessById(req, res) {
    try {
        const { id } = req.params;
        const business = await BusinessAdminModel.getBusinessById(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json(business);
    } catch (error) {
        console.error('Error fetching business:', error);
        res.status(500).json({ message: 'Failed to fetch business' });
    }
}

export async function updateBusiness(req, res) {
    try {
        const { id } = req.params;
        const { name, description, type } = req.body;
        const business = await BusinessAdminModel.updateBusiness(id, { name, description, type });
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json(business);
    } catch (error) {
        console.error('Error updating business:', error);
        res.status(500).json({ message: 'Failed to update business' });
    }
}

export async function blockBusiness(req, res) {
    try {
        const { id } = req.params;
        const business = await BusinessAdminModel.blockBusiness(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json({ message: 'Business blocked successfully', business });
    } catch (error) {
        console.error('Error blocking business:', error);
        res.status(500).json({ message: 'Failed to block business' });
    }
}

export async function unblockBusiness(req, res) {
    try {
        const { id } = req.params;
        const business = await BusinessAdminModel.unblockBusiness(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json({ message: 'Business unblocked successfully', business });
    } catch (error) {
        console.error('Error unblocking business:', error);
        res.status(500).json({ message: 'Failed to unblock business' });
    }
}

export async function deleteBusiness(req, res) {
    try {
        const { id } = req.params;
        const business = await BusinessAdminModel.deleteBusiness(id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }
        res.json({ message: 'Business deleted successfully', business });
    } catch (error) {
        console.error('Error deleting business:', error);
        res.status(400).json({ message: error.message || 'Failed to delete business' });
    }
}

// ===== LISTING MANAGEMENT =====

export async function getAllListings(req, res) {
    try {
        const { search, category_id, page, limit } = req.query;
        const result = await ListingAdminModel.getAllListings({
            search,
            category_id,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ message: 'Failed to fetch listings' });
    }
}

export async function getListingStats(req, res) {
    try {
        const stats = await ListingAdminModel.getListingStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching listing stats:', error);
        res.status(500).json({ message: 'Failed to fetch listing statistics' });
    }
}

export async function getListingById(req, res) {
    try {
        const { id } = req.params;
        const listing = await ListingAdminModel.getListingById(id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.json(listing);
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ message: 'Failed to fetch listing' });
    }
}

export async function updateListing(req, res) {
    try {
        const { id } = req.params;
        const { title, description, price, category_id } = req.body;
        const listing = await ListingAdminModel.updateListing(id, { title, description, price, category_id });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.json(listing);
    } catch (error) {
        console.error('Error updating listing:', error);
        res.status(500).json({ message: 'Failed to update listing' });
    }
}

export async function toggleListingActive(req, res) {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const listing = await ListingAdminModel.toggleListingActive(id, is_active);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.json({ message: `Listing ${is_active ? 'activated' : 'deactivated'} successfully`, listing });
    } catch (error) {
        console.error('Error toggling listing status:', error);
        res.status(500).json({ message: 'Failed to update listing status' });
    }
}

export async function deleteListing(req, res) {
    try {
        const { id } = req.params;
        const listing = await ListingAdminModel.deleteListing(id);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }
        res.json({ message: 'Listing deleted successfully', listing });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ message: 'Failed to delete listing' });
    }
}
