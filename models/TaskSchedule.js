import mongoose from 'mongoose';

const taskScheduleSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['task', 'study', 'assignment', 'exam'],
    default: 'task'
  },
  courseCode: String,
  location: String,
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TaskSchedule = mongoose.model('TaskSchedule', taskScheduleSchema);
export default TaskSchedule;
