import mongoose from 'mongoose';

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Study timing preferences
  studyHoursPerDay: {
    type: Number,
    default: 4,
    min: 1,
    max: 12
  },
  preferredStudyTimes: {
    type: [String],
    enum: ['morning', 'afternoon', 'evening', 'night'],
    default: ['morning', 'evening']
  },
  preferredSessionLength: {
    type: Number,
    default: 2,
    min: 0.5,
    max: 4
  },
  // Daily schedule preferences
  wakeUpTime: {
    type: String,
    default: '08:00',
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format!`
    }
  },
  sleepTime: {
    type: String,
    default: '23:00',
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format!`
    }
  },
  // Break preferences
  breakDuration: {
    type: Number,
    default: 15,
    min: 5,
    max: 60
  },
  longBreakDuration: {
    type: Number,
    default: 30,
    min: 15,
    max: 120
  },
  sessionsBeforeLongBreak: {
    type: Number,
    default: 4,
    min: 1,
    max: 10
  },
  // Week preferences
  weekendStudy: {
    type: Boolean,
    default: true
  },
  preferredStudyDays: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  // Focus & productivity preferences
  focusPeriods: {
    type: [{
      startTime: String,
      endTime: String,
      days: [String]
    }],
    default: []
  },
  restPeriods: {
    type: [{
      startTime: String,
      endTime: String,
      days: [String]
    }],
    default: []
  },
  // Advanced settings
  minimumDaysBetweenSessions: {
    type: Number,
    default: 1,
    min: 0,
    max: 7
  },
  preferSpacedRepetition: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
userPreferencesSchema.pre('save', function(next) {
  try {
    this.updatedAt = new Date();
    next();
  } catch (error) {
    console.error('Error in UserPreferences pre-save hook:', error);
    next(error);
  }
});

// Add an index for faster lookups
userPreferencesSchema.index({ userId: 1 }, { unique: true });

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);
export default UserPreferences;
