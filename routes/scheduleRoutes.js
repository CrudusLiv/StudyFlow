import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processDocuments } from '../utils/pdfProcessor.js';
import ClassSchedule from '../models/ClassSchedule.js';
import UserPreferences from '../models/UserPreferences.js';
import PDFDocument from '../models/PDFDocument.js';
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
    
    // Ensure we're sending the data directly as an array
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

// Get all PDF documents for the current user
router.get('/pdf-documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const documents = await PDFDocument.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching PDF documents:', error);
    res.status(500).json({ error: 'Error fetching PDF documents' });
  }
});

// Get a specific PDF document
router.get('/pdf-documents/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    
    const document = await PDFDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(200).json(document);
  } catch (error) {
    console.error('Error fetching PDF document:', error);
    res.status(500).json({ error: 'Error fetching PDF document' });
  }
});

// Delete a PDF document
router.delete('/pdf-documents/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    
    const document = await PDFDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    await document.remove();
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF document:', error);
    res.status(500).json({ error: 'Error deleting PDF document' });
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
    
    console.log(`Processing ${files.length} PDFs for user ${userId}`, {
      fileNames: files.map(f => f.originalname),
      fileSizes: files.map(f => f.size)
    });
    
    // Extract file paths - all files are now treated as assignments by default
    const filePaths = files.map(file => file.path);
    const fileMetadata = files.map(file => ({
      filePath: file.path,
      name: file.originalname,
      documentType: 'assignment'
    }));
    
    // Process user preferences for cognitive optimization
    let userPreferences = {};
    if (req.body.preferences) {
      try {
        userPreferences = JSON.parse(req.body.preferences);
        console.log('Using provided user preferences');
      } catch (e) {
        console.error('Error parsing preferences:', e);
        console.log('Using default preferences');
      }
    } else {
      console.log('No preferences provided, using defaults');
    }
    
    // Get class schedule with proper class tagging
    let classSchedule = [];
    if (req.body.classSchedule) {
      try {
        classSchedule = JSON.parse(req.body.classSchedule);
        console.log('Using provided class schedule');
      } catch (e) {
        console.error('Error parsing class schedule:', e);
      }
    } else {
      console.log('No class schedule provided');
    }
    
    // Tag each class entry with class type
    const taggedClassSchedule = classSchedule.map(cls => ({
      ...cls,
      documentType: 'class'
    }));

    // Process the documents with all metadata
    const options = {
      preferences: {
        ...userPreferences,
        enableCognitiveOptimization: true
      },
      classSchedule: taggedClassSchedule,
      fileMetadata: fileMetadata,
      documentType: 'assignment'
    };
    
    console.log(`Starting processDocuments with ${filePaths.length} files`);
    const studySchedule = await processDocuments(filePaths, userId, options);
    console.log(`processDocuments completed - generated ${studySchedule.length} schedule items`);
    
    // After processing and generating a schedule, save to database
    if (studySchedule && studySchedule.length > 0) {
      try {
        // Save processed PDFs to database
        for (let i = 0; i < files.length; i++) {
          const pdfDoc = new PDFDocument({
            userId,
            title: fileMetadata[i].name.replace(/\.[^/.]+$/, ""), // Remove file extension
            fileName: fileMetadata[i].name,
            originalName: fileMetadata[i].name,
            // Add extracted data and generated schedule
            extractedData: {
              // Add extracted data if available
              // This will be populated in a future update
            },
            generatedSchedule: studySchedule
          });
          
          await pdfDoc.save();
          console.log(`Saved PDF document: ${pdfDoc._id}`);
        }
      } catch (dbError) {
        console.error('Error saving PDF documents to database:', dbError);
        // Continue despite database error - we'll still return the schedule
      }
    }
    
    res.status(200).json({
      message: `${files.length} files processed successfully`,
      studySchedule,
      count: studySchedule.length
    });
  } catch (error) {
    console.error('Error processing PDFs:', error);
    res.status(500).json({ error: 'Error processing PDFs: ' + error.message });
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
