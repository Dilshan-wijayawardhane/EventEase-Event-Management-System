const express = require('express');
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/my', auth.verifyToken, ticketController.getMyTickets);
router.get('/:id', auth.verifyToken, ticketController.getTicketById);

// Admin only
router.post('/validate', auth.verifyToken, auth.isAdmin, ticketController.validateTicket);
router.get('/attendance/:eventId', auth.verifyToken, auth.isAdmin, ticketController.getAttendanceStats);

module.exports = router;