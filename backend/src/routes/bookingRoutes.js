const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const router = express.Router();

const bookingValidation = [
    body('eventId').isInt().withMessage('Valid event ID required'),
    body('items').isArray({ min: 1 }).withMessage('At least one ticket type required'),
    body('items.*.ticketTypeId').isInt().withMessage('Valid ticket type ID required'),
    body('items.*.quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1-10')
];

router.post('/', auth.verifyToken, bookingValidation, bookingController.createBooking);
router.get('/my', auth.verifyToken, bookingController.getMyBookings);
router.get('/:id', auth.verifyToken, bookingController.getBookingById);
router.patch('/:id/cancel', auth.verifyToken, bookingController.cancelBooking);

module.exports = router;