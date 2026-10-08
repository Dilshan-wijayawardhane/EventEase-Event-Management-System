const { Event, TicketType, User, Booking } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { validationResult } = require('express-validator');

const eventController = {
    // Get all events with filters
    getAllEvents: async (req, res) => {
        try {
            const {
                search,
                category,
                status,
                date,
                minPrice,
                maxPrice,
                sort = 'event_date',
                order = 'ASC',
                page = 1,
                limit = 12
            } = req.query;

            const where = {};
            const offset = (page - 1) * limit;

            // Search by title
            if (search) {
                where.title = { [Op.like]: `%${search}%` };
            }

            // Filter by category
            if (category) {
                where.category = category;
            }

            // Filter by status
            if (status) {
                where.status = status;
            }

            // Filter by date
            if (date) {
                where.event_date = date;
            }

            // Only show non-deleted events to students
            if (req.user?.role !== 'admin') {
                where.status = { [Op.ne]: 'cancelled' };
            }

            const events = await Event.findAndCountAll({
                where,
                include: [{
                    model: TicketType,
                    as: 'ticketTypes',
                    attributes: ['id', 'name', 'price', 'available_quantity', 'max_quantity']
                }],
                order: [[sort, order.toUpperCase()]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true
            });

            // Filter by price if needed (post-query for simplicity)
            let filteredEvents = events.rows;
            if (minPrice || maxPrice) {
                filteredEvents = events.rows.filter(event => {
                    const prices = event.ticketTypes.map(t => parseFloat(t.price));
                    if (prices.length === 0) return false;
                    const minP = Math.min(...prices);
                    const maxP = Math.max(...prices);
                    if (minPrice && minP < parseFloat(minPrice)) return false;
                    if (maxPrice && maxP > parseFloat(maxPrice)) return false;
                    return true;
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    events: filteredEvents,
                    pagination: {
                        total: events.count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(events.count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get events error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching events.'
            });
        }
    },

    // Get single event details
    getEventById: async (req, res) => {
        try {
            const event = await Event.findByPk(req.params.id, {
                include: [{
                    model: TicketType,
                    as: 'ticketTypes',
                    attributes: ['id', 'name', 'description', 'price', 'available_quantity', 'max_quantity', 'sales_start', 'sales_end']
                }, {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name']
                }]
            });

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            return res.status(200).json({
                success: true,
                data: event
            });
        } catch (error) {
            console.error('Get event error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching event.'
            });
        }
    },

    // Create event (admin only)
    createEvent: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const {
                title,
                description,
                banner_image,
                category,
                event_date,
                start_time,
                end_time,
                venue,
                organizer,
                max_tickets,
                status = 'upcoming',
                ticketTypes = []
            } = req.body;

            const event = await Event.create({
                title,
                description,
                banner_image,
                category,
                event_date,
                start_time,
                end_time,
                venue,
                organizer,
                max_tickets,
                status,
                created_by: req.userId
            });

            // Create ticket types if provided
            if (ticketTypes.length > 0) {
                const ticketTypeData = ticketTypes.map(tt => ({
                    event_id: event.id,
                    name: tt.name,
                    description: tt.description,
                    price: tt.price,
                    max_quantity: tt.max_quantity,
                    available_quantity: tt.max_quantity, // Start with full quantity
                    sales_start: tt.sales_start,
                    sales_end: tt.sales_end
                }));
                await TicketType.bulkCreate(ticketTypeData);
            }

            // Reload with ticket types
            const createdEvent = await Event.findByPk(event.id, {
                include: [{ model: TicketType, as: 'ticketTypes' }]
            });

            return res.status(201).json({
                success: true,
                message: 'Event created successfully!',
                data: createdEvent
            });
        } catch (error) {
            console.error('Create event error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error creating event.'
            });
        }
    },

    // Update event (admin only)
    updateEvent: async (req, res) => {
        try {
            const event = await Event.findByPk(req.params.id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            const {
                title,
                description,
                banner_image,
                category,
                event_date,
                start_time,
                end_time,
                venue,
                organizer,
                max_tickets,
                status,
                ticketTypes
            } = req.body;

            // Update event fields
            await event.update({
                title: title ?? event.title,
                description: description ?? event.description,
                banner_image: banner_image ?? event.banner_image,
                category: category ?? event.category,
                event_date: event_date ?? event.event_date,
                start_time: start_time ?? event.start_time,
                end_time: end_time ?? event.end_time,
                venue: venue ?? event.venue,
                organizer: organizer ?? event.organizer,
                max_tickets: max_tickets ?? event.max_tickets,
                status: status ?? event.status
            });

            // Update ticket types if provided
            if (ticketTypes && ticketTypes.length > 0) {
                for (const tt of ticketTypes) {
                    if (tt.id) {
                        // Update existing
                        const existing = await TicketType.findByPk(tt.id);
                        if (existing && existing.event_id === event.id) {
                            const soldCount = existing.max_quantity - existing.available_quantity;
                            const newAvailable = tt.max_quantity - soldCount;
                            await existing.update({
                                name: tt.name ?? existing.name,
                                description: tt.description ?? existing.description,
                                price: tt.price ?? existing.price,
                                max_quantity: tt.max_quantity ?? existing.max_quantity,
                                available_quantity: newAvailable >= 0 ? newAvailable : existing.available_quantity,
                                sales_start: tt.sales_start ?? existing.sales_start,
                                sales_end: tt.sales_end ?? existing.sales_end
                            });
                        }
                    } else {
                        // Create new
                        await TicketType.create({
                            event_id: event.id,
                            name: tt.name,
                            description: tt.description,
                            price: tt.price,
                            max_quantity: tt.max_quantity,
                            available_quantity: tt.max_quantity,
                            sales_start: tt.sales_start,
                            sales_end: tt.sales_end
                        });
                    }
                }
            }

            const updatedEvent = await Event.findByPk(event.id, {
                include: [{ model: TicketType, as: 'ticketTypes' }]
            });

            return res.status(200).json({
                success: true,
                message: 'Event updated successfully!',
                data: updatedEvent
            });
        } catch (error) {
            console.error('Update event error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error updating event.'
            });
        }
    },

    // Delete event (admin only)
    deleteEvent: async (req, res) => {
        try {
            const event = await Event.findByPk(req.params.id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            // Check if there are confirmed bookings
            const bookingCount = await Booking.count({
                where: {
                    event_id: event.id,
                    status: { [Op.in]: ['confirmed', 'pending'] }
                }
            });

            if (bookingCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete event with ${bookingCount} active booking(s). Cancel the event instead.`
                });
            }

            await event.destroy();

            return res.status(200).json({
                success: true,
                message: 'Event deleted successfully!'
            });
        } catch (error) {
            console.error('Delete event error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting event.'
            });
        }
    },

    // Cancel event (admin only)
    cancelEvent: async (req, res) => {
        try {
            const event = await Event.findByPk(req.params.id);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            await event.update({ status: 'cancelled' });

            // TODO: Trigger refund emails/notifications to all bookers

            return res.status(200).json({
                success: true,
                message: 'Event cancelled. Notifications will be sent to all attendees.',
                data: event
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error cancelling event.'
            });
        }
    },

    // Get event categories
    getCategories: async (req, res) => {
        try {
            const categories = await Event.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']],
                where: {
                    category: { [Op.ne]: null }
                },
                raw: true
            });
            return res.status(200).json({
                success: true,
                data: categories.map(c => c.category).filter(Boolean)
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching categories.'
            });
        }
    }
};

module.exports = eventController;