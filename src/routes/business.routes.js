// backend/src/routes/business.routes.js
import { Router } from 'express';
import { createBusiness, getMyBusinesses, addStaff, getBusinessStats, getBusinessStaff, deleteBusiness } from '../controllers/business.controller.js';

const router = Router();

// Middleware to ensure user is authenticated (assuming req.user is populated)
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
};

router.post('/', isAuthenticated, createBusiness);
router.get('/my', isAuthenticated, getMyBusinesses);
router.post('/staff', isAuthenticated, addStaff);
router.get('/:businessId/stats', isAuthenticated, getBusinessStats);
router.get('/:businessId/staff', isAuthenticated, getBusinessStaff);
router.delete('/:businessId', isAuthenticated, deleteBusiness);

export default router;
