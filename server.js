import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import path, { dirname, join } from 'path';
import { google } from 'googleapis';
import pdfParse from 'pdf-parse';
import { Mistral } from '@mistralai/mistralai';
import { fileURLToPath } from 'url';
import { parseAIResponse, withRetry } from './utils/aiResponseUtils.js';
import { buildEnhancedPrompt } from './utils/promptBuilder.js';
import { tokenToString } from 'typescript';
import { processDocuments } from './utils/pdfProcessor.js';
import { processPDF } from './utils/pdfProcessor.js';
import { extractAssignments, extractDates, generateSchedule } from './utils/textProcessing.js';
import { sanitizePdfData, validatePdfDocumentData } from './utils/pdfDataHandler.js';
import User from './models/User.js';
import TaskSchedule from './models/TaskSchedule.js';
import ClassSchedule from './models/ClassSchedule.js';
import UserPreferences from './models/UserPreferences.js';
import PDFDocument from './models/PDFDocument.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import pdfDocumentRoutes from './routes/pdfdocumentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const DEFAULT_PORT = 5000;
const PORT = process.env.PORT || DEFAULT_PORT;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({
  apiKey: apiKey,
  timeout: 30000, // 30 second timeout
  maxRetries: 3   // Allow 3 retries
});

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  const fallbackSecret = 'default_secret_for_development';
  console.warn(`⚠️ JWT_SECRET not set in environment! Using fallback secret. This is NOT secure for production.`);
  process.env.JWT_SECRET = fallbackSecret;
}

// Verify JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set! Using a fallback for development.');
  process.env.JWT_SECRET = 'development_fallback_secret_do_not_use_in_production';
}

// Middleware setup
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Increase URL encoded payload limit too
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,  // Add this line
  useCreateIndex: true      // Add this line for better index handling
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// User schema and model
const userSchema = new mongoose.Schema({
  uniqueKey: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substring(2) + Date.now().toString(36)
  },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  loginHistory: [{
    timestamp: Date,
    action: String // 'login' or 'logout'
  }],
  sessionDurations: [{
    start: Date,
    end: Date,
    duration: Number // in minutes
  }],
  profilePicture: { type: String } // Add this line
});

// Task schema and model
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
  category: { type: String, enum: ['study', 'break', 'exercise', 'other'], required: true },
  completed: { type: Boolean, default: false },
  pdfPath: { type: String },
});

// Schedule schema and model
const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
});

// Add new schema for AI-generated schedule
const aiScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userKey: { type: String, required: true, index: true },
  weeklySchedule: [{
    week: { type: String, required: true },
    days: [{
      day: { type: String, required: true },
      date: { type: String, required: true },
      tasks: [{
        time: { type: String, required: true },
        title: { type: String, required: true },
        details: { type: String, default: '' },
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed'],
          default: 'pending'
        },
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium'
        },
        category: {
          type: String,
          default: 'study'
        },
        pdfReference: {
          page: { type: String, default: '' },
          quote: { type: String, default: '' }
        }
      }]
    }]
  }],
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // Add strict: false to prevent validation errors on extra fields

const AISchedule = mongoose.model('AISchedule', aiScheduleSchema);

// Add new schema for university schedule
const universityScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weeklySchedule: [{
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    classes: [{
      courseName: { type: String, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      location: { type: String, required: true },
    }]
  }]
});

const checkAdminRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking admin role' });
  }
};

// Add validation to ensure time format
universityScheduleSchema.path('weeklySchedule').schema.path('classes').schema.path('startTime')
  .validate(function(v) {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
  }, 'Invalid time format. Use HH:MM');

universityScheduleSchema.path('weeklySchedule').schema.path('classes').schema.path('endTime')
  .validate(function(v) {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
  }, 'Invalid time format. Use HH:MM');

const UniversitySchedule = mongoose.model('UniversitySchedule', universityScheduleSchema);

// Add Assignment schema
const assignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

// Add new schema for AI-generated schedule
// Add Reminder schema after Assignment schema
const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  title: String,
  message: String,
  dueDate: Date,
  reminderDate: Date,
  isRead: { type: Boolean, default: false }
});

const Reminder = mongoose.model('Reminder', reminderSchema);

// Passport configuration
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI,
  passReqToCallback: true
}, async (request, accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({
        email: profile.emails[0].value,
        name: profile.displayName,
        uniqueKey: Math.random().toString(36).substring(2) + Date.now().toString(36),
      });
      await user.save();
    }
    // Return the Mongoose document directly
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to authenticate users using JWT
const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // If userKey is missing, fetch the user record to get it
    if (!decoded.userKey) {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      decoded.userKey = user.uniqueKey;
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Add tracking middleware
const trackActivity = async (req, res, next) => {
  if (req.user) {
    const startTime = new Date();
    res.on('finish', async () => {
      try {
        const user = await User.findById(req.user.userId);
        if (user) {
          const duration = Math.round((new Date() - startTime) / 1000 / 60); // in minutes
          user.sessionDurations.push({
            start: startTime,
            end: new Date(),
            duration
          });
          await user.save();
        }
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    });
  }
  next();
};

// Signup route
app.post('/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueKey = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'user',
      uniqueKey
    });

    await user.save();

    // Update AISchedule schema to include userKey reference
    const token = jwt.sign({
      userId: user._id,
      userKey: user.uniqueKey
    }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        uniqueKey: user.uniqueKey
      }
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id, userKey: user.uniqueKey }, JWT_SECRET, { expiresIn: '1h' });
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      action: 'login'
    });
    await user.save();
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    // Include role in JWT token
    const token = jwt.sign({ 
      userId: user._id, 
      userKey: user.uniqueKey,
      role: user.role // Add role to JWT token
    }, JWT_SECRET, { expiresIn: '1h' });
    
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      action: 'login'
    });
    await user.save();
    res.json({ 
      token: token, 
      userKey: user.uniqueKey, // Send uniqueKey instead of _id
      role: user.role 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Google authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], accessType: 'offline', prompt: 'consent' }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/access?error=auth_failed' }), async (req, res) => {
  try {
    // Get or create the user
    let user = await User.findOne({ email: req.user.email });
    if (!user) {
      user = new User({
        email: req.user.email,
        name: req.user._json.name,
        uniqueKey: Math.random().toString(36).substring(2) + Date.now().toString(36),
      });
      await user.save();
    }

    // Generate JWT token with user info
    const token = jwt.sign(
      {
        userId: user._id,
        userKey: user.uniqueKey,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(token)
    // Set tokens in redirect URL
    const redirectUrl = new URL('http://localhost:5173/');
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('userKey', user.uniqueKey);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('http://localhost:5173/access?error=auth_failed');
  }
});

// Update Google auth routes
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/access?error=auth_failed' }),
  async (req, res) => {
    try {
      const user = req.user;
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          userKey: user.uniqueKey,
          email: user.email,
          role: user.role || 'user'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store user role in token
      const redirectUrl = new URL(process.env.CORS_ORIGIN);
      redirectUrl.pathname = '/access'; // explicitly set the path
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('userKey', user.uniqueKey);
      redirectUrl.searchParams.set('userRole', user.role || 'user');

      console.log('Redirecting to:', redirectUrl.toString());
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${process.env.CORS_ORIGIN}/access?error=auth_failed`);
    }
  }
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/access?error=auth_failed' }),
  async (req, res) => {
    try {
      if (!req.user) {
        throw new Error('No user data received');
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        throw new Error('User not found in database');
      }

      // Generate JWT token with complete user info
      const token = jwt.sign(
        {
          userId: user._id,
          userKey: user.uniqueKey,
          email: user.email,
          role: user.role || 'user'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Use environment variable for redirect
      const clientUrl = new URL('/access', process.env.CORS_ORIGIN);
      clientUrl.searchParams.set('token', token);
      clientUrl.searchParams.set('userKey', user.uniqueKey);
      clientUrl.searchParams.set('userRole', user.role || 'user');

      console.log('Redirecting to:', clientUrl.toString());
      res.redirect(303, clientUrl.toString());
    } catch (error) {
      console.error('Auth callback error:', error);
      const errorUrl = new URL('/access', process.env.CORS_ORIGIN);
      errorUrl.searchParams.set('error', 'auth_failed');
      res.redirect(303, errorUrl.toString());
    }
  }
);

// Fix Google auth callback route to use client-side URL for redirects
app.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/access?error=auth_failed` 
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        throw new Error('No user data received');
      }

      // Get user data
      const user = req.user;

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          userKey: user.uniqueKey,
          email: user.email,
          role: user.role || 'user'
        },
        JWT_SECRET,
        { expiresIn: '24h' } // Extend token expiration
      );

      // Create redirect URL with auth data - use the client URL, not the server URL
      const redirectUrl = new URL('/access', process.env.CORS_ORIGIN || 'http://localhost:5173');
      redirectUrl.searchParams.append('token', token);
      redirectUrl.searchParams.append('userKey', user.uniqueKey);
      redirectUrl.searchParams.append('userRole', user.role || 'user');

      console.log('Redirecting to:', redirectUrl.toString());

      // Use 302 Found for better redirect behavior
      res.redirect(302, redirectUrl.toString());
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(302, `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/access?error=auth_failed`);
    }
  }
);

// Add Microsoft authentication endpoint
app.post('/auth/microsoft', async (req, res) => {
  try {
    const { token, email, name } = req.body;

    // Verify the Firebase token
    const decoded = await admin.auth().verifyIdToken(token);

    if (!decoded.email) {
      return res.status(400).json({ error: 'No email provided' });
    }

    // Find or create user
    let user = await User.findOne({ email: decoded.email });
    if (!user) {
      const uniqueKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
      user = new User({
        email: decoded.email,
        name: name || decoded.name,
        uniqueKey,
        role: 'user'
      });
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        userKey: user.uniqueKey,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      userKey: user.uniqueKey,
      role: user.role
    });
  } catch (error) {
    console.error('Microsoft auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/auth/microsoft', async (req, res) => {
  try {
    console.log('Received Microsoft auth request:', req.body.email);
    const { email, name } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name,
        uniqueKey: Math.random().toString(36).substring(2) + Date.now().toString(36),
        role: 'user'
      });
      await user.save();
      console.log('Created new user:', user.email);
    }

    const token = jwt.sign(
      {
        userId: user._id,
        userKey: user.uniqueKey,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Sending auth response for:', user.email);
    res.json({
      token,
      userKey: user.uniqueKey,
      role: user.role
    });
  } catch (error) {
    console.error('Microsoft auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ...existing code...

app.post('/auth/microsoft', async (req, res) => {
  try {
    console.log('Received Microsoft auth request:', req.body.email);
    const { email, name } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      const uniqueKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
      user = new User({
        email,
        name,
        uniqueKey, // Ensure uniqueKey is set
        role: 'user'
      });
      await user.save();
      console.log('Created new user with uniqueKey:', uniqueKey);
    } else if (!user.uniqueKey) {
      // If user exists but doesn't have a uniqueKey, add one
      user.uniqueKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await user.save();
      console.log('Added uniqueKey to existing user:', user.uniqueKey);
    }

    // Generate token with the uniqueKey included
    const token = jwt.sign(
      {
        userId: user._id,
        userKey: user.uniqueKey, // Make sure userKey is included
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Sending auth response for:', user.email);
    res.json({
      token,
      userKey: user.uniqueKey, // Send uniqueKey in response
      role: user.role
    });
  } catch (error) {
    console.error('Microsoft auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ...existing code...

// Endpoint to fetch the MISTRAL_API_KEY
app.get('/api/get-api-key', authenticateJWT, (req, res) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MISTRAL_API_KEY is not set in the environment variables.' });
  }
  res.json({ apiKey });
});


// Get user data
app.get('/api/user', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User ${user._id} has role: ${user.role || 'user'}`);
    
    res.json({
      name: user.name,
      email: user.email,
      role: user.role || 'user' // Ensure role is included
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});


// Create a new task
app.post('/tasks', authenticateJWT, upload.single('pdf'), async (req, res) => {
  const { title, duration, priority, category } = req.body;
  const userId = req.user.userId;
  const pdfPath = req.file ? req.file.path : null;
  try {
    const task = new Task({ userId, title, duration, priority, category, pdfPath });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: 'Error creating task' });
  }
});

// Get all tasks for a user
app.get('/tasks', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  try {
    const tasks = await Task.find({ userId });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ error: 'Error fetching tasks' });
  }
});

// Update a task
app.put('/tasks/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { title, duration, priority, category, completed } = req.body;
  try {
    const task = await Task.findByIdAndUpdate(id, { title, duration, priority, category, completed }, { new: true });
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: 'Error updating task' });
  }
});

// Delete a task
app.delete('/tasks/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await Task.findByIdAndDelete(id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting task' });
  }
});

// Create a new schedule
app.post('/schedules', authenticateJWT, async (req, res) => {
  const { date, tasks } = req.body;
  const userId = req.user.userId;
  try {
    const schedule = new Schedule({ userId, date, tasks });
    await schedule.save();
    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ error: 'Error creating schedule' });
  }
});

// Get all schedules for a user
app.get('/schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  try {
    const schedules = await Schedule.find({ userId }).populate('tasks');
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(400).json({ error: 'Error fetching schedules' });
  }
});

// Update a schedule
app.put('/schedules/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { date, tasks } = req.body;
  try {
    const schedule = await Schedule.findByIdAndUpdate(id, { date, tasks }, { new: true }).populate('tasks');
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ error: 'Error updating schedule' });
  }
});

// Delete a schedule
app.delete('/schedules/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await Schedule.findByIdAndDelete(id);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting schedule' });
  }
});

// AI PDF reading route using memoryStorage
// To disable authentication for testing, comment out 'authenticateJWT'
app.post('/ai/read-pdf', /* authenticateJWT, */ upload.single('pdf'), async (req, res) => {
  console.log('Received /ai/read-pdf request');
  try {
    let fileBuffer;
    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else if (req.body && req.body instanceof Buffer) {
      fileBuffer = req.body;
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const pdfData = await pdfParse(fileBuffer);
    const pdfText = pdfData.text;
    console.log('Extracted text from PDF:', pdfText);
    res.json({ pdfText });
  } catch (error) {
    console.error('Error reading PDF:', error.message);
    res.status(500).json({ error: 'Error reading PDF', details: error.message });
  }
});

// Update the generate schedule route to fix PDF document handling
app.post('/ai/generate-schedule', authenticateJWT, upload.array('pdfFiles'), async (req, res) => {
  try {
    // Process PDF files
    const userId = req.user.id;
    
    // Check if we have files to process
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No PDF files uploaded' 
      });
    }
    
    console.log(`Processing ${req.files.length} PDFs for schedule generation`);
    
    // Generate schedule using the files
    try {
      // Process each file
      const processedFiles = [];
      for (const file of req.files) {
        try {
          const result = await processPDF(file.buffer);
          processedFiles.push({
            fileName: file.originalname,
            data: result
          });
        } catch (fileError) {
          console.error(`Error processing ${file.originalname}:`, fileError);
        }
      }
      
      if (processedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Failed to process any of the uploaded files',
          schedule: []
        });
      }
      
      // Extract assignment data from processed files
      const allAssignments = [];
      const allDates = [];
      
      processedFiles.forEach(file => {
        if (file.data.assignments && Array.isArray(file.data.assignments)) {
          allAssignments.push(...file.data.assignments);
        }
        
        if (file.data.dates && Array.isArray(file.data.dates)) {
          allDates.push(...file.data.dates);
        }
      });
      
      // Generate schedule
      const metadata = {
        courseCode: processedFiles[0]?.data.courseCode || '',
        instructor: processedFiles[0]?.data.instructor || '',
        semester: processedFiles[0]?.data.semester || ''
      };
      
      // Call the schedule generation function
      const schedule = generateSchedule(allAssignments, allDates, userId, metadata);
      
      // Check if schedule was created successfully
      if (!schedule || schedule.length === 0) {
        return res.json({
          success: false,
          message: 'No schedulable assignments found in documents. Check if due dates are valid.',
          schedule: []
        });
      }
      
      // Save generated schedule to associated PDF documents
      const fileNames = req.files.map(file => file.originalname);
      const documents = await PDFDocument.find({
        userId: req.user.id,
        originalName: { $in: fileNames }
      });
      
      // Update each document with proper error handling
      for (const doc of documents) {
        try {
          doc.generatedSchedule = schedule;
          await doc.save();
        } catch (saveError) {
          console.error('Error saving schedule to document:', doc.title, saveError);
        }
      }

      return res.json({ 
        success: true, 
        schedule,
        message: `Successfully generated schedule with ${schedule.length} items`
      });
    } catch (scheduleError) {
      console.error('Error generating schedule:', scheduleError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate schedule',
        details: scheduleError.message,
        schedule: []
      });
    }
  } catch (error) {
    console.error('Error in schedule generation endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      schedule: []
    });
  }
});

// Add new routes for AI schedule
app.post('/ai/save-schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const userKey = req.user.userKey;
  const scheduleData = req.body;

  try {
    if (!scheduleData?.weeklySchedule || !Array.isArray(scheduleData.weeklySchedule)) {
      throw new Error('Invalid schedule format');
    }

    // Transform and validate schedule data
    const weeklySchedule = scheduleData.weeklySchedule.map((week, weekIndex) => {
      const cleanWeek = {
        week: week.week || `Week ${weekIndex + 1}`,
        days: Array(7).fill(null).map((_, dayIndex) => {
          const existingDay = week.days?.[dayIndex] || {};
          const cleanDay = {
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
            date: existingDay.date || new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            tasks: []
          };

          if (Array.isArray(existingDay.tasks)) {
            cleanDay.tasks = existingDay.tasks
              .filter(task => task && task.title && task.time)
              .map(task => ({
                time: task.time || '09:00 - 10:00',
                title: task.title || 'Untitled Task',
                details: task.details || '',
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                category: task.category || 'study',
                pdfReference: {
                  page: task.pdfReference?.page || '',
                  quote: task.pdfReference?.quote || ''
                }
              }));
          }

          return cleanDay;
        })
      };
      return cleanWeek;
    });

    // Use findOneAndUpdate with clean data
    const result = await AISchedule.findOneAndUpdate(
      { userId, userKey },
      { $set: { weeklySchedule } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ weeklySchedule: result.weeklySchedule });
  } catch (error) {
    console.error('Error saving AI schedule:', error);
    res.status(500).json({
      error: 'Error saving schedule',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/ai/get-schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const userKey = req.user.userKey; // Add this line

  try {
    console.log('Fetching schedule for user:', userId);
    const schedule = await AISchedule.findOne({ userId, userKey }); // Add userKey to query
    console.log('Retrieved schedule:', schedule);
    res.json(schedule || { weeklySchedule: [] });
  } catch (error) {
    console.error('Error fetching AI schedule:', error);
    res.status(500).json({ error: 'Error fetching schedule', details: error.message });
  }
});

// Add routes for university schedule
app.post('/university-schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const { weeklySchedule } = req.body;

  try {
    // Validate weeklySchedule structure
    if (!Array.isArray(weeklySchedule)) {
      return res.status(400).json({ error: 'Invalid schedule format' });
    }

    // Validate each day's data
    const isValidSchedule = weeklySchedule.every(day =>
      day.day && Array.isArray(day.classes) &&
      day.classes.every(cls =>
        cls.courseName &&
        cls.startTime &&
        cls.endTime &&
        cls.location
      )
    );

    if (!isValidSchedule) {
      return res.status(400).json({ error: 'Invalid schedule data format' });
    }

    const result = await UniversitySchedule.findOneAndUpdate(
      { userId },
      { weeklySchedule },
      { new: true, upsert: true }
    );

    res.json({ weeklySchedule: result.weeklySchedule });
  } catch (error) {
    console.error('Error saving university schedule:', error);
    res.status(500).json({ error: 'Error saving university schedule' });
  }
});

app.get('/university-schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  try {
    const schedule = await UniversitySchedule.findOne({ userId });
    // Ensure response matches APIResponse interface
    res.json({
      weeklySchedule: schedule?.weeklySchedule || []
    });
  } catch (error) {
    console.error('Error fetching university schedule:', error);
    res.status(500).json({ error: 'Error fetching university schedule' });
  }
});

// Add assignment routes
app.get('/assignments', authenticateJWT, async (req, res) => {
  try {
    const assignments = await Assignment.find({ userId: req.user.userId });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching assignments' });
  }
});

app.post('/assignments', authenticateJWT, async (req, res) => {
  try {
    const assignment = new Assignment({
      ...req.body,
      userId: req.user.userId
    });
    await assignment.save();

    // Create reminders for the assignment based on due date proximity
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    
    // Create a reminder 2 weeks before due date (if applicable)
    const twoWeeksBefore = new Date(dueDate);
    twoWeeksBefore.setDate(dueDate.getDate() - 14);
    
    if (twoWeeksBefore > now) {
      // Create a reminder for 2 weeks before deadline
      await new Reminder({
        userId: req.user.userId,
        assignmentId: assignment._id,
        title: `Reminder: ${assignment.title} due in 2 weeks`,
        message: `Your assignment "${assignment.title}" is due on ${dueDate.toLocaleDateString()}`,
        dueDate: assignment.dueDate,
        reminderDate: twoWeeksBefore,
        isRead: false
      }).save();
    }
    
    // Create an immediate reminder if due date is coming soon
    if (dueDate > now && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      const dayText = daysDiff === 1 ? 'tomorrow' : 
                     daysDiff === 0 ? 'today' :
                     `in ${daysDiff} days`;
      
      await new Reminder({
        userId: req.user.userId,
        assignmentId: assignment._id,
        title: `Due Soon: ${assignment.title}`,
        message: `Your assignment "${assignment.title}" is due ${dayText} (${dueDate.toLocaleDateString()})`,
        dueDate: assignment.dueDate,
        reminderDate: now,
        isRead: false
      }).save();
    }
    
    // Create planning reminder if due date is more than 3 days away
    if (dueDate > new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)) {
      const planningDate = new Date(now.getTime() + Math.ceil((dueDate - now) / (2 * 24 * 60 * 60 * 1000)));
      
      await new Reminder({
        userId: req.user.userId,
        assignmentId: assignment._id,
        title: `Plan Ahead: ${assignment.title}`,
        message: `Start working on "${assignment.title}" which is due on ${dueDate.toLocaleDateString()}`,
        dueDate: assignment.dueDate,
        reminderDate: planningDate,
        isRead: false
      }).save();
    }

    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Error creating assignment' });
  }
});

app.put('/assignments/:id', authenticateJWT, async (req, res) => {
  try {
    const assignment = await Assignment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Error updating assignment' });
  }
});

// Add delete assignment endpoint
app.delete('/assignments/:id', authenticateJWT, async (req, res) => {
  try {
    // First find the assignment to ensure it exists and belongs to the requesting user
    const assignment = await Assignment.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!assignment) { 
      return res.status(404).json({ error: 'Assignment not found or unauthorized' });
    }

    // Delete the assignment
    await Assignment.findByIdAndDelete(req.params.id);

    // Also delete any associated reminders
    await Reminder.deleteMany({ assignmentId: req.params.id });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Error deleting assignment' });
  } 
});

// Add reminder routes
app.get('/api/reminders', authenticateJWT, async (req, res) => {
  try {
    // Get both system reminders and upcoming assignments
    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);
    
    // Find existing reminders that are due and not read
    const systemReminders = await Reminder.find({
      userId: req.user.userId,
      reminderDate: { $lte: now },
      isRead: false
    }).populate('assignmentId');
    
    // Find assignments due within a week that should show as reminders
    const upcomingAssignments = await Assignment.find({
      userId: req.user.userId,
      dueDate: { $gte: now, $lte: oneWeekFromNow },
      completed: false
    });
    
    // Convert upcoming assignments to virtual reminders if they don't have active reminders
    const existingReminderAssignmentIds = new Set(
      systemReminders
        .filter(r => r.assignmentId && typeof r.assignmentId !== 'string')
        .map(r => r.assignmentId._id.toString())
    );
    
    // Create virtual reminders for assignments without active reminders
    const virtualReminders = upcomingAssignments
      .filter(a => !existingReminderAssignmentIds.has(a._id.toString()))
      .map(assignment => ({
        _id: `virtual-${assignment._id}`,
        assignmentId: assignment,
        title: `Due Soon: ${assignment.title}`,
        message: `This assignment is due soon - make sure to complete it on time!`,
        dueDate: assignment.dueDate,
        reminderDate: now,
        isRead: false,
        isVirtual: true
      }));
    
    // Combine both types of reminders
    const allReminders = [...systemReminders, ...virtualReminders];
    
    res.json(allReminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Error fetching reminders' });
  }
});

app.put('/api/reminders/:id/mark-read', authenticateJWT, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: 'Error marking reminder as read' });
  }
});

// Add this route for testing purposes
app.post('/api/test/create-reminder', authenticateJWT, async (req, res) => {
  try {
    const testReminder = new Reminder({
      userId: req.user.userId,
      assignmentId: req.body.assignmentId || req.user.userId, // Using userId as a fallback
      title: 'Test Reminder',
      message: 'This is a test reminder to verify functionality',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      reminderDate: new Date(),
      isRead: false
    });
    await testReminder.save();
    res.status(201).json(testReminder);
  } catch (error) {
    console.error('Error creating test reminder:', error);
    res.status(500).json({ error: 'Failed to create test reminder' });
  }
});

// Add this after the assignments endpoints
// Endpoint to check for approaching assignments and create reminders
app.get('/api/check-upcoming-assignments', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);

    // Find assignments due within a week that aren't completed
    const upcomingAssignments = await Assignment.find({
      userId,
      dueDate: { $gte: now, $lte: oneWeekFromNow },
      completed: false
    });

    const newReminders = [];

    // For each upcoming assignment, check if we need to create a reminder
    for (const assignment of upcomingAssignments) {
      // Check if we already have a recent reminder for this assignment
      const existingReminder = await Reminder.findOne({ 
        userId, 
        assignmentId: assignment._id, 
        reminderDate: { $gte: new Date(now - 24 * 60 * 60 * 1000) } // In the last 24 hours
      });
      
      if (!existingReminder) {
        const dueDate = new Date(assignment.dueDate);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        const dayText = daysUntilDue === 1 ? 'tomorrow' : 
                        daysUntilDue === 0 ? 'today' : 
                        `in ${daysUntilDue} days`;
        
        const reminder = new Reminder({
          userId,
          assignmentId: assignment._id,
          title: `Due Soon: ${assignment.title}`,
          message: `Your assignment "${assignment.title}" is due ${dayText} (${dueDate.toLocaleDateString()})`,
          dueDate: assignment.dueDate,
          reminderDate: now,
          isRead: false
        });
        
        await reminder.save();
        newReminders.push(reminder);
      }
    }

    res.json({
      checked: upcomingAssignments.length,
      created: newReminders.length,
      reminders: newReminders
    });
  } catch (error) {
    console.error('Error checking upcoming assignments:', error);
    res.status(500).json({ error: 'Error checking upcoming assignments' });
  }
});

// Add endpoint to create a new reminder
app.post('/api/reminders', authenticateJWT, async (req, res) => {
  try {
    const { assignmentId, title, message, dueDate, reminderDate } = req.body;
    
    // Validate required fields
    if (!assignmentId || !title || !message || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new reminder
    const reminder = new Reminder({
      userId: req.user.userId,
      assignmentId,
      title,
      message,
      dueDate,
      reminderDate: reminderDate || new Date(),
      isRead: false
    });

    await reminder.save();
    
    // Return the created reminder
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Error creating reminder' });
  }
});

// Add admin routes
app.get('/api/admin/users', authenticateJWT, checkAdminRole, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.put('/api/admin/users/:id', authenticateJWT, checkAdminRole, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error updating user' });
  }
});

app.delete('/api/admin/users/:id', authenticateJWT, checkAdminRole, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});

app.get('/api/admin/analytics', authenticateJWT, checkAdminRole, async (req, res) => {
  try {
    const users = await User.find();
    const analytics = {
      userCount: users.length, // Change to userCount for frontend compatibility
      activeToday: users.filter(u => 
        u.lastLogin && u.lastLogin > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      averageSessionDuration: users.reduce((acc, user) => {
        const userAvg = user.sessionDurations?.reduce((sum, session) => 
          sum + (session.duration || 0), 0) / (user.sessionDurations?.length || 1);
        return acc + (userAvg || 0);
      }, 0) / (users.length || 1) || 0, // Add fallback to 0
      userData: users.map(u => ({ // Change to userData for frontend compatibility
        _id: u._id,
        name: u.name || 'Unknown User',
        email: u.email || 'No Email',
        role: u.role || 'user',
        lastLogin: u.updatedAt || null,
        totalSessions: u.sessionDurations?.length || 0,
        averageSessionDuration: u.sessionDurations?.reduce((acc, session) =>
          acc + (session.duration || 0), 0) / (u.sessionDurations?.length || 1) || 0
      }))
    };

    console.log('Sending analytics data:', { 
      userCount: analytics.userCount,
      activeToday: analytics.activeToday,
      userData: analytics.userData.length > 0 ? analytics.userData[0] : 'No users'
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error fetching analytics' });
  }
});

// Add user profile routes
app.get('/api/user/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({
      name: user.name,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture // Make sure this is included
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

app.put('/api/user/profile', authenticateJWT, async (req, res) => {
  try {
    const updates = {
      name: req.body.name,
      email: req.body.email,
      username: req.body.username
    };
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    );
    res.json({
      name: user.name,
      email: user.email,
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

app.put('/api/user/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating password' });
  }
});

// Add multer middleware for file uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const diskUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF files are allowed'));
  }
});

// Add this route to handle document uploads
app.post('/api/upload-documents', authenticateJWT, diskUpload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const userId = req.user.id;
    const filePaths = req.files.map(file => file.path);

    // Process the documents and generate a schedule
    const schedule = await processDocuments(filePaths, userId);

    // Return the generated schedule
    res.json({ weeklySchedule: schedule });
  } catch (error) {
    console.error('Error processing uploaded documents:', error);
    res.status(500).json({ error: 'Failed to process documents' });
  }
});

// Create uploads directory if it doesn't exist
const uploadDir = join(__dirname, 'uploads', 'profile-pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Please upload an image file'));
    }
    cb(null, true);
  }
});

// Profile picture endpoints
app.post('/api/user/profile-picture', authenticateJWT, profileUpload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPath = join(__dirname, user.profilePicture);
      try {
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
      }
    }

    // Update relative path in database
    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    user.profilePicture = profilePictureUrl;
    await user.save();

    res.json({ profilePictureUrl });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Error uploading profile picture' });
  }
});

app.delete('/api/user/profile-picture', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.profilePicture) {
      const picturePath = join(__dirname, user.profilePicture);
      try {
        if (fs.existsSync(picturePath)) {
          fs.unlinkSync(picturePath);
        }
      } catch (error) {
        console.error('Error deleting profile picture file:', error);
      }
      user.profilePicture = null;
      await user.save();
    }

    res.json({ message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Error removing profile picture:', error);
    res.status(500).json({ error: 'Error removing profile picture' });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Update the PDF parsing endpoint
app.post('/api/parse-pdf', 
  authenticateJWT, 
  upload.single('file'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('Processing PDF file:', req.file.originalname);
      const result = await processPDF(req.file.buffer);
      
      // Ensure we have a valid user ID
      const userId = req.user.id || req.user.userId;
      if (!userId) {
        return res.status(400).json({ error: 'User ID not found in token' });
      }

      // Create a filename if one doesn't exist
      const fileName = req.file.filename || `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

      // Sanitize the extracted data for database storage
      const sanitizedData = sanitizePdfData(result);
      
      try {
        // Create a new PDF document with proper structure
        const pdfDocument = new PDFDocument({
          userId,
          title: req.file.originalname,
          fileName,
          originalName: req.file.originalname,
          extractedData: sanitizedData
        });

        await pdfDocument.save();
        
        res.json({
          message: 'PDF processed successfully',
          data: result,
          documentId: pdfDocument._id
        });
      } catch (dbError) {
        console.error('Error saving PDF document to database:', dbError);
        // Still return the processed data even if DB save fails
        res.json({
          message: 'PDF processed but not saved to database',
          data: result,
          error: dbError.message
        });
      }
    } catch (error) {
      console.error('PDF processing error:', error);
      res.status(500).json({
        error: 'Failed to process PDF',
        details: error.message
      });
    }
});

// Add route to fetch all PDF documents for the current user
app.get('/api/pdf-documents', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await PDFDocument.find({ userId }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching PDF documents:', error);
    res.status(500).json({ error: 'Failed to fetch PDF documents' });
  }
});

// Add route to fetch a specific PDF document
app.get('/api/pdf-documents/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const document = await PDFDocument.findOne({ _id: documentId, userId });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching PDF document:', error);
    res.status(500).json({ error: 'Failed to fetch PDF document' });
  }
});

// Add route to generate schedule from stored PDF by ID
app.post('/api/pdf-documents/:id/generate-schedule', authenticateJWT, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id || req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }

    // Find the stored PDF document
    const pdfDocument = await PDFDocument.findOne({
      _id: documentId,
      userId
    });

    if (!pdfDocument) {
      return res.status(404).json({ error: 'PDF document not found' });
    }
    
    // Check if document has PDF data stored
    if (!pdfDocument.pdfData && !(pdfDocument.isGridFS && pdfDocument.gridFSId)) {
      return res.status(400).json({ error: 'PDF data not found in document' });
    }

    let pdfBuffer;
    // Get the PDF data from the document or GridFS
    if (pdfDocument.isGridFS && pdfDocument.gridFSId) {
      // GridFS retrieval logic would go here
      return res.status(501).json({ error: 'GridFS retrieval not implemented yet' });
    } else {
      pdfBuffer = pdfDocument.pdfData;
    }
    
    // Process the PDF data to extract text and structure
    const processedData = await processPDF(pdfBuffer);

    // Get user preferences for schedule generation
    let userPreferences = {};
    try {
      const userPrefs = await UserPreferences.findOne({ userId });
      if (userPrefs) {
        userPreferences = userPrefs.toObject();
      }
    } catch (prefsError) {
      console.error('Error fetching user preferences:', prefsError);
    }

    // Generate a schedule from the processed data
    const assignments = extractAssignments(processedData.rawText || '');
    const dates = extractDates(processedData.rawText || '');
    const metadata = processedData.syllabus || {};

    // Generate the schedule
    const schedule = generateSchedule(assignments, dates, userId, metadata, userPreferences);

    // Save the generated schedule to the document
    pdfDocument.generatedSchedule = schedule;
    await pdfDocument.save();
    
    res.json({
      success: true,
      schedule,
      documentId: pdfDocument._id,
      message: `Generated schedule with ${schedule.length} items`
    });
  } catch (error) {
    console.error('Error generating schedule from stored PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate schedule',
      details: error.message
    });
  }
});

// Class schedule routes 
app.post('/api/schedule/classes', authenticateJWT, async (req, res) => {
  try {
    console.log('Received class schedule data:', req.body);
    const { courseName, courseCode, startTime, endTime, location, professor, day, semesterDates } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!courseName || !courseCode || !startTime || !endTime || !day) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { courseName, courseCode, startTime, endTime, day }
      });
    }

    // Create new class schedule
    const newClass = new ClassSchedule({
      userId,
      courseName,
      courseCode,
      startTime,
      endTime,
      location: location || '',
      professor: professor || '',
      day,
      semesterDates: semesterDates || null
    });

    await newClass.save();
    console.log('Class schedule saved:', newClass);

    // After creating the class, fetch all classes for the user
    const allClasses = await ClassSchedule.find({ userId: req.user.userId });
    
    res.status(201).json({
      message: 'Class schedule added successfully',
      class: newClass,
      allClasses: allClasses 
    });
  } catch (error) {
    console.error('Error adding class schedule:', error);
    res.status(500).json({ 
      error: 'Failed to add class schedule',
      details: error.message 
    });
  }
});

app.get('/api/schedule/classes', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Fetching classes for user:', userId);

    const classes = await ClassSchedule.find({ userId });
    console.log('Found classes:', classes);
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

app.post('/api/pdf/generate-schedule', upload.array('files'), async (req, res) => {
  try {
    // Process PDF files
    const userId = req.user.id;
    const filePaths = req.files.map(file => file.path);
    
    // Extract content from PDFs
    const pdfContent = [];
    for (const filePath of filePaths) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const extractedData = await processPDF(fileBuffer);
        pdfContent.push(extractedData);
      } catch (error) {
        console.error('Error processing PDF file:', error);
      }
    }

    // Extract assignments and dates from PDF content
    const assignments = pdfContent.flatMap(content => 
      extractAssignments(content.rawText || '')
    );
    const dates = pdfContent.flatMap(content => 
      extractDates(content.rawText || '')
    );

    // Generate schedule using the imported function
    const metadata = pdfContent[0]?.syllabus || {};
    const schedule = generateSchedule(assignments, dates, userId, metadata);
    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add notifications endpoint
app.post('/api/notifications', authenticateJWT, async (req, res) => {
  try {
    const { title, body, type } = req.body;
    const userId = req.user.userId;
    
    // Validate required fields
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    
    // In a real-world application, you might:
    // 1. Store this notification in the database
    // 2. Send it through a push notification service
    // 3. Trigger a real-time event to connected clients
    
    // For now, we'll just log it and return success
    console.log(`Notification created for user ${userId}:`, { title, body, type });
    
    // Return success
    res.status(201).json({ 
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Error creating notification' });
  }
});

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/parse', pdfRoutes);
app.use('/api/pdf-documents', pdfDocumentRoutes);

// Schedule routes should come after PDFDocument routes to avoid conflicts
app.use('/api', scheduleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Check if response has already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Send appropriate error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Debug route to check JWT secret
app.get('/api/debug/config', (req, res) => {
  console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
  res.json({ 
    jwtSecretExists: !!process.env.JWT_SECRET,
    mongodbConnected: mongoose.connection.readyState === 1,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start the server with the configured port
const startServer = (port) => {
  try {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server error:', e);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(PORT);
