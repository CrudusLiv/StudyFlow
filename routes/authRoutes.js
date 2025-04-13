import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validateToken } from '../middleware/auth.js';

const router = express.Router();

// Google OAuth callback route
router.post('/google-auth', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find or create the user
    let user = await User.findOne({ email });
    
    if (!user) {
      // Generate a unique key for new users
      const uniqueKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Create new user with the unique key
      user = new User({
        email,
        name: name || email.split('@')[0],
        profilePicture: picture || null,
        uniqueKey // Add this field
      });
      
      await user.save();
      console.log(`Created new Google user with uniqueKey: ${uniqueKey}`);
    } else if (!user.uniqueKey) {
      // If existing user doesn't have a uniqueKey, add one
      user.uniqueKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await user.save();
      console.log(`Added uniqueKey to existing Google user: ${user.uniqueKey}`);
    }
    
    // Generate JWT token with uniqueKey included
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        userKey: user.uniqueKey // Include uniqueKey in the token
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      userKey: user.uniqueKey, // Include uniqueKey in the response
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error in Google auth:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Microsoft OAuth callback route
router.post('/microsoft-auth', async (req, res) => {
  try {
    const { email, name, picture } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find or create the user
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({
        email,
        name: name || email.split('@')[0],
        profilePicture: picture || null
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error in Microsoft auth:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Verify token validity
router.get('/verify-token', validateToken, (req, res) => {
  res.status(200).json({ 
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

export default router;
