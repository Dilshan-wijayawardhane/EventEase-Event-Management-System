const { sequelize } = require('../config/database');
const { Booking, BookingItem, TicketType, Ticket, Event, User, Payment } = require('../models');
const { generateTicketCode, generateQRData } = require('../utils/ticketGenerator');
const { sendBookingConfirmation } = require('./emailService');

/**
 * Creates a booking with ACID guarantees.
 * Prevents overselling via row-level locking.
 */
const createBooking = async (userId, eventId, items, paymentMethod = 'card') => {
    // Start transaction
    const transaction = await sequelize.transaction({
        isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
        // 1. Validate event exists and is bookable
        const event = await Event.findByPk(eventId, { transaction });
        if (!event) {
            throw new Error('Event not found.');
        }
        if (event.status === 'cancelled' || event.status === 'completed') {
            throw new Error('This event is no longer available for booking.');
        }
        if (event.status === 'sold_out') {
            throw new Error('This event is sold out.');
        }

        // 2. Validate user
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            throw new Error('User not found.');
        }

        // 3. Lock ticket types and check availability ATOMICALLY
        let totalAmount = 0;
        const bookingItemsData = [];

        for (const item of items) {
            // SELECT ... FOR UPDATE — locks the row for the duration of the transaction
            const ticketType = await TicketType.findByPk(item.ticketTypeId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!ticketType) {
                throw new Error(`Ticket type ${item.ticketTypeId} not found.`);
            }
            if (ticketType.event_id !== parseInt(eventId)) {
                throw new Error('Ticket type does not belong to this event.');
            }
            if (item.quantity < 1) {
                throw new Error('Quantity must be at least 1.');
            }
            if (ticketType.available_quantity < item.quantity) {
                throw new Error(
                    `Not enough tickets available for "${ticketType.name}". ` +
                    `Only ${ticketType.available_quantity} remaining.`
                );
            }

            // Check sales window
            const now = new Date();
            if (ticketType.sales_start && now < new Date(ticketType.sales_start)) {
                throw new Error(`Sales for "${ticketType.name}" have not started yet.`);
            }
            if (ticketType.sales_end && now > new Date(ticketType.sales_end)) {
                throw new Error(`Sales for "${ticketType.name}" have ended.`);
            }

            const subtotal = parseFloat(ticketType.price) * item.quantity;
            totalAmount += subtotal;

            bookingItemsData.push({
                ticket_type_id: ticketType.id,
                quantity: item.quantity,
                unit_price: ticketType.price,
                subtotal,
                ticketType // keep reference for later
            });

            // 4. Atomically decrement available quantity
            await ticketType.decrement('available_quantity', {
                by: item.quantity,
                transaction
            });
        }

        // 5. Calculate service charge (2% of total, capped)
        const serviceCharge = Math.min(totalAmount * 0.02, 50);
        const finalAmount = totalAmount + serviceCharge;

        // 6. Generate booking reference
        const bookingReference = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // 7. Create booking record
        const booking = await Booking.create({
            booking_reference: bookingReference,
            user_id: userId,
            event_id: eventId,
            total_amount: finalAmount,
            service_charge: serviceCharge,
            status: 'pending',
            payment_status: 'pending'
        }, { transaction });

        // 8. Create booking items and tickets
        const allTickets = [];

        for (const item of bookingItemsData) {
            const bookingItem = await BookingItem.create({
                booking_id: booking.id,
                ticket_type_id: item.ticket_type_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal
            }, { transaction });

            // Generate individual tickets
            for (let i = 0; i < item.quantity; i++) {
                const ticketCode = generateTicketCode(eventId, booking.id, i);
                const qrData = generateQRData(ticketCode);

                const ticket = await Ticket.create({
                    ticket_code: ticketCode,
                    booking_item_id: bookingItem.id,
                    event_id: eventId,
                    user_id: userId,
                    ticket_type_name: item.ticketType.name,
                    student_name: user.full_name,
                    qr_data: qrData,
                    status: 'active'
                }, { transaction });

                allTickets.push(ticket);
            }
        }

        // 9. Check if event is now sold out
        const remainingTickets = await TicketType.sum('available_quantity', {
            where: { event_id: eventId },
            transaction
        });
        if (remainingTickets <= 0) {
            await event.update({ status: 'sold_out' }, { transaction });
        }

        // Commit transaction
        await transaction.commit();

        // 10. Send confirmation email (outside transaction — non-critical)
        try {
            await sendBookingConfirmation(user, event, booking, allTickets);
        } catch (emailError) {
            console.error('Email send failed (non-critical):', emailError);
        }

        return {
            booking,
            tickets: allTickets,
            event,
            user
        };

    } catch (error) {
        // Rollback on ANY error
        await transaction.rollback();
        throw error;
    }
};

/**
 * Get user's bookings
 */
const getUserBookings = async (userId) => {
    return await Booking.findAll({
        where: { user_id: userId },
        include: [
            {
                model: Event,
                as: 'event',
                attributes: ['id', 'title', 'event_date', 'start_time', 'venue', 'banner_image', 'status']
            },
            {
                model: BookingItem,
                as: 'items',
                include: [{
                    model: TicketType,
                    as: 'ticketType',
                    attributes: ['id', 'name']
                }]
            }
        ],
        order: [['created_at', 'DESC']]
    });
};

/**
 * Get booking by ID with full details
 */
const getBookingById = async (bookingId, userId = null, isAdmin = false) => {
    const where = { id: bookingId };
    if (!isAdmin && userId) {
        where.user_id = userId;
    }

    const booking = await Booking.findOne({
        where,
        include: [
            { model: Event, as: 'event' },
            {
                model: BookingItem,
                as: 'items',
                include: [{ model: TicketType, as: 'ticketType' }]
            },
            { model: Payment, as: 'payment' }
        ]
    });

    if (!booking) {
        throw new Error('Booking not found.');
    }

    // Get tickets for this booking
    const tickets = await Ticket.findAll({
        include: [{
            model: BookingItem,
            as: 'bookingItem',
            where: { booking_id: bookingId }
        }]
    });

    return { ...booking.toJSON(), tickets };
};

/**
 * Cancel a booking
 */
const cancelBooking = async (bookingId, userId) => {
    const transaction = await sequelize.transaction();
    try {
        const booking = await Booking.findOne({
            where: { id: bookingId, user_id: userId },
            include: [{ model: BookingItem, as: 'items' }],
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!booking) throw new Error('Booking not found.');
        if (booking.status === 'cancelled') throw new Error('Booking is already cancelled.');
        if (booking.status === 'failed') throw new Error('Cannot cancel a failed booking.');

        // Check event date — don't allow cancellation within 24h of event
        const event = await Event.findByPk(booking.event_id, { transaction });
        const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
        const hoursUntilEvent = (eventDateTime - new Date()) / (1000 * 60 * 60);

        if (hoursUntilEvent < 24) {
            throw new Error('Cannot cancel booking within 24 hours of the event.');
        }

        // Restore ticket quantities
        for (const item of booking.items) {
            await TicketType.increment('available_quantity', {
                by: item.quantity,
                where: { id: item.ticket_type_id },
                transaction
            });
        }

        // Mark tickets cancelled
        await Ticket.update(
            { status: 'cancelled' },
            {
                where: { user_id: userId, event_id: booking.event_id, status: 'active' },
                transaction
            }
        );

        // Update booking
        await booking.update({
            status: 'cancelled',
            payment_status: 'refunded'
        }, { transaction });

        await transaction.commit();
        return booking;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = {
    createBooking,
    getUserBookings,
    getBookingById,
    cancelBooking
};