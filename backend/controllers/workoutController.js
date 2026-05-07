const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');
const { cleanString, toNumber } = require('../utils/validation');

exports.list = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ workouts });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const exercises = Array.isArray(req.body.exercises) ? req.body.exercises : [];
    const workout = await Workout.create({
      user: req.user._id,
      title: cleanString(req.body.title, 'Workout'),
      type: cleanString(req.body.type, 'Strength'),
      scheduledFor: req.body.scheduledFor || undefined,
      startedAt: req.body.startedAt || undefined,
      completedAt: req.body.completedAt || undefined,
      durationMin: toNumber(req.body.durationMin, 45),
      caloriesBurned: toNumber(req.body.caloriesBurned, 240),
      status: req.body.status || 'planned',
      notes: cleanString(req.body.notes),
      exercises: exercises.map((exercise) => ({
        name: cleanString(exercise.name, 'Exercise'),
        category: exercise.category || 'Chest',
        restSeconds: toNumber(exercise.restSeconds, 90),
        sets: (exercise.sets || []).map((set) => ({
          reps: toNumber(set.reps),
          weightKg: toNumber(set.weightKg),
          durationSec: toNumber(set.durationSec),
          completed: set.completed !== false
        }))
      }))
    });

    await Promise.all(workout.exercises.map((exercise) => Exercise.findOneAndUpdate(
      { user: req.user._id, name: exercise.name },
      {
        user: req.user._id,
        name: exercise.name,
        category: exercise.category,
        personalRecordKg: Math.max(0, ...exercise.sets.map((set) => set.weightKg || 0))
      },
      { upsert: true, new: true }
    )));

    res.status(201).json({ workout });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    res.json({ workout });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found' });
    res.json({ message: 'Workout deleted' });
  } catch (error) {
    next(error);
  }
};

exports.exercises = async (req, res, next) => {
  try {
    const exercises = await Exercise.find({ user: req.user._id }).sort({ category: 1, name: 1 });
    res.json({ exercises });
  } catch (error) {
    next(error);
  }
};
