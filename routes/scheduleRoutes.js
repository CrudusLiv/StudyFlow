import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processDocuments } from '../utils/pdfProcessor.js';
import ClassSchedule from '../models/ClassSchedule.js';
import UserPreferences from '../models/UserPreferences.js';
import { validateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(validateToken);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// CRUD operations for class schedules
router.get('/classes', async (req, res) => {
  try {
    const userId = req.user.id;
    const classes = await ClassSchedule.find({ userId });
    res.status(200).json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Error fetching classes' });
  }
});

router.post('/classes', async (req, res) => {
  try {
    const userId = req.user.id;
    const classData = { ...req.body, userId };
    
    const newClass = new ClassSchedule(classData);
    await newClass.save();
    
    const allClasses = await ClassSchedule.find({ userId });
    
    res.status(201).json({
      message: 'Class added successfully',
      class: newClass,
      allClasses
    });
  } catch (error) {
    console.error('Error adding class:', error);
    res.status(500).json({ error: 'Error adding class' });
  }
});

// Process PDF files and generate a study schedule
router.post('/process-pdfs', upload.array('files', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Get file paths of uploaded files
    const filePaths = files.map(file => file.path);
    
    // Parse file metadata to tag assignments
    const fileMetadata = {};
    if (req.body.fileMetadata) {
      try {
        // Handle multiple fileMetadata entries
        if (Array.isArray(req.body.fileMetadata)) {
          req.body.fileMetadata.forEach((meta, index) => {
            const parsedMeta = JSON.parse(meta);
            fileMetadata[index] = parsedMeta;
          });
        } else {
          // Handle single fileMetadata object
          const metaArray = JSON.parse(req.body.fileMetadata);
          metaArray.forEach((meta, index) => {
            fileMetadata[index] = meta;
          });
        }
      } catch (e) {
        console.warn('Error parsing file metadata:', e);
      }
    }
    
    // Get user preferences
    let userPreferences = {};
    if (req.body.preferences) {
      try {
        userPreferences = JSON.parse(req.body.preferences);
      } catch (e) {
        console.warn('Error parsing preferences:', e);
      }
    } else {
      // Try to get user preferences from database
      try {
        const userPrefs = await UserPreferences.findOne({ userId });
        if (userPrefs) {
          userPreferences = userPrefs.toObject();
        }
      } catch (e) {
        console.warn('Error getting user preferences from database:', e);
      }
    }
    
    // Get class schedule
    let classSchedule = [];
    if (req.body.classSchedule) {
      try {
        classSchedule = JSON.parse(req.body.classSchedule);
      } catch (e) {
        console.warn('Error parsing class schedule:', e);
      }
    } else {
      // Try to get class schedule from database
      try {
        const classes = await ClassSchedule.find({ userId });
        if (classes && classes.length > 0) {
          classSchedule = classes.map(cls => cls.toObject());
        }
      } catch (e) {
        console.warn('Error getting class schedule from database:', e);
      }
    }
    
    // Process the documents with all metadata
    const options = {
      preferences: userPreferences,
      classSchedule: classSchedule,
      fileMetadata: fileMetadata
    };
    
    const studySchedule = await processDocuments(filePaths, userId, options);
    
    res.status(200).json({
      message: 'Files processed successfully',
      studySchedule
    });
  } catch (error) {
    console.error('Error processing PDFs:', error);
    res.status(500).json({ error: 'Error processing PDFs' });
  }
});

// Get user preferences
router.get('/preferences', async (req, res, next) => {
  try {
    // Validate user ID existence
    const userId = req.user?.id;
    if (!userId) {
      console.error('Missing user ID in token');
      return res.status(401).json({ error: 'Invalid user authentication' });
    }
    
    console.log('Getting preferences for user:', userId);
    
    // Find or create user preferences with better error handling
    let userPreferences;
    try {
      userPreferences = await UserPreferences.findOne({ userId });
      console.log('User preferences found:', !!userPreferences);
    } catch (dbError) {
      console.error('Database error finding preferences:', dbError);
      return res.status(500).json({ error: 'Database error', details: dbError.message });
    }
    
    if (!userPreferences) {
      console.log('Creating default preferences for user:', userId);
      // Create default preferences with required userId field
      try {
        userPreferences = new UserPreferences({ 
          userId,
          studyHoursPerDay: 4,
          preferredStudyTimes: ['morning', 'evening'],
          breakDuration: 15,
          preferredSessionLength: 2,
          wakeUpTime: '08:00',
          sleepTime: '23:00',
          weekendStudy: true
        });
        await userPreferences.save();
        console.log('Default preferences created successfully');
      } catch (createError) {
        console.error('Error creating default preferences:', createError);
        return res.status(500).json({ error: 'Failed to create default preferences', details: createError.message });
      }
    }
    
    // Send preferences with extra validation
    if (userPreferences) {
      res.status(200).json({
        preferences: userPreferences
      });
    } else {
      // Final fallback if somehow userPreferences is still undefined
      res.status(500).json({ error: 'Failed to retrieve or create preferences' });
    }
  } catch (error) {
    console.error('Uncaught error in preferences route:', error);
    next(error); // Pass to error handling middleware
  }
});

// Update user preferences
router.post('/preferences', async (req, res) => {
  try {
    // Validate user ID existence with enhanced debugging
    const userId = req.user?.id;
    console.log('User object from token:', req.user);
    
    if (!userId) {
      console.error('Missing user ID in token');
      return res.status(401).json({ error: 'Invalid user authentication' });
    }
    
    console.log('Updating preferences for user:', userId, 'with data:', req.body);
    
    // Find or create user preferences
    let userPreferences = await UserPreferences.findOne({ userId });
    
    if (!userPreferences) {
      // Create new preferences with explicit userId
      userPreferences = new UserPreferences({
        userId,
        ...req.body
      });
    } else {
      // Update existing preferences
      Object.keys(req.body).forEach(key => {
        if (key !== 'userId' && key !== '_id') {
          userPreferences[key] = req.body[key];
        }
      });
    }
    
    await userPreferences.save();
    console.log('Preferences updated successfully:', userPreferences._id);
    
    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: userPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ 
      error: 'Error updating preferences',
      message: error.message
    });
  }
});

export default router;
