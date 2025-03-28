import express from 'express';
import mongoose from 'mongoose';
import { validateToken } from './auth.js';
import PDFDocument from '../models/PDFDocument.js';
import { sanitizePdfData } from '../utils/pdfDataHandler.js';

const router = express.Router();
router.use(validateToken);

// Get all PDF documents for the current user
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    
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

// Update a PDF document's schedule
router.post('/:id/schedule', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const { schedule } = req.body;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule data must be an array' });
    }
    
    console.log(`User ${userId} updating document ${documentId} with ${schedule.length} schedule items`);
    
    // Find the document
    const document = await PDFDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found or not owned by user' });
    }
    
    // Process schedule items to ensure they have proper date formats
    const processedSchedule = schedule.map(item => {
      // Make a copy of the item to avoid modifying the original
      let processedItem = { ...item };
      
      // Convert string dates to Date objects
      try {
        if (processedItem.start) {
          processedItem.start = new Date(processedItem.start);
        }
        if (processedItem.end) {
          processedItem.end = new Date(processedItem.end);
        }
      } catch (e) {
        console.warn('Error converting dates:', e);
      }
      
      return processedItem;
    });
    
    // Update the document with the new schedule
    document.generatedSchedule = processedSchedule;
    await document.save();
    
    res.status(200).json({ 
      message: 'Schedule updated successfully',
      documentId,
      scheduleCount: processedSchedule.length
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ 
      error: 'Error updating schedule',
      details: error.message
    });
  }
});

// Add optimized endpoint for large schedules
router.post('/:id/schedule-optimized', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const { schedule } = req.body;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule data must be an array' });
    }
    
    console.log(`User ${userId} updating document ${documentId} with ${schedule.length} schedule items (optimized)`);
    
    // Find the document
    const document = await PDFDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found or not owned by user' });
    }
    
    // Process schedule items to ensure they have proper date formats
    const processedSchedule = schedule.map(item => {
      // Make a copy of the item to avoid modifying the original
      let processedItem = { ...item };
      
      // Convert string dates to Date objects
      try {
        if (processedItem.start) {
          processedItem.start = new Date(processedItem.start);
        }
        if (processedItem.end) {
          processedItem.end = new Date(processedItem.end);
        }
      } catch (e) {
        console.warn('Error converting dates:', e);
      }
      
      return processedItem;
    });
    
    // Update the document with the new schedule
    document.generatedSchedule = processedSchedule;
    await document.save();
    
    res.status(200).json({ 
      message: 'Schedule updated successfully',
      documentId,
      scheduleCount: processedSchedule.length
    });
  } catch (error) {
    console.error('Error updating schedule (optimized):', error);
    res.status(500).json({ 
      error: 'Error updating schedule',
      details: error.message
    });
  }
});

// Delete a PDF document
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
    
    const document = await PDFDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    await PDFDocument.deleteOne({ _id: documentId });
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF document:', error);
    res.status(500).json({ error: 'Error deleting PDF document' });
  }
});

export default router;
