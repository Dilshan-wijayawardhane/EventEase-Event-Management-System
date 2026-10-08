const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticket_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    booking_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    event_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ticket_type_name: {
        type: DataTypes.STRING(100)
    },
    student_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    qr_data: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('active', 'used', 'cancelled', 'expired'),
        defaultValue: 'active'
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'tickets',
    timestamps: true,
    underscored: true,
    createdAt: 'issued_at',
    updatedAt: 'updated_at'
});

module.exports = Ticket;