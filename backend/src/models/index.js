const { sequelize } = require('../config/database');
const User = require('./User');
const Event = require('./Event');
const TicketType = require('./TicketType');
const Booking = require('./Booking');
const BookingItem = require('./BookingItem');
const Ticket = require('./Ticket');
const Payment = require('./Payment');
const Attendance = require('./Attendance');

// ===== Associations =====

// User ↔ Event (creator)
User.hasMany(Event, { foreignKey: 'created_by', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Event ↔ TicketType
Event.hasMany(TicketType, { foreignKey: 'event_id', as: 'ticketTypes' });
TicketType.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// User ↔ Booking
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Event ↔ Booking
Event.hasMany(Booking, { foreignKey: 'event_id', as: 'bookings' });
Booking.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// Booking ↔ BookingItem
Booking.hasMany(BookingItem, { foreignKey: 'booking_id', as: 'items' });
BookingItem.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// TicketType ↔ BookingItem
TicketType.hasMany(BookingItem, { foreignKey: 'ticket_type_id', as: 'bookingItems' });
BookingItem.belongsTo(TicketType, { foreignKey: 'ticket_type_id', as: 'ticketType' });

// BookingItem ↔ Ticket
BookingItem.hasMany(Ticket, { foreignKey: 'booking_item_id', as: 'tickets' });
Ticket.belongsTo(BookingItem, { foreignKey: 'booking_item_id', as: 'bookingItem' });

// Event ↔ Ticket
Event.hasMany(Ticket, { foreignKey: 'event_id', as: 'tickets' });
Ticket.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// User ↔ Ticket
User.hasMany(Ticket, { foreignKey: 'user_id', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Booking ↔ Payment
Booking.hasOne(Payment, { foreignKey: 'booking_id', as: 'payment' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Ticket ↔ Attendance
Ticket.hasOne(Attendance, { foreignKey: 'ticket_id', as: 'attendance' });
Attendance.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

// User ↔ Attendance (scanner)
User.hasMany(Attendance, { foreignKey: 'scanned_by', as: 'scannedTickets' });
Attendance.belongsTo(User, { foreignKey: 'scanned_by', as: 'scanner' });

module.exports = {
    sequelize,
    User,
    Event,
    TicketType,
    Booking,
    BookingItem,
    Ticket,
    Payment,
    Attendance
};