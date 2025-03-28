import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateToken } from '../middleware/auth.js';
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
      
      // Return the processed data
      res.status(200).json({ 
        success: true,
        data: sanitizedData,
        message: 'PDF processed successfully'
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

export default router;
