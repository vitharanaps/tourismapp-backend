export function isAuthenticated(req, res, next) {
    if (req.user) return next();
    return res.status(401).json({ message: 'Not authenticated' });
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
  