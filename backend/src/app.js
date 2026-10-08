require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentController = require('./controllers/paymentController');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ===== STRIPE WEBHOOK (MUST be before express.json) =====
app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handleWebhook
);

// ===== BODY PARSERS =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== RATE LIMITING =====
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per IP
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 auth attempts per 15 min
    message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const bookingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 booking attempts per minute
    message: { success: false, message: 'Too many booking attempts. Please slow down.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/bookings', bookingLimiter);

// ===== ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'EventEase API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }

    // Sequelize unique constraint
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== START SERVER =====
const startServer = async () => {
    try {
        await testConnection();

        // Sync DB in development
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: false });
            console.log('✅ Database synced');
        }

        const server = app.listen(PORT, () => {
            console.log('');
            console.log('🚀 ================================');
            console.log(`🚀  EventEase API is running!`);
            console.log('🚀 ================================');
            console.log(`📡  Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗  API URL:     http://localhost:${PORT}/api`);
            console.log(`💚  Health:      http://localhost:${PORT}/api/health`);
            console.log(`🌐  Frontend:    ${process.env.FRONTEND_URL}`);
            console.log('🚀 ================================');
            console.log('');
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                await sequelize.close();
                console.log('✅ Server closed. Database connection closed.');
                process.exit(0);
            });

            // Force shutdown after 10s
            setTimeout(() => {
                console.error('❌ Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;