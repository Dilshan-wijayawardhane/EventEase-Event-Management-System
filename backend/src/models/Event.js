const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    banner_image: {
        type: DataTypes.STRING(500)
    },
    category: {
        type: DataTypes.STRING(100)
    },
    event_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME
    },
    venue: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    organizer: {
        type: DataTypes.STRING(255)
    },
    status: {
        type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled', 'sold_out'),
        defaultValue: 'upcoming'
    },
    max_tickets: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    created_by: {
        type: DataTypes.INTEGER
    }
}, {
    tableName: 'events',
    timestamps: true,
    underscored: true
});

module.exports = Event;