import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processDocuments } from '../utils/pdfProcessor.js';
import { setSemesterDates, getCurrentSemesterDates } from '../utils/textProcessing.js';
import ClassSchedule from '../models/ClassSchedule.js';
import UserPreferences from '../models/UserPreferences.js';
import PDFDocument from '../models/PDFDocument.js';
import { validateToken } from './auth.js';
import { saveSchedule, loadSchedule, getUserSchedules, deleteSchedule, updateSchedule } from '../utils/fileStorage.js';

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
    
    // Get system-wide semester dates if they exist
    let semesterDates = getCurrentSemesterDates();
    
    // If no system-wide dates, check user preferences
    if (!semesterDates) {
      const userPreferences = await UserPreferences.findOne({ userId });
      if (userPreferences?.semesterDates) {
        semesterDates = userPreferences.semesterDates;
      } else {
        // Default semester dates as fallback
        const today = new Date();
        semesterDates = {
          startDate: today,
          endDate: new Date(today.getFullYear(), today.getMonth() + 4, today.getDate())
        };
      }
    }
    
    // Always add semesterDates to class data
    classData.semesterDates = semesterDates;
    
    // Set the semester dates for the whole system if not already set
    if (!getCurrentSemesterDates()) {
      setSemesterDates(semesterDates);
    }
    
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
    const fileMetadata = files.map(file => {
      // Try to extract course code from filename
      const courseCodeMatch = file.originalname.match(/\b([A-Z]{2,}[-\s]?[A-Z0-9]*\d{3}[A-Z0-9]*)\b/i);
      return {
        filePath: file.path,
        name: file.originalname,
        documentType: 'assignment',
        courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : undefined,
        extractAssignmentDetails: req.body.extractAssignmentDetails === 'true'
      };
    });
    
    // Get course codes from request if available
    let courseCodes = [];
    if (req.body.courseCodes) {
      try {
        courseCodes = JSON.parse(req.body.courseCodes);
        console.log('Received course codes:', courseCodes);
      } catch (e) {
        console.error('Error parsing course codes:', e);
      }
    }
    
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
        console.log('Using provided class schedule for due date estimation');
      } catch (e) {
        console.error('Error parsing class schedule:', e);
      }
    } else {
      console.log('No class schedule provided');
      
      // Try to fetch class schedule from database if it exists
      try {
        const userClasses = await ClassSchedule.find({ userId });
        if (userClasses && userClasses.length > 0) {
          console.log(`Found ${userClasses.length} classes in database, using for due date estimation`);
          classSchedule = userClasses;
        }
      } catch (dbError) {
        console.error('Error fetching classes from database:', dbError);
      }
    }
    
    // Tag each class entry with class type
    const taggedClassSchedule = classSchedule.map(cls => ({
      ...cls,
      documentType: 'class'
    }));

    // Load persisted semester dates if they're not already set
    if (!getCurrentSemesterDates()) {
      try {
        const userPreferences = await UserPreferences.findOne({ userId });
        if (userPreferences?.semesterDates) {
          setSemesterDates(userPreferences.semesterDates);
          console.log('Loaded semester dates from user preferences');
        }
      } catch (dbError) {
        console.error('Error loading semester dates from preferences:', dbError);
      }
    }

    // Process the documents with all metadata
    const options = {
      preferences: {
        ...userPreferences,
        enableCognitiveOptimization: true
      },
      classSchedule: taggedClassSchedule,
      fileMetadata: fileMetadata,
      documentType: 'assignment',
      courseCodes: courseCodes,
      extractAssignmentDetails: true,
      title: `Schedule from ${files.length} files` // Add a title for the schedule
    };
    
    console.log(`Starting processDocuments with ${filePaths.length} files, semester dates set: ${!!getCurrentSemesterDates()}`);
    const studySchedule = await processDocuments(filePaths, userId, options);
    console.log(`processDocuments completed - generated ${studySchedule.length} schedule items`);
    
    // Get the schedule ID that was generated during processing
    const scheduleId = studySchedule.length > 0 ? studySchedule[0].scheduleId : null;
    
    res.status(200).json({
      message: `${files.length} files processed successfully`,
      studySchedule,
      count: studySchedule.length,
      scheduleId
    });
  } catch (error) {
    console.error('Error processing PDFs:', error);
    res.status(500).json({ error: 'Error processing PDFs: ' + error.message });
  }
});

// Add a new route to save/update a schedule for a specific document
router.post('/pdf-documents/:id/schedule', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const { schedule } = req.body;
    
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid schedule data' });
    }
    
    // Find the document and ensure it belongs to the user
    const document = await PDFDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Update the document with the new schedule
    document.generatedSchedule = schedule;
    await document.save();
    
    res.status(200).json({ 
      message: 'Schedule updated successfully',
      documentId,
      scheduleCount: schedule.length
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Error updating schedule: ' + error.message });
  }
});

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Log the user ID for debugging
    console.log('Getting preferences for user ID:', userId);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is missing from request' });
    }
    
    // Try to find the user preferences
    const userPreferences = await UserPreferences.findOne({ userId });
    
    if (!userPreferences) {
      // Return empty preferences if none found
      return res.status(200).json({ 
        message: 'No preferences found for user',
        preferences: {} 
      });
    }
    
    // Return the found preferences
    res.status(200).json({ 
      preferences: userPreferences 
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ 
      error: 'Error fetching preferences',
      details: error.message
    });
  }
});

// Update user preferences
router.post('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    
    // Log the incoming data for debugging
    console.log('Updating preferences for user ID:', userId);
    console.log('New preferences:', JSON.stringify(preferences).substring(0, 200) + '...');
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is missing from request' });
    }
    
    // Find and update or create new preferences
    const result = await UserPreferences.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          ...preferences,
          updatedAt: new Date() 
        } 
      },
      { 
        new: true,
        upsert: true, // Create if doesn't exist
        runValidators: true
      }
    );
    
    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: result
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ 
      error: 'Error updating preferences',
      details: error.message
    });
  }
});

// Add a new route to set semester dates
router.post('/semester-dates', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const success = setSemesterDates({ startDate, endDate });
    
    if (success) {
      // Save to user preferences for persistence across server restarts
      await UserPreferences.findOneAndUpdate(
        { userId: req.user.id },
        { 
          $set: { 
            semesterDates: { startDate, endDate },
            updatedAt: new Date() 
          } 
        },
        { 
          new: true,
          upsert: true, // Create if doesn't exist
          runValidators: true
        }
      );
      
      res.status(200).json({
        message: 'Semester dates set successfully',
        semesterDates: { startDate, endDate }
      });
    } else {
      res.status(400).json({ error: 'Invalid semester dates' });
    }
  } catch (error) {
    console.error('Error setting semester dates:', error);
    res.status(500).json({ 
      error: 'Error setting semester dates',
      details: error.message
    });
  }
});

// Get current semester dates
router.get('/semester-dates', async (req, res) => {
  try {
    // First check in-memory dates
    let semesterDates = getCurrentSemesterDates();
    
    // If no in-memory dates, check user preferences
    if (!semesterDates) {
      const userPreferences = await UserPreferences.findOne({ userId: req.user.id });
      
      if (userPreferences?.semesterDates) {
        semesterDates = userPreferences.semesterDates;
        
        // Also set in memory for future use
        setSemesterDates(semesterDates);
      }
    }
    
    res.status(200).json({
      semesterDates: semesterDates || null
    });
  } catch (error) {
    console.error('Error getting semester dates:', error);
    res.status(500).json({ 
      error: 'Error getting semester dates',
      details: error.message
    });
  }
});

// Add new routes for file-based schedule storage
router.get('/schedules', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all schedules for the user
    const schedules = getUserSchedules(userId);
    
    res.status(200).json({
      schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Error fetching schedules' });
  }
});

router.get('/schedules/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const scheduleId = req.params.id;
    
    // Load the schedule
    const scheduleData = loadSchedule(userId, scheduleId);
    
    if (!scheduleData) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.status(200).json(scheduleData);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Error fetching schedule' });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const scheduleId = req.params.id;
    
    // Delete the schedule
    const success = deleteSchedule(userId, scheduleId);
    
    if (!success) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Error deleting schedule' });
  }
});

router.put('/schedules/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const scheduleId = req.params.id;
    const { schedule, metadata } = req.body;
    
    // Update the schedule
    const result = updateSchedule(userId, scheduleId, schedule, metadata);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error || 'Failed to update schedule' });
    }
    
    res.status(200).json({ 
      message: 'Schedule updated successfully',
      scheduleId
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Error updating schedule' });
  }
});

export default router;
