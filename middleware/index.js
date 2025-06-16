import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        // console.log("token value",token);
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'No token provided' 
            });
        }

        // Verify token
        // console.log("secret value is:",process.env.JWT_SECRET);
        const decoded = jwt.verify(token, process.env.JWT_SECRET );
        // console.log('decoded value',decoded);
        // Find user and check if token matches
        const user = await User.findOne({ 
            _id: decoded.userId, 
        });
        console.log("user is in middle ware",user);
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token' 
            });
        }

        req.user = decoded;
        req.token = token;
        
        console.log("middleware:",req.user,req.token);
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ 
            success: false,
            message: 'Please authenticate' 
        });
    }
};