const express = require('express');
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/create-intent', auth.verifyToken, paymentController.createPaymentIntent);
router.post('/simulate-success', auth.verifyToken, paymentController.simulatePaymentSuccess);
// Note: webhook route is registered separately in app.js with raw body parser

module.exports = router;