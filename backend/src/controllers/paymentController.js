const paymentService = require('../services/paymentService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentController = {
    createPaymentIntent: async (req, res) => {
        try {
            const { bookingId } = req.body;
            const result = await paymentService.createPaymentIntent(bookingId, req.userId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    },

    // Stripe webhook — MUST use raw body
    handleWebhook: async (req, res) => {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await paymentService.handlePaymentSuccess(event.data.object.id);
                    break;
                case 'payment_intent.payment_failed':
                    await paymentService.handlePaymentFailure(
                        event.data.object.id,
                        event.data.object.last_payment_error?.message
                    );
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
            res.json({ received: true });
        } catch (error) {
            console.error('Webhook handler error:', error);
            res.status(500).json({ error: 'Webhook handler failed' });
        }
    },

    // DEV ONLY: Simulate payment success without Stripe webhook
    // (Useful for testing without ngrok/Stripe CLI)
    simulatePaymentSuccess: async (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, message: 'Not available in production.' });
        }
        try {
            const { bookingId } = req.body;
            const { Payment } = require('../models');
            const payment = await Payment.findOne({ where: { booking_id: bookingId } });
            if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

            await paymentService.handlePaymentSuccess(payment.payment_intent_id);
            return res.status(200).json({ success: true, message: 'Payment simulated as successful.' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = paymentController;