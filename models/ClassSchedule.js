import mongoose from 'mongoose';

const classScheduleSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  courseCode: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format!`
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format!`
    }
  },
  location: {
    type: String,
    default: ''
  },
  professor: {
    type: String,
    default: ''
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  semesterDates: {
    startDate: Date,
    endDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ClassSchedule = mongoose.model('ClassSchedule', classScheduleSchema);
export default ClassSchedule;
