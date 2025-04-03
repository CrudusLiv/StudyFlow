import mongoose from 'mongoose';

const pdfDocumentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: String,
  uploadDate: {
    type: Date,
    default: Date.now
  },
  // Add PDF binary data storage
  pdfData: {
    type: Buffer,
    required: false
  },
  // Flag to indicate if this is a large file stored in GridFS
  isGridFS: {
    type: Boolean,
    default: false
  },
  // GridFS file ID reference if stored in GridFS
  gridFSId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  extractedData: {
    courseCode: String,
    instructor: String,
    semester: String,
    assignments: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    },
    dates: [{
      date: String,
      context: String,
      isDeadline: Boolean,
      isExam: Boolean,
      importance: String
    }],
    topics: [{
      title: String,
      context: String,
      importance: Number
    }],
    complexity: Number
  },
  generatedSchedule: [{
    id: String,
    title: String,
    description: String,
    category: String,
    start: Date,
    end: Date,
    priority: String,
    courseCode: String,
    location: String,
    complexity: mongoose.Schema.Types.Mixed,
    cognitiveLoad: Number,
    resource: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

const PDFDocument = mongoose.model('PDFDocument', pdfDocumentSchema);
export default PDFDocument;
