import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

const router = express.Router();

// Middleware to validate JWT token
export const validateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'studyflow_secret_key');
    
    // Handle different ID field names that might be in the token
    if (!verified.id) {
      // Check for alternative ID fields
      if (verified.userId) {
        verified.id = verified.userId;
        console.log('Using userId as id in token:', verified.userId);
      } else if (verified._id) {
        verified.id = verified._id;
        console.log('Using _id as id in token:', verified._id);
      } else {
        console.error('JWT token missing all known user ID fields:', verified);
        return res.status(401).json({ error: 'Invalid token: Missing user ID' });
      }
    }
    
    req.user = verified;
    next();
  } catch (error) {
    console.error('Token validation error:', error.message);
    res.status(401).json({ error: 'Invalid token: ' + error.message });
  }
};

// User registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate JWT token with all possible id fields for maximum compatibility
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        _id: user._id.toString(),
        userId: user._id.toString(),
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET || 'studyflow_secret_key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token with all possible id fields for maximum compatibility
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        _id: user._id.toString(),
        userId: user._id.toString(),
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET || 'studyflow_secret_key',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user info
router.get('/me', validateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
