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
import User from './models/User.js';
import TaskSchedule from './models/TaskSchedule.js';
import ClassSchedule from './models/ClassSchedule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({
  apiKey: apiKey,
  timeout: 30000, // 30 second timeout
  maxRetries: 3   // Allow 3 retries
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
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
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const users = await User.find();
    const userCount = users.length;
    const userData = users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }));
    res.json({ userCount, userData });
  }catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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


// Google authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], accessType: 'offline', prompt: 'consent' }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), async (req, res) => {
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
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store user role in token
      const redirectUrl = new URL(process.env.CORS_ORIGIN);
      redirectUrl.pathname = '/access'; // explicitly set the path
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('userKey', user.uniqueKey);
      redirectUrl.searchParams.set('userRole', user.role);

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

// Fix Google callback route to use HTTP status 302 for redirect
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/access?error=auth_failed' }),
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

      // Create redirect URL with auth data
      const redirectUrl = new URL('/access', process.env.CORS_ORIGIN);
      redirectUrl.searchParams.append('token', token);
      redirectUrl.searchParams.append('userKey', user.uniqueKey);
      redirectUrl.searchParams.append('userRole', user.role || 'user');

      console.log('Redirecting to:', redirectUrl.toString());

      // Use 302 Found for better redirect behavior
      res.redirect(302, redirectUrl.toString());
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(302, `${process.env.CORS_ORIGIN}/access?error=auth_failed`);
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
    res.json({
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
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

// AI schedule generation route using memoryStorage
app.post('/ai/generate-schedule', authenticateJWT, upload.array('pdfFiles'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No PDF files provided' });
    }

    // Process each PDF file
    const processPromises = req.files.map(async (file) => {
      try {
        console.log('Processing PDF file:', file.originalname);
        const data = await pdfParse(file.buffer);
        const extractedData = await processPDF(file.buffer);
        return {
          text: data.text,
          structuredContent: extractedData
        };
      } catch (error) {
        console.error(`Error processing PDF ${file.originalname}:`, error);
        return null;
      }
    });

    const results = await Promise.all(processPromises);
    const validResults = results.filter(result => result !== null);

    if (validResults.length === 0) {
      return res.status(400).json({ error: 'Could not process any PDF files' });
    }

    // Combine all extracted content
    const combinedContent = {
      assignments: [],
      dates: [],
      metadata: {}
    };

    validResults.forEach(result => {
      if (result.structuredContent) {
        combinedContent.assignments.push(...(result.structuredContent.assignments || []));
        combinedContent.dates.push(...(result.structuredContent.dates || []));
        // Merge metadata if available
        if (result.structuredContent.syllabus) {
          combinedContent.metadata = {
            ...combinedContent.metadata,
            courseCode: result.structuredContent.syllabus.courseCode || '',
            courseTitle: result.structuredContent.syllabus.courseTitle || '',
            semester: result.structuredContent.syllabus.semester || ''
          };
        }
      }
    });

    // Generate schedule using the textProcessing utility
    const schedule = generateSchedule(
      combinedContent.assignments,
      combinedContent.dates,
      req.user.userId,
      combinedContent.metadata
    );

    res.json(schedule);
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ error: 'Failed to generate schedule' });
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

    // Create reminders for the assignment
    const dueDate = new Date(assignment.dueDate);
    const twoWeeksBefore = new Date(dueDate);
    twoWeeksBefore.setDate(dueDate.getDate() - 14);

    // Create initial reminder (2 weeks before)
    if (twoWeeksBefore > new Date()) {
      await new Reminder({
        userId: req.user.userId,
        assignmentId: assignment._id,
        title: `Reminder: ${assignment.title} due in 2 weeks`,
        message: `Your assignment "${assignment.title}" is due on ${dueDate.toLocaleDateString()}`,
        dueDate: assignment.dueDate,
        reminderDate: twoWeeksBefore
      }).save();
    }

    // Create daily reminders for the last week
    for (let i = 7; i > 0; i--) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(dueDate.getDate() - i);
      if (reminderDate > new Date()) {
        await new Reminder({
          userId: req.user.userId,
          assignmentId: assignment._id,
          title: `Reminder: ${assignment.title} due in ${i} day${i > 1 ? 's' : ''}`,
          message: `Your assignment "${assignment.title}" is due on ${dueDate.toLocaleDateString()}`,
          dueDate: assignment.dueDate,
          reminderDate
        }).save();
      }
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

// Add reminder routes
app.get('/api/reminders', authenticateJWT, async (req, res) => {
  try {
    const reminders = await Reminder.find({
      userId: req.user.userId,
      reminderDate: { $lte: new Date() },
      isRead: false
    }).populate('assignmentId');
    res.json(reminders);
  } catch (error) {
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

// Add admin routes
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
      totalUsers: users.length,
      activeToday: users.filter(u =>
        u.lastLogin && u.lastLogin > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      averageSessionDuration: users.reduce((acc, user) => {
        const userAvg = user.sessionDurations.reduce((sum, session) =>
          sum + session.duration, 0) / (user.sessionDurations.length || 1);
        return acc + userAvg;
      }, 0) / users.length,
      userActivity: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        lastLogin: u.lastLogin,
        totalSessions: u.sessionDurations.length,
        averageSessionDuration: u.sessionDurations.reduce((acc, session) =>
          acc + session.duration, 0) / (u.sessionDurations.length || 1)
      }))
    };

    res.json(analytics);
  } catch (error) {
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

// Add PDF parsing endpoint
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
      
      res.json({
        message: 'PDF processed successfully',
        data: result
      });
    } catch (error) {
      console.error('PDF processing error:', error);
      res.status(500).json({
        error: 'Failed to process PDF',
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
