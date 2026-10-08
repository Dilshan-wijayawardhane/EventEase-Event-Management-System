const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const authController = {
    // Register new user
    register: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { email, password, full_name, phone } = req.body;

            // Check if user exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered.'
                });
            }

            // Hash password
            const hashedPassword = await User.hashPassword(password);

            // Create user
            const user = await User.create({
                email,
                password_hash: hashedPassword,
                full_name,
                phone,
                role: 'student'
            });

            // Generate JWT
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );

            return res.status(201).json({
                success: true,
                message: 'Registration successful!',
                data: {
                    user: user.toJSON(),
                    token
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(500).json({
                success: false,
                message: 'Registration failed. Please try again.'
            });
        }
    },

    // Login
    login: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            // Validate password
            const isValidPassword = await user.validatePassword(password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            // Generate JWT
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful!',
                data: {
                    user: user.toJSON(),
                    token
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }
    },

    // Get current user profile
    getProfile: async (req, res) => {
        try {
            const user = await User.findByPk(req.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }
            return res.status(200).json({
                success: true,
                data: user.toJSON()
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching profile.'
            });
        }
    },

    // Update profile
    updateProfile: async (req, res) => {
        try {
            const { full_name, phone } = req.body;
            const user = await User.findByPk(req.userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            await user.update({ full_name, phone });
            
            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully!',
                data: user.toJSON()
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error updating profile.'
            });
        }
    }
};

module.exports = authController;