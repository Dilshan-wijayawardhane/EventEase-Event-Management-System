const { Ticket, Event, User, Attendance, BookingItem, Booking } = require('../models');
const { verifyQRData, generateQRImage } = require('../utils/ticketGenerator');
const { Op } = require('sequelize');

const ticketController = {
    // Get my tickets
    getMyTickets: async (req, res) => {
        try {
            const tickets = await Ticket.findAll({
                where: { user_id: req.userId },
                include: [{
                    model: Event,
                    as: 'event',
                    attributes: ['id', 'title', 'event_date', 'start_time', 'venue', 'banner_image', 'status']
                }],
                order: [['issued_at', 'DESC']]
            });

            // Attach QR images
            const ticketsWithQR = await Promise.all(tickets.map(async (ticket) => {
                const qrImage = await generateQRImage(ticket.qr_data);
                return { ...ticket.toJSON(), qrImage };
            }));

            return res.status(200).json({ success: true, data: ticketsWithQR });
        } catch (error) {
            console.error('Get my tickets error:', error);
            return res.status(500).json({ success: false, message: 'Error fetching tickets.' });
        }
    },

    // Get ticket by ID (owner or admin)
    getTicketById: async (req, res) => {
        try {
            const ticket = await Ticket.findByPk(req.params.id, {
                include: [{ model: Event, as: 'event' }]
            });

            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket not found.' });
            }

            if (req.user.role !== 'admin' && ticket.user_id !== req.userId) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }

            const qrImage = await generateQRImage(ticket.qr_data);
            return res.status(200).json({
                success: true,
                data: { ...ticket.toJSON(), qrImage }
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching ticket.' });
        }
    },

    // ADMIN: Validate / scan QR ticket
    validateTicket: async (req, res) => {
        try {
            const { qrData } = req.body;
            const adminId = req.userId;

            if (!qrData) {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    message: 'No QR data provided.'
                });
            }

            // 1. Verify signature
            const ticketCode = verifyQRData(qrData);
            if (!ticketCode) {
                return res.status(200).json({
                    success: false,
                    valid: false,
                    status: 'INVALID',
                    message: 'Invalid QR code — signature verification failed.'
                });
            }

            // 2. Find ticket
            const ticket = await Ticket.findOne({
                where: { ticket_code: ticketCode },
                include: [{ model: Event, as: 'event' }]
            });

            if (!ticket) {
                return res.status(200).json({
                    success: false,
                    valid: false,
                    status: 'INVALID',
                    message: 'Ticket not found in system.'
                });
            }

            // 3. Check ticket status
            if (ticket.status === 'cancelled') {
                return res.status(200).json({
                    success: false,
                    valid: false,
                    status: 'CANCELLED',
                    message: 'This ticket has been cancelled.',
                    ticket: { code: ticket.ticket_code, student: ticket.student_name }
                });
            }

            if (ticket.status === 'used') {
                const attendance = await Attendance.findOne({ where: { ticket_id: ticket.id } });
                return res.status(200).json({
                    success: false,
                    valid: false,
                    status: 'ALREADY_USED',
                    message: 'This ticket was already checked in.',
                    ticket: {
                        code: ticket.ticket_code,
                        student: ticket.student_name,
                        event: ticket.event.title,
                        checkedInAt: attendance?.scanned_at
                    }
                });
            }

            // 4. Verify payment
            const bookingItem = await BookingItem.findByPk(ticket.booking_item_id, {
                include: [{ model: Booking, as: 'booking' }]
            });

            if (!bookingItem || bookingItem.booking.payment_status !== 'paid') {
                return res.status(200).json({
                    success: false,
                    valid: false,
                    status: 'UNPAID',
                    message: 'Payment for this ticket has not been completed.',
                    ticket: { code: ticket.ticket_code, student: ticket.student_name }
                });
            }

            // 5. Check event date (allow check-in on event day only)
            const today = new Date().toISOString().split('T')[0];
            if (ticket.event.event_date !== today && req.user.role !== 'admin') {
                // Optional: warn but allow
            }

            // 6. Mark ticket as used + record attendance (atomic)
            const { sequelize } = require('../config/database');
            const transaction = await sequelize.transaction();

            try {
                await ticket.update({ status: 'used', used_at: new Date() }, { transaction });

                const attendance = await Attendance.create({
                    ticket_id: ticket.id,
                    scanned_by: adminId,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                }, { transaction });

                await transaction.commit();

                return res.status(200).json({
                    success: true,
                    valid: true,
                    status: 'CHECKED_IN',
                    message: 'VALID TICKET — Entry granted.',
                    ticket: {
                        code: ticket.ticket_code,
                        student: ticket.student_name,
                        event: ticket.event.title,
                        ticketType: ticket.ticket_type_name,
                        venue: ticket.event.venue,
                        checkedInAt: attendance.scanned_at
                    }
                });
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        } catch (error) {
            console.error('Validate ticket error:', error);
            return res.status(500).json({
                success: false,
                valid: false,
                message: 'Error validating ticket.'
            });
        }
    },

    // ADMIN: Get attendance stats for an event
    getAttendanceStats: async (req, res) => {
        try {
            const { eventId } = req.params;

            const totalTickets = await Ticket.count({ where: { event_id: eventId } });
            const usedTickets = await Ticket.count({ where: { event_id: eventId, status: 'used' } });
            const activeTickets = await Ticket.count({ where: { event_id: eventId, status: 'active' } });

            return res.status(200).json({
                success: true,
                data: {
                    totalTickets,
                    usedTickets,
                    activeTickets,
                    attendanceRate: totalTickets > 0 ? ((usedTickets / totalTickets) * 100).toFixed(2) : 0
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching attendance.' });
        }
    }
};

module.exports = ticketController;