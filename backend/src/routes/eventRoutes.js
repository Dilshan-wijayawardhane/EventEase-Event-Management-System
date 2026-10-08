const express = require('express');
const { body } = require('express-validator');
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation rules
const eventValidation = [
    body('title').notEmpty().withMessage('Title is required'),
    body('event_date').isDate().withMessage('Valid date is required'),
    body('start_time').notEmpty().withMessage('Start time is required'),
    body('venue').notEmpty().withMessage('Venue is required')
];

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/categories', eventController.getCategories);
router.get('/:id', eventController.getEventById);

// Admin routes
router.post('/', auth.verifyToken, auth.isAdmin, eventValidation, eventController.createEvent);
router.put('/:id', auth.verifyToken, auth.isAdmin, eventController.updateEvent);
router.delete('/:id', auth.verifyToken, auth.isAdmin, eventController.deleteEvent);
router.patch('/:id/cancel', auth.verifyToken, auth.isAdmin, eventController.cancelEvent);

module.exports = router;