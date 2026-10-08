const bookingService = require('../services/bookingService');
const { validationResult } = require('express-validator');

const bookingController = {
    // Create booking (student)
    createBooking: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { eventId, items, paymentMethod } = req.body;

            const result = await bookingService.createBooking(
                req.userId,
                eventId,
                items,
                paymentMethod
            );

            return res.status(201).json({
                success: true,
                message: 'Booking created successfully! Complete payment to confirm.',
                data: {
                    booking: result.booking,
                    tickets: result.tickets
                }
            });
        } catch (error) {
            console.error('Create booking error:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Booking failed.'
            });
        }
    },

    // Get my bookings
    getMyBookings: async (req, res) => {
        try {
            const bookings = await bookingService.getUserBookings(req.userId);
            return res.status(200).json({ success: true, data: bookings });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching bookings.' });
        }
    },

    // Get single booking
    getBookingById: async (req, res) => {
        try {
            const isAdmin = req.user?.role === 'admin';
            const booking = await bookingService.getBookingById(
                req.params.id,
                req.userId,
                isAdmin
            );
            return res.status(200).json({ success: true, data: booking });
        } catch (error) {
            return res.status(404).json({ success: false, message: error.message });
        }
    },

    // Cancel booking
    cancelBooking: async (req, res) => {
        try {
            const booking = await bookingService.cancelBooking(req.params.id, req.userId);
            return res.status(200).json({
                success: true,
                message: 'Booking cancelled successfully. Refund will be processed.',
                data: booking
            });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
};

module.exports = bookingController;