const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = {
    // Verify JWT token
    verifyToken: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Access denied. No token provided.'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.id);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. User not found.'
                });
            }

            req.user = user;
            req.userId = user.id;
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token.'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired. Please login again.'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Authentication error.'
            });
        }
    },

    // Check if user is admin
    isAdmin: (req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
    },

    // Check if user is student
    isStudent: (req, res, next) => {
        if (req.user && req.user.role === 'student') {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Student privileges required.'
            });
        }
    },

    // Optional: Check if user owns the resource
    isOwner: (model, foreignKey = 'user_id') => {
        return async (req, res, next) => {
            try {
                const resource = await model.findByPk(req.params.id);
                if (!resource) {
                    return res.status(404).json({
                        success: false,
                        message: 'Resource not found.'
                    });
                }
                if (resource[foreignKey] !== req.userId && req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to access this resource.'
                    });
                }
                req.resource = resource;
                next();
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Error checking ownership.'
                });
            }
        };
    }
};

module.exports = auth;