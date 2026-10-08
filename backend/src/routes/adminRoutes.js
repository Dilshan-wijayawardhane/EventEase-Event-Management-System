const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const router = express.Router();

// All admin routes require auth + admin role
router.use(auth.verifyToken, auth.isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);
router.get('/sales-chart', adminController.getSalesChart);
router.get('/top-events', adminController.getTopEvents);

// Bookings
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/export', adminController.exportBookings);

// Students
router.get('/students', adminController.getAllStudents);

// Event analytics
router.get('/events/:eventId/analytics', adminController.getEventAnalytics);

module.exports = router;