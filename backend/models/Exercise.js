const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Cardio'],
    required: true
  },
  notes: String,
  personalRecordKg: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Exercise', exerciseSchema);
