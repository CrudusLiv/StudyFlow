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
  }]
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

// Add new schema for AI-generated schedule
const aiScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userKey: { type: String, required: true, index: true },
  weeklySchedule: [{
    day: String,
    tasks: [{
      time: String,
      title: String,
      details: String,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
      }
    }]
  }],
  createdAt: { type: Date, default: Date.now }
});

const AISchedule = mongoose.model('AISchedule', aiScheduleSchema);

// Add new schema for university schedule
const universityScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weeklySchedule: [{
    day: String,
    classes: [{
      courseName: String,
      startTime: String,
      endTime: String,
      location: String,
      professor: String
    }]
  }]
});

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
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
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
app.post('/ai/generate-schedule', authenticateJWT, upload.array('pdfFiles'), async (req, res) => {
  const userId = req.user.userId;
  const userKey = req.user.userKey; // Add this line
  
  try {
    // Get university schedule
    const universitySchedule = await UniversitySchedule.findOne({ userId });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'PDF files are required' });
    }

    let combinedPdfText = '';
    for (const file of req.files) {
      const pdfData = await pdfParse(file.buffer);
      combinedPdfText += pdfData.text + '\n';
    }

    const chatResponse = await client.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ 
        role: 'user', 
        content: `Create a study schedule that works around these university classes:
        ${JSON.stringify(universitySchedule?.weeklySchedule || [])}
        
        And incorporate these assignments/tasks from the PDF content:
        ${combinedPdfText}
        
        Return ONLY a JSON object with no markdown formatting following this structure:
        {"weeklySchedule":[{"day":"Monday","tasks":[{"time":"09:00-10:30","title":"Task name","details":"Task description","status":"pending"}]}]}
        
        Important rules:
        1. Never schedule study sessions during university class times
        2. Prefer scheduling study sessions for a subject shortly after its class
        3. Include breaks between study sessions
        4. If no university schedule exists, create a balanced schedule using only the PDF content`
      }],
    });

    try {
      // Clean up the response by removing any markdown formatting
      const cleanResponse = chatResponse.choices[0].message.content
        .replace(/```json\n?/g, '')  // Remove ```json
        .replace(/```\n?/g, '')      // Remove closing ```
        .trim();                     // Remove extra whitespace

      console.log('Cleaned AI response:', cleanResponse); // For debugging

      const schedule = JSON.parse(cleanResponse);

      // Validate the schedule structure
      if (!schedule.weeklySchedule || !Array.isArray(schedule.weeklySchedule)) {
        throw new Error('Invalid schedule structure');
      }

      // Save the schedule
      const aiSchedule = await AISchedule.findOneAndUpdate(
        { userId, userKey }, // Add userKey to query
        { tasks: schedule.weeklySchedule },
        { new: true, upsert: true }
      );

      res.json(schedule);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw AI response:', chatResponse.choices[0].message.content);
      res.status(500).json({ 
        error: 'Error parsing schedule', 
        details: 'Invalid response format',
        rawResponse: chatResponse.choices[0].message.content // For debugging
      });
    }
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ 
      error: 'Unexpected error occurred', 
      details: error.message 
    });
  }
});

// Add new routes for AI schedule
app.post('/ai/save-schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const { weeklySchedule } = req.body;

  try {
    console.log('Saving schedule for user:', userId);
    console.log('Schedule data:', weeklySchedule);

    const result = await AISchedule.findOneAndUpdate(
      { userId },
      { weeklySchedule },
      { new: true, upsert: true }
    );

    console.log('Saved schedule:', result);
    res.json(result);
  } catch (error) {
    console.error('Error saving AI schedule:', error);
    res.status(500).json({ error: 'Error saving schedule', details: error.message });
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
    const result = await UniversitySchedule.findOneAndUpdate(
      { userId },
      { weeklySchedule },
      { new: true, upsert: true }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error saving university schedule' });
  }
});

app.get('/university-schedule', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  try {
    const schedule = await UniversitySchedule.findOne({ userId });
    res.json(schedule || { weeklySchedule: [] });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching university schedule' });
  }
});

// Add the import endpoint after the existing university schedule routes
app.post('/university-schedule/import', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let schedule;
    if (file.mimetype === 'application/pdf') {
      // Parse PDF schedule
      const pdfData = await pdfParse(file.buffer);
      // Use Mistral AI to parse the schedule text
      const response = await client.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ 
          role: 'user', 
          content: `Parse this university schedule and convert it to JSON format following this structure:
          {
            "weeklySchedule": [
              {
                "day": "Monday",
                "classes": [
                  {
                    "courseName": "Math 101",
                    "startTime": "09:00",
                    "endTime": "10:30",
                    "location": "Room 123",
                    "professor": "Dr. Smith"
                  }
                ]
              }
            ]
          }

          Here's the schedule text:
          ${pdfData.text}`
        }],
      });

      schedule = JSON.parse(response.choices[0].message.content.trim());
    } else {
      // Handle CSV/Excel files if needed
      // ... add CSV/Excel parsing logic here ...
    }

    // Save the parsed schedule
    const result = await UniversitySchedule.findOneAndUpdate(
      { userId },
      { weeklySchedule: schedule.weeklySchedule },
      { new: true, upsert: true }
    );

    res.json(result);
  } catch (error) {
    console.error('Error importing schedule:', error);
    res.status(500).json({ error: 'Error importing schedule', details: error.message });
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
app.get('/api/admin/users', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.put('/api/admin/users/:id', authenticateJWT, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

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

app.delete('/api/admin/users/:id', authenticateJWT, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});

app.get('/api/admin/analytics', authenticateJWT, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

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
      username: user.username
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});