const { User, Event, Booking, Ticket, TicketType, Attendance, Payment } = require('../models');
const { Op, Sequelize, fn, col, literal } = require('sequelize');

const adminController = {
    // Dashboard overview stats
    getDashboardStats: async (req, res) => {
        try {
            const [
                totalEvents,
                upcomingEvents,
                totalStudents,
                totalTicketsSold,
                totalRevenue,
                totalAttendance
            ] = await Promise.all([
                Event.count(),
                Event.count({ where: { status: 'upcoming' } }),
                User.count({ where: { role: 'student' } }),
                Ticket.count(),
                Payment.sum('amount', { where: { status: 'successful' } }),
                Attendance.count()
            ]);

            const attendanceRate = totalTicketsSold > 0
                ? ((totalAttendance / totalTicketsSold) * 100).toFixed(2)
                : 0;

            return res.status(200).json({
                success: true,
                data: {
                    totalEvents,
                    upcomingEvents,
                    totalStudents,
                    totalTicketsSold,
                    totalRevenue: totalRevenue || 0,
                    totalAttendance,
                    attendanceRate
                }
            });
        } catch (error) {
            console.error('Dashboard stats error:', error);
            return res.status(500).json({ success: false, message: 'Error fetching stats.' });
        }
    },

    // Sales over time (last 30 days)
    getSalesChart: async (req, res) => {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const sales = await Payment.findAll({
                attributes: [
                    [fn('DATE', col('payment_date')), 'date'],
                    [fn('SUM', col('amount')), 'revenue'],
                    [fn('COUNT', col('id')), 'transactions']
                ],
                where: {
                    status: 'successful',
                    payment_date: { [Op.gte]: startDate }
                },
                group: [fn('DATE', col('payment_date'))],
                order: [[fn('DATE', col('payment_date')), 'ASC']],
                raw: true
            });

            return res.status(200).json({ success: true, data: sales });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching sales chart.' });
        }
    },

    // Top events by sales
    getTopEvents: async (req, res) => {
        try {
            const topEvents = await Event.findAll({
                attributes: [
                    'id', 'title', 'event_date', 'venue', 'status',
                    [literal(`(SELECT COUNT(*) FROM tickets WHERE tickets.event_id = Event.id)`), 'ticketsSold'],
                    [literal(`(SELECT COALESCE(SUM(amount), 0) FROM payments 
                        INNER JOIN bookings ON payments.booking_id = bookings.id 
                        WHERE bookings.event_id = Event.id AND payments.status = 'successful')`), 'revenue']
                ],
                order: [[literal('ticketsSold'), 'DESC']],
                limit: 10
            });

            return res.status(200).json({ success: true, data: topEvents });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching top events.' });
        }
    },

    // All bookings (paginated)
    getAllBookings: async (req, res) => {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const where = {};
            if (status) where.status = status;

            const { count, rows } = await Booking.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] },
                    { model: Event, as: 'event', attributes: ['id', 'title', 'event_date'] }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (page - 1) * limit
            });

            return res.status(200).json({
                success: true,
                data: {
                    bookings: rows,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching bookings.' });
        }
    },

    // All students
    getAllStudents: async (req, res) => {
        try {
            const students = await User.findAll({
                where: { role: 'student' },
                attributes: ['id', 'full_name', 'email', 'phone', 'created_at'],
                order: [['created_at', 'DESC']]
            });
            return res.status(200).json({ success: true, data: students });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching students.' });
        }
    },

    // Event-specific analytics
    getEventAnalytics: async (req, res) => {
        try {
            const { eventId } = req.params;

            const event = await Event.findByPk(eventId, {
                include: [{ model: TicketType, as: 'ticketTypes' }]
            });
            if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

            const [totalTickets, ticketsSold, attendees, revenue] = await Promise.all([
                TicketType.sum('max_quantity', { where: { event_id: eventId } }),
                Ticket.count({ where: { event_id: eventId } }),
                Attendance.count({
                    include: [{ model: Ticket, as: 'ticket', where: { event_id: eventId } }]
                }),
                Payment.sum('amount', {
                    include: [{
                        model: Booking,
                        as: 'booking',
                        where: { event_id: eventId }
                    }],
                    where: { status: 'successful' }
                })
            ]);

            const salesOverTime = await Booking.findAll({
                attributes: [
                    [fn('DATE', col('booking_date')), 'date'],
                    [fn('COUNT', col('Booking.id')), 'bookings']
                ],
                where: { event_id: eventId },
                group: [fn('DATE', col('booking_date'))],
                order: [[fn('DATE', col('booking_date')), 'ASC']],
                raw: true
            });

            return res.status(200).json({
                success: true,
                data: {
                    event,
                    totalTickets: totalTickets || 0,
                    ticketsSold,
                    remainingTickets: (totalTickets || 0) - ticketsSold,
                    revenue: revenue || 0,
                    attendees,
                    attendanceRate: ticketsSold > 0 ? ((attendees / ticketsSold) * 100).toFixed(2) : 0,
                    salesOverTime
                }
            });
        } catch (error) {
            console.error('Event analytics error:', error);
            return res.status(500).json({ success: false, message: 'Error fetching analytics.' });
        }
    },

    // Export bookings as CSV
    exportBookings: async (req, res) => {
        try {
            const { eventId } = req.query;
            const where = eventId ? { event_id: eventId } : {};

            const bookings = await Booking.findAll({
                where,
                include: [
                    { model: User, as: 'user', attributes: ['full_name', 'email'] },
                    { model: Event, as: 'event', attributes: ['title', 'event_date'] }
                ],
                order: [['created_at', 'DESC']]
            });

            // Build CSV
            const headers = ['Booking Ref', 'Student', 'Email', 'Event', 'Event Date', 'Amount', 'Status', 'Payment', 'Booked At'];
            const rows = bookings.map(b => [
                b.booking_reference,
                b.user.full_name,
                b.user.email,
                b.event.title,
                b.event.event_date,
                b.total_amount,
                b.status,
                b.payment_status,
                b.created_at.toISOString()
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=bookings-${Date.now()}.csv`);
            return res.status(200).send(csv);
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error exporting bookings.' });
        }
    }
};

module.exports = adminController;