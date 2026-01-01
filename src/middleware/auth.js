// middleware/auth.js - CHANGE TO NAMED EXPORTS
export function isAuthenticated(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ message: 'Not authenticated' });
}

export function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  return next();
}

export function hasRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}
