const User = require('../models/User');
const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const BodyStat = require('../models/BodyStat');
const Goal = require('../models/Goal');
const ProgressPhoto = require('../models/ProgressPhoto');
const { cleanString, toNumber } = require('../utils/validation');

const todayKey = () => new Date().toISOString().slice(0, 10);
const lastNDays = (days) => {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
};

const sumMeals = (log) => (log?.meals || []).reduce((acc, meal) => {
  acc.calories += meal.calories || 0;
  acc.protein += meal.protein || 0;
  acc.carbs += meal.carbs || 0;
  acc.fats += meal.fats || 0;
  return acc;
}, { calories: 0, protein: 0, carbs: 0, fats: 0 });

exports.updateProfile = async (req, res, next) => {
  try {
    const fields = ['name', 'bio', 'heightCm', 'currentWeightKg', 'targetWeightKg', 'calorieTarget', 'proteinTarget', 'carbTarget', 'fatTarget', 'waterTargetMl'];
    const updates = {};

    fields.forEach((field) => {
      if (req.body[field] === undefined) return;
      updates[field] = typeof req.body[field] === 'string' && !field.endsWith('Kg') && !field.endsWith('Cm') && !field.endsWith('Ml') && !field.includes('Target')
        ? cleanString(req.body[field])
        : toNumber(req.body[field]);
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const days = lastNDays(14);
    const today = todayKey();
    const [workouts, nutritionLogs, bodyStats, goals, photos] = await Promise.all([
      Workout.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(80),
      NutritionLog.find({ user: req.user._id, date: { $in: days } }),
      BodyStat.find({ user: req.user._id }).sort({ date: 1 }).limit(60),
      Goal.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20),
      ProgressPhoto.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8)
    ]);

    const todayNutrition = nutritionLogs.find((log) => log.date === today);
    const macroTotals = sumMeals(todayNutrition);
    const completed = workouts.filter((w) => w.status === 'completed');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);

    const weeklyWorkouts = completed.filter((w) => new Date(w.completedAt || w.updatedAt) >= weekStart);
    const latestBody = bodyStats.at(-1);
    const previousBody = bodyStats.at(-2);
    const heightM = (latestBody?.heightCm || req.user.heightCm || 175) / 100;
    const weight = latestBody?.weightKg || req.user.currentWeightKg || 75;
    const bmi = heightM ? +(weight / (heightM * heightM)).toFixed(1) : 0;

    const totalGoalProgress = goals.length
      ? Math.round(goals.reduce((sum, goal) => sum + Math.min(100, (goal.current / goal.target) * 100), 0) / goals.length)
      : 62;

    const chart = {
      labels: days.map((day) => day.slice(5)),
      calories: days.map((day) => sumMeals(nutritionLogs.find((log) => log.date === day)).calories),
      workouts: days.map((day) => completed.filter((w) => (w.completedAt || w.updatedAt).toISOString().slice(0, 10) === day).length),
      weight: bodyStats.slice(-14).map((stat) => ({ date: stat.date.slice(5), value: stat.weightKg })),
      strength: completed.slice(0, 12).reverse().map((w) => ({
        label: w.title.slice(0, 10),
        value: w.exercises.reduce((max, ex) => Math.max(max, ...ex.sets.map((set) => set.weightKg || 0)), 0)
      }))
    };

    const volume = completed.reduce((sum, workout) => sum + workout.exercises.reduce((inner, ex) => {
      return inner + ex.sets.reduce((setSum, set) => setSum + ((set.weightKg || 0) * (set.reps || 0)), 0);
    }, 0), 0);

    res.json({
      user: req.user,
      stats: {
        calories: macroTotals.calories,
        protein: macroTotals.protein,
        carbs: macroTotals.carbs,
        fats: macroTotals.fats,
        waterMl: todayNutrition?.waterMl || 0,
        streak: req.user.streak || weeklyWorkouts.length,
        weeklyWorkouts: weeklyWorkouts.length,
        caloriesBurned: weeklyWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
        goalCompletion: totalGoalProgress,
        bmi,
        weight,
        weightDelta: previousBody ? +(weight - previousBody.weightKg).toFixed(1) : 0,
        performanceScore: Math.min(99, Math.round(55 + weeklyWorkouts.length * 6 + totalGoalProgress * 0.18 + volume / 2500))
      },
      workouts,
      nutrition: todayNutrition,
      bodyStats,
      goals,
      photos,
      chart,
      smart: {
        greeting: `Ready for a sharp session, ${req.user.name.split(' ')[0]}?`,
        recommendation: weeklyWorkouts.length < 3 ? 'Book a push/pull session today to protect your weekly rhythm.' : 'Add a lighter recovery session and chase quality reps.',
        quote: 'Discipline compounds. Tiny wins become visible later.',
        reward: weeklyWorkouts.length >= 4 ? 'Iron Week badge unlocked' : 'Complete 4 workouts this week to unlock Iron Week.'
      }
    });
  } catch (error) {
    next(error);
  }
};
