const mongoose = require('mongoose');

const bodyStatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  weightKg: {
    type: Number,
    required: true
  },
  heightCm: {
    type: Number,
    required: true
  },
  bodyFatPercent: {
    type: Number,
    default: 0
  },
  measurements: {
    chest: Number,
    waist: Number,
    hips: Number,
    arms: Number,
    thighs: Number
  }
}, { timestamps: true });

bodyStatSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BodyStat', bodyStatSchema);
