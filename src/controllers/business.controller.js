// backend/src/controllers/business.controller.js
import pool from "../config/db.js";

export async function createBusiness(req, res) {
    try {
        const ownerId = req.user.id;
        const { name, type, description, address, city, country, logo_url, email, phone } = req.body;

        const result = await pool.query(
            `INSERT INTO businesses (owner_id, name, type, description, address, city, country, logo_url, email, phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [ownerId, name, type, description, address, city, country, logo_url, email, phone]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Create business error:", err);
        return res.status(500).json({ message: "Failed to create business" });
    }
}

export async function getMyBusinesses(req, res) {
    try {
        const userId = req.user.id;

        // Get businesses where user is owner OR staff, excluding deleted ones
        const result = await pool.query(
            `SELECT b.*, 
                CASE WHEN b.owner_id = $1 THEN 'owner' ELSE bs.role END as user_role
             FROM businesses b
             LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
             WHERE (b.owner_id = $1 OR bs.user_id = $1)
             AND b.is_deleted = false
             ORDER BY b.created_at DESC`,
            [userId]
        );

        return res.json(result.rows);
    } catch (err) {
        console.error("Get my businesses error:", err);
        return res.status(500).json({ message: "Failed to retrieve businesses" });
    }
}

export async function deleteBusiness(req, res) {
    try {
        const { businessId } = req.params;
        const ownerId = req.user.id;

        // Soft delete: set is_deleted = true
        const result = await pool.query(
            `UPDATE businesses 
             SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND owner_id = $2
             RETURNING id`,
            [businessId, ownerId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Business not found or unauthorized" });
        }

        // Also soft delete all listings for this business
        await pool.query(
            `UPDATE listings SET is_deleted = true WHERE business_id = $1`,
            [businessId]
        );

        return res.json({ message: "Business and associated listings deleted successfully" });
    } catch (err) {
        console.error("Delete business error:", err);
        return res.status(500).json({ message: "Failed to delete business" });
    }
}

export async function addStaff(req, res) {
    try {
        const ownerId = req.user.id;
        const { businessId, email, role } = req.body;

        // 1. Verify user is owner of the business
        const businessCheck = await pool.query(
            `SELECT * FROM businesses WHERE id = $1 AND owner_id = $2`,
            [businessId, ownerId]
        );

        if (businessCheck.rows.length === 0) {
            return res.status(403).json({ message: "Only business owners can add staff" });
        }

        // 2. Find user by email
        const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found with this email" });
        }
        const staffUserId = userRes.rows[0].id;

        // 3. Add to staff table
        const result = await pool.query(
            `INSERT INTO business_staff (business_id, user_id, role)
             VALUES ($1, $2, $3)
             ON CONFLICT (business_id, user_id) 
             DO UPDATE SET role = EXCLUDED.role
             RETURNING *`,
            [businessId, staffUserId, role || 'manager']
        );

        // 4. Update user's global role to 'manager' if they are currently 'user'
        // This ensures they can access the vendor dashboard
        await pool.query(
            `UPDATE users 
             SET role = 'manager' 
             WHERE id = $1 AND role = 'user'`,
            [staffUserId]
        );

        return res.json(result.rows[0]);
    } catch (err) {
        console.error("Add staff error:", err);
        return res.status(500).json({ message: "Failed to add staff" });
    }
}

export async function getBusinessStats(req, res) {
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        // Verify access (owner or staff)
        const accessCheck = await pool.query(
            `SELECT 1 FROM businesses b
             LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
             WHERE b.id = $2 AND (b.owner_id = $1 OR bs.user_id = $1)`,
            [userId, businessId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: "Unauthorized access to business stats" });
        }

        // Fetch basic stats
        const listingCount = await pool.query(
            `SELECT COUNT(*) FROM listings WHERE business_id = $1`,
            [businessId]
        );

        const bookingCount = await pool.query(
            `SELECT COUNT(*) FROM bookings b
             JOIN listings l ON b.listing_id = l.id
             WHERE l.business_id = $1`,
            [businessId]
        );

        return res.json({
            listingCount: parseInt(listingCount.rows[0].count),
            bookingCount: parseInt(bookingCount.rows[0].count)
        });
    } catch (err) {
        console.error("Get business stats error:", err);
        return res.status(500).json({ message: "Failed to retrieve business stats" });
    }
}

export async function getBusinessStaff(req, res) {
    try {
        const { businessId } = req.params;
        const userId = req.user.id;

        // Verify access (owner or manager)
        const accessCheck = await pool.query(
            `SELECT 1 FROM businesses b
             LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
             WHERE b.id = $2 AND (b.owner_id = $1 OR bs.user_id = $1)`,
            [userId, businessId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ message: "Unauthorized access to business staff" });
        }

        const staff = await pool.query(
            `SELECT u.id, u.name, u.email, u.avatar_url, bs.role, bs.created_at
             FROM business_staff bs
             JOIN users u ON bs.user_id = u.id
             WHERE bs.business_id = $1
             ORDER BY bs.created_at DESC`,
            [businessId]
        );

        return res.json(staff.rows);
    } catch (err) {
        console.error("Get business staff error:", err);
        return res.status(500).json({ message: "Failed to retrieve business staff" });
    }
}
