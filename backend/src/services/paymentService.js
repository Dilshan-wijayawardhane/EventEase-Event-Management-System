const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Payment, Booking, Ticket, Event } = require('../models');
const { sequelize } = require('../config/database');

/**
 * Create a Stripe PaymentIntent for a booking.
 * NOTE: In dev/test, use Stripe test cards (4242 4242 4242 4242).
 */
const createPaymentIntent = async (bookingId, userId) => {
    const booking = await Booking.findOne({
        where: { id: bookingId, user_id: userId },
        include: [{ model: Event, as: 'event' }]
    });

    if (!booking) throw new Error('Booking not found.');
    if (booking.status !== 'pending') throw new Error('Booking is not pending payment.');
    if (booking.payment_status === 'paid') throw new Error('Booking already paid.');

    // Amount in cents (Stripe requirement)
    const amountInCents = Math.round(parseFloat(booking.total_amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
            bookingId: booking.id.toString(),
            bookingReference: booking.booking_reference,
            userId: userId.toString(),
            eventTitle: booking.event.title
        },
        description: `EventEase tickets for ${booking.event.title}`,
        automatic_payment_methods: { enabled: true }
    });

    // Save payment record
    await Payment.create({
        booking_id: booking.id,
        payment_intent_id: paymentIntent.id,
        amount: booking.total_amount,
        currency: 'usd',
        payment_method: 'card',
        status: 'pending',
        metadata: { clientSecret: paymentIntent.client_secret }
    });

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: booking.total_amount
    };
};

/**
 * Handle successful payment (called from webhook).
 * This is the ONLY place we mark a booking as confirmed.
 */
const handlePaymentSuccess = async (paymentIntentId) => {
    const transaction = await sequelize.transaction();
    try {
        const payment = await Payment.findOne({
            where: { payment_intent_id: paymentIntentId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!payment) throw new Error('Payment record not found.');
        if (payment.status === 'successful') {
            await transaction.rollback();
            return { alreadyProcessed: true };
        }

        await payment.update({
            status: 'successful',
            transaction_id: paymentIntentId,
            payment_date: new Date()
        }, { transaction });

        await Booking.update({
            status: 'confirmed',
            payment_status: 'paid'
        }, {
            where: { id: payment.booking_id },
            transaction
        });

        await transaction.commit();
        return { success: true, bookingId: payment.booking_id };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Handle failed payment.
 */
const handlePaymentFailure = async (paymentIntentId, reason = 'Payment failed') => {
    const payment = await Payment.findOne({ where: { payment_intent_id: paymentIntentId } });
    if (!payment) return;

    await payment.update({ status: 'failed', metadata: { reason } });

    const transaction = await sequelize.transaction();
    try {
        const booking = await Booking.findByPk(payment.booking_id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (booking && booking.payment_status !== 'paid') {
            await booking.update({ status: 'failed', payment_status: 'pending' }, { transaction });

            // Restore ticket quantities
            const { BookingItem, TicketType } = require('../models');
            const items = await BookingItem.findAll({
                where: { booking_id: booking.id },
                transaction
            });
            for (const item of items) {
                await TicketType.increment('available_quantity', {
                    by: item.quantity,
                    where: { id: item.ticket_type_id },
                    transaction
                });
            }
        }
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = {
    createPaymentIntent,
    handlePaymentSuccess,
    handlePaymentFailure
};