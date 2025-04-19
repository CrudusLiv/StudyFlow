import mongoose from 'mongoose';

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  studySessionLength: {
    type: Number,
    default: 60 // minutes
  },
  breakLength: {
    type: Number,
    default: 15 // minutes
  },
  maxDailyStudyHours: {
    type: Number,
    default: 4
  },
  preferredStudyDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  preferredStudyTimeStart: {
    type: String,
    default: '09:00'
  },
  preferredStudyTimeEnd: {
    type: String,
    default: '18:00'
  },
  semesterDates: {
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date, 
      default: null
    }
  },
  spacingPreference: {
    type: String,
    enum: ['intense', 'moderate', 'relaxed'],
    default: 'moderate'
  },
  productiveTimeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'balanced'],
    default: 'morning'
  },
  procrastinationProfile: {
    type: String,
    enum: ['prone', 'moderate', 'averse'],
    default: 'moderate'
  },
  cognitiveLoadFactors: {
    type: Map,
    of: Number,
    default: {
      exam: 1.5,
      project: 1.3,
      assignment: 1.0,
      reading: 0.8,
      homework: 1.1,
      presentation: 1.3,
      lab: 1.2
    }
  },
  maxDailyCognitiveLoad: {
    type: Number,
    default: 5
  },
  learningStyle: {
    type: String,
    enum: ['intensive', 'gradual', 'balanced'],
    default: 'balanced'
  },
  weekendPreference: {
    type: String,
    enum: ['minimal', 'moderate', 'intensive'],
    default: 'minimal'
  },
  subjectFamiliarity: {
    type: Map,
    of: Number,
    default: {}
  },
  breaksBetweenSessions: {
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

// Middleware to update the updatedAt field on save
userPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);
export default UserPreferences;
