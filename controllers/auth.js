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


// Login controller
export const login = async (req, res) => {
    try {
        console.log(req.body);
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide email and password' 
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        
        // Check if user exists
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { 
                expiresIn: '3d' // 3 days, matching cookie expiration
            }
        );

        // Set cookie with token
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only use secure in production
            sameSite: 'strict', // CSRF protection
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
        });

        // Send success response (without token in body)
        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                contactNumber: user.contactNumber
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login' 
        });
    }
};

// Optional: Logout controller to clear the token
export const logout = async (req, res) => {
    try {
        const userId = req.user.userId; // Assuming you have authentication middleware
        
        // Clear the token from the database
        await User.findByIdAndUpdate(userId, { token: null });
        
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during logout' 
        });
    }
};