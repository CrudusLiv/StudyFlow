import mongoose from 'mongoose';

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
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
  breakDuration: {
    type: Number,
    default: 15,
    min: 5,
    max: 60
  },
  weekendStudy: {
    type: Boolean,
    default: true
  },
  preferredSessionLength: {
    type: Number,
    default: 2,
    min: 0.5,
    max: 4
  },
  dayStartTime: {
    type: String,
    default: '08:00',
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format!`
    }
  },
  dayEndTime: {
    type: String,
    default: '22:00',
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format!`
    }
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
  this.updatedAt = new Date();
  next();
});

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);
export default UserPreferences;
