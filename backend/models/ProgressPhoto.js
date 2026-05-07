const mongoose = require('mongoose');

const progressPhotoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    required: true
  },
  weightKg: Number,
  visibility: {
    type: String,
    enum: ['private', 'leaderboard'],
    default: 'private'
  },
  flagged: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('ProgressPhoto', progressPhotoSchema);
