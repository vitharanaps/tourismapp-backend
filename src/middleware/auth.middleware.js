// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

export function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    // Check if user is attached (for custom auth implementations)
    if (req.user && req.user.id) {
        return next();
    }

    return res.status(401).json({ message: 'Authentication required' });
}

export function isAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    return next();
}

export function isVendor(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Vendor access required' });
    }

    return next();
}

export function isVendorOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!['vendor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Vendor or admin access required' });
    }

    return next();
}
