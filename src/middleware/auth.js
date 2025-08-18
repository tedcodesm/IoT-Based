import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
dotenv.config();

export const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'Not authorized, token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    req.user = await User.findById(decoded.userId).select('-password');
    console.log("User found:", req.user);

    if (!req.user) return res.status(401).json({ message: 'Invalid token' });

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token failed' });
  }
};


export const admin = (req, res, next) => {
  console.log("Role check:", req.user?.role);

  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      message: 'Access denied: Admin privileges required',
    });
  }
};


