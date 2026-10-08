const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketType = sequelize.define('TicketType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    event_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    max_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    available_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0
        }
    },
    sales_start: {
        type: DataTypes.DATE
    },
    sales_end: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'ticket_types',
    timestamps: true,
    underscored: true
});

module.exports = TicketType;