const mongoose = require('mongoose');

const setSchema = new mongoose.Schema({
  reps: { type: Number, min: 0, default: 0 },
  weightKg: { type: Number, min: 0, default: 0 },
  durationSec: { type: Number, min: 0, default: 0 },
  completed: { type: Boolean, default: true }
}, { _id: false });

const workoutExerciseSchema = new mongoose.Schema({
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise'
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Cardio'],
    default: 'Chest'
  },
  sets: [setSchema],
  restSeconds: {
    type: Number,
    default: 90
  }
}, { _id: false });

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    default: 'Strength'
  },
  scheduledFor: Date,
  startedAt: Date,
  completedAt: Date,
  durationMin: {
    type: Number,
    default: 0
  },
  caloriesBurned: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed'],
    default: 'planned'
  },
  notes: String,
  exercises: [workoutExerciseSchema]
}, { timestamps: true });

module.exports = mongoose.model('Workout', workoutSchema);
