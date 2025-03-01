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
import path from 'path';
import { google } from 'googleapis';
import pdfParse from 'pdf-parse';
import { Mistral } from '@mistralai/mistralai';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey: apiKey });

app.use(cors());
app.use(express.json());
app.use(session({ secret: 'your_session_secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// User schema and model
const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

const User = mongoose.model('User', userSchema);

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

const Task = mongoose.model('Task', taskSchema);

// Schedule schema and model
const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

// Passport configuration
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/auth/google/callback/',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({ email: profile.emails[0].value });
      await user.save();
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to authenticate users using JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
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
    const user = new User({ 
      email, 
      password: hashedPassword,
      name,
      role: role || 'user' // Default to 'user' if role not specified
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
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
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
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
  const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '1h' });

  // Get the authorization code from the query parameters
  const authorizationCode = req.query.code;

  // Exchange the authorization code for tokens
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/auth/google/callback/'
  );
  try {
    const { tokens } = await oAuth2Client.getToken(authorizationCode);
    const refreshToken = tokens.refresh_token;

    // Save the refresh token securely (e.g., in the database or environment variable)
    // For demonstration purposes, we'll just log it
    console.log('Authorization Code:', authorizationCode);
    console.log('Refresh Token:', refreshToken);

    res.redirect(`http://localhost:5173?token=${token}`);
  } catch (error) {
    console.error('Error exchanging authorization code for tokens:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code for tokens' });
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
app.post('/ai/generate-schedule', authenticateJWT, upload.single('pdf'), async (req, res) => {
  const userId = req.user.userId;
  try {
    // Log file info for debugging
    console.log('req.file:', req.file);
    
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'PDF file is required' });
    }
    
    const { buffer } = req.file;
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;
    console.log('Extracted text from PDF:', pdfText);
    
    const chatResponse = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: `Generate a study schedule based on the following text: ${pdfText}` }],
    });
    
    console.log('Received response from Mistral API:', chatResponse.choices[0].message.content);
    const aiGeneratedTasks = JSON.parse(chatResponse.choices[0].message.content);
    
    const schedule = new Schedule({
      userId,
      date: new Date().toISOString().split('T')[0],
      tasks: aiGeneratedTasks.map(task => task._id),
    });
    
    await schedule.save();
    res.json(schedule);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error generating schedule:', error.response ? error.response.data : error.message);
      res.status(400).json({ error: 'Error generating schedule', details: error.response ? error.response.data : error.message });
    } else {
      console.error('Unexpected error:', error.message);
      res.status(500).json({ error: 'Unexpected error occurred', details: error.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});