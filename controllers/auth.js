import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Signup controller
export const signup = async (req, res) => {
    try {
        // Extract user data from request body
        const { firstname, lastname, password, email, contactNumber } = req.body;

        // Validate required fields
        if (!firstname || !lastname || !password || !email || !contactNumber) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            firstname,
            lastname,
            password: hashedPassword,
            email: email.toLowerCase(), // Store email in lowercase
            contactNumber
        });

        // Save user to database
        const savedUser = await newUser.save();

        // Create JWT token (optional - you can skip this if you don't need automatic login after signup)

        // Remove password from response
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        // Send success response
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: userResponse,
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        // Handle duplicate key error (shouldn't happen with our check, but just in case)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            message: 'An error occurred during signup',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Additional utility functions you might need

// Validate contact number format (optional)
export const validateContactNumber = (contactNumber) => {
    // Example: Simple validation for 10-digit numbers
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(contactNumber);
};

