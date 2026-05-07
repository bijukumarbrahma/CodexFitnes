const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  steps: {
    type: Number,
    default: 0,
    min: 0
  },
  goal: {
    type: Number,
    default: 10000,
    min: 1000
  },
  distanceKm: {
    type: Number,
    default: 0
  },
  calories: {
    type: Number,
    default: 0
  },
  activeMinutes: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    enum: ['manual', 'sensor', 'sync'],
    default: 'manual'
  }
}, { timestamps: true });

stepLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StepLog', stepLogSchema);
