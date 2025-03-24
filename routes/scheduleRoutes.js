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
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find or create user preferences
    let userPreferences = await UserPreferences.findOne({ userId });
    
    if (!userPreferences) {
      // Create default preferences if none exist
      userPreferences = new UserPreferences({ userId });
      await userPreferences.save();
    }
    
    res.status(200).json({
      preferences: userPreferences
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Error getting preferences' });
  }
});

// Update user preferences
router.post('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    
    // Find or create user preferences
    let userPreferences = await UserPreferences.findOne({ userId });
    
    if (!userPreferences) {
      // Create new preferences
      userPreferences = new UserPreferences({
        userId,
        ...preferences
      });
    } else {
      // Update existing preferences
      Object.keys(preferences).forEach(key => {
        if (key !== 'userId' && key !== '_id') {
          userPreferences[key] = preferences[key];
        }
      });
    }
    
    await userPreferences.save();
    
    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: userPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Error updating preferences' });
  }
});

// ...existing routes...

export default router;
