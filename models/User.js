import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  preferences: {
    studyHoursPerDay: {
      type: Number,
      default: 4
    },
    preferredStudyTimes: {
      type: [String],
      default: ['morning', 'evening']
    },
    breakDuration: {
      type: Number,
      default: 15
    },
    longBreakDuration: {
      type: Number,
      default: 30
    },
    sessionsBeforeLongBreak: {
      type: Number,
      default: 4
    },
    weekendStudy: {
      type: Boolean,
      default: true
    },
    preferredSessionLength: {
      type: Number,
      default: 2
    },
    wakeUpTime: {
      type: String,
      default: '08:00'
    },
    sleepTime: {
      type: String,
      default: '23:00'
    },
    preferredStudyDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    minimumDaysBetweenSessions: {
      type: Number,
      default: 1
    },
    preferSpacedRepetition: {
      type: Boolean,
      default: true
    }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
