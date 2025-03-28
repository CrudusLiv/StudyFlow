import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processDocuments } from '../utils/pdfProcessor.js';
import ClassSchedule from '../models/ClassSchedule.js';
import UserPreferences from '../models/UserPreferences.js';
import PDFDocument from '../models/PDFDocument.js';
import { validateToken } from './auth.js';

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
    
    // Create a new PDF document entry to store the extracted data and schedule
    let documentId = null;
    
    // After processing and generating a schedule, save to database
    if (studySchedule && studySchedule.length > 0) {
      try {
        // Create new document with first file's name as title
        const newDocument = new PDFDocument({
          userId,
          title: fileMetadata[0].name.replace(/\.[^/.]+$/, ""), // Remove file extension
          fileName: fileMetadata[0].name,
          originalName: fileMetadata[0].name,
          extractedData: {
            // Add extracted data from first file
            courseCode: options.preferences.courseCode || '',
            instructor: options.preferences.instructor || '',
            semester: options.preferences.semester || '',
            assignments: [], // Will be populated later
            dates: [],
            topics: [],
            complexity: 0
          },
          generatedSchedule: studySchedule // Save the study schedule here
        });
        
        await newDocument.save();
        documentId = newDocument._id;
        console.log(`Saved document with schedule to database, ID: ${documentId}`);
      } catch (dbError) {
        console.error('Error saving document to database:', dbError);
      }
    }
    
    res.status(200).json({
      message: `${files.length} files processed successfully`,
      studySchedule,
      count: studySchedule.length,
      documentId // Return the document ID to the client
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

export default router;
