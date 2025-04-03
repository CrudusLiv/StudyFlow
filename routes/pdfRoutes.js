import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { validateToken } from './auth.js';
import { processPDF } from '../utils/pdfProcessor.js';
import { sanitizePdfData } from '../utils/pdfDataHandler.js';

const router = express.Router();
router.use(validateToken);

// Configure multer for handling file uploads
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

// Route for parsing a PDF file
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    console.log('Processing PDF file:', req.file.originalname);
    
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileBuffer = fs.readFileSync(req.file.path);
    
    try {
      const processedData = await processPDF(fileBuffer);
      
      // Clean up the temp file
      fs.unlinkSync(req.file.path);
      
      // Sanitize data for database
      const sanitizedData = sanitizePdfData(processedData);
      
      // Create a new PDF document with the actual PDF data stored
      const PDFDocument = mongoose.model('PDFDocument');
      const pdfDocument = new PDFDocument({
        userId: req.user.id,
        title: req.file.originalname,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        pdfData: fileBuffer, // Store the actual PDF binary data
        extractedData: sanitizedData
      });
      
      await pdfDocument.save();
      
      // Return the processed data
      res.status(200).json({ 
        success: true,
        data: sanitizedData,
        documentId: pdfDocument._id,
        message: 'PDF processed and stored successfully'
      });
    } catch (processingError) {
      console.error('PDF processing error:', processingError);
      
      // Clean up the temp file even if processing failed
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        error: 'Error processing PDF',
        details: processingError.message
      });
    }
  } catch (error) {
    console.error('Error in parse-pdf route:', error);
    
    // Try to clean up the temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Server error processing PDF',
      details: error.message
    });
  }
});

// Add a new route to retrieve PDF data by ID
router.get('/pdf/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    
    const PDFDocument = mongoose.model('PDFDocument');
    const document = await PDFDocument.findOne({
      _id: documentId,
      userId: userId
    });
    
    if (!document) {
      return res.status(404).json({ error: 'PDF document not found' });
    }
    
    // If it's stored in GridFS
    if (document.isGridFS && document.gridFSId) {
      // GridFS retrieval logic would go here
      return res.status(501).json({ error: 'GridFS retrieval not implemented yet' });
    } 
    
    // If it's stored directly in the document
    if (document.pdfData) {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `inline; filename="${document.originalName}"`);
      return res.send(document.pdfData);
    }
    
    return res.status(404).json({ error: 'PDF data not found in document' });
  } catch (error) {
    console.error('Error retrieving PDF:', error);
    res.status(500).json({ error: 'Server error retrieving PDF' });
  }
});

// Add route for saving schedule to a PDF document
router.post('/pdf-documents/:id/schedule', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const { schedule } = req.body;
    
    // Input validation
    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule data must be an array' });
    }
    
    console.log(`Updating document ${documentId} with ${schedule.length} schedule items`);
    
    // Find the document and ensure it belongs to the user
    const PDFDocument = mongoose.model('PDFDocument');
    const document = await PDFDocument.findOne({ 
      _id: documentId, 
      userId: userId 
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Process schedule items to ensure they have proper date formats
    const processedSchedule = schedule.map(item => {
      // Ensure start and end are Date objects
      return {
        ...item,
        start: item.start ? new Date(item.start) : new Date(),
        end: item.end ? new Date(item.end) : new Date(new Date().getTime() + 60 * 60 * 1000)
      };
    });
    
    // Update the document with the new schedule
    document.generatedSchedule = processedSchedule;
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

export default router;
