const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const store = require('../utils/localStore');

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET || 'dev-secret-change-me',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const publicUser = (user) => {
  const copy = { ...user };
  delete copy.password;
  return copy;
};

const authUser = (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    return store.read().users.find((user) => user._id === decoded.id) || null;
  } catch {
    return null;
  }
};

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
  acc.calories += Number(meal.calories) || 0;
  acc.protein += Number(meal.protein) || 0;
  acc.carbs += Number(meal.carbs) || 0;
  acc.fats += Number(meal.fats) || 0;
  return acc;
}, { calories: 0, protein: 0, carbs: 0, fats: 0 });

function localDashboard(user) {
  const db = store.read();
  const days = lastNDays(14);
  const today = todayKey();
  const workouts = db.workouts.filter((workout) => workout.user === user._id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const nutritionLogs = db.nutrition.filter((log) => log.user === user._id);
  const bodyStats = db.bodyStats.filter((stat) => stat.user === user._id).sort((a, b) => a.date.localeCompare(b.date));
  const goals = db.goals.filter((goal) => goal.user === user._id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const photos = db.photos.filter((photo) => photo.user === user._id);
  const stepLogs = (db.steps || []).filter((log) => log.user === user._id);
  const todayNutrition = nutritionLogs.find((log) => log.date === today);
  const todaySteps = stepLogs.find((log) => log.date === today) || {
    steps: 0,
    goal: 10000,
    distanceKm: 0,
    calories: 0,
    activeMinutes: 0
  };
  const macroTotals = sumMeals(todayNutrition);
  const completed = workouts.filter((workout) => workout.status === 'completed');
  const latestBody = bodyStats.at(-1);
  const previousBody = bodyStats.at(-2);
  const weight = latestBody?.weightKg || user.currentWeightKg || 75;
  const heightM = ((latestBody?.heightCm || user.heightCm || 175) / 100);
  const bmi = heightM ? +(weight / (heightM * heightM)).toFixed(1) : 0;
  const goalCompletion = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + Math.min(100, (goal.current / goal.target) * 100), 0) / goals.length)
    : 0;

  return {
    user: publicUser(user),
    stats: {
      calories: macroTotals.calories,
      protein: macroTotals.protein,
      carbs: macroTotals.carbs,
      fats: macroTotals.fats,
      waterMl: todayNutrition?.waterMl || 0,
      streak: user.streak || completed.length,
      weeklyWorkouts: completed.length,
      caloriesBurned: completed.reduce((sum, workout) => sum + (Number(workout.caloriesBurned) || 0), 0),
      goalCompletion,
      steps: todaySteps.steps,
      stepGoal: todaySteps.goal,
      stepDistanceKm: todaySteps.distanceKm,
      stepCalories: todaySteps.calories,
      stepActiveMinutes: todaySteps.activeMinutes,
      stepCompletion: Math.min(100, Math.round((todaySteps.steps / todaySteps.goal) * 100)),
      bmi,
      weight,
      weightDelta: previousBody ? +(weight - previousBody.weightKg).toFixed(1) : 0,
      performanceScore: Math.min(99, Math.round(54 + completed.length * 7 + goalCompletion * 0.24))
    },
    workouts,
    nutrition: todayNutrition,
    bodyStats,
    goals,
    photos,
    stepLogs,
    chart: {
      labels: days.map((day) => day.slice(5)),
      calories: days.map((day) => sumMeals(nutritionLogs.find((log) => log.date === day)).calories),
      workouts: days.map((day) => completed.filter((workout) => (workout.completedAt || workout.createdAt || '').slice(0, 10) === day).length),
      steps: days.map((day) => stepLogs.find((log) => log.date === day)?.steps || 0),
      weight: bodyStats.slice(-14).map((stat) => ({ date: stat.date.slice(5), value: stat.weightKg })),
      strength: completed.slice(0, 12).reverse().map((workout) => ({
        label: workout.title.slice(0, 10),
        value: Math.max(0, ...workout.exercises.flatMap((exercise) => exercise.sets.map((set) => Number(set.weightKg) || 0)))
      }))
    },
    smart: {
      greeting: `Ready for a sharp session, ${user.name.split(' ')[0]}?`,
      recommendation: completed.length < 3 ? 'Log one focused workout today to start your rhythm.' : 'Your week has momentum. Add mobility and keep the lifts crisp.',
      quote: 'Discipline compounds. Tiny wins become visible later.',
      reward: completed.length >= 4 ? 'Iron Week badge unlocked' : 'Complete 4 workouts this week to unlock Iron Week.'
    }
  };
}

module.exports = async function localFallback(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();

  const path = req.path;
  const method = req.method;
  const now = new Date().toISOString();

  try {
    if (method === 'POST' && path === '/auth/register') {
      const db = store.read();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const name = String(req.body.name || '').trim();

      if (!name || !email.includes('@') || password.length < 6) {
        return res.status(400).json({ message: 'Name, valid email, and 6+ character password are required' });
      }

      if (db.users.some((user) => user.email === email)) {
        return res.status(409).json({ message: 'Email is already registered' });
      }

      const user = {
        _id: store.id(),
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role: db.users.length === 0 ? 'admin' : 'user',
        heightCm: 175,
        currentWeightKg: 75,
        targetWeightKg: 72,
        calorieTarget: 2400,
        proteinTarget: 160,
        carbTarget: 260,
        fatTarget: 70,
        waterTargetMl: 3000,
        streak: 1,
        createdAt: now,
        updatedAt: now
      };
      db.users.push(user);
      store.write(db);
      return res.status(201).json({ token: signToken(user), user: publicUser(user), mode: 'local-json' });
    }

    if (method === 'POST' && path === '/auth/login') {
      const db = store.read();
      const email = String(req.body.email || '').trim().toLowerCase();
      const user = db.users.find((item) => item.email === email);
      if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      user.lastLoginAt = now;
      store.write(db);
      return res.json({ token: signToken(user), user: publicUser(user), mode: 'local-json' });
    }

    if (method === 'POST' && path === '/auth/forgot-password') {
      return res.json({ message: 'Password reset UI captured. Local demo mode does not send emails.' });
    }

    const user = authUser(req);
    if (!user) return res.status(401).json({ message: 'Authentication required' });

    if (method === 'GET' && path === '/auth/me') {
      return res.json({ user: publicUser(user), mode: 'local-json' });
    }

    if (method === 'GET' && path === '/users/dashboard') {
      return res.json(localDashboard(user));
    }

    if (method === 'POST' && path === '/nutrition/water') {
      const db = store.read();
      const date = req.body.date || todayKey();
      let log = db.nutrition.find((item) => item.user === user._id && item.date === date);
      if (!log) {
        log = { _id: store.id(), user: user._id, date, meals: [], waterMl: 0, createdAt: now, updatedAt: now };
        db.nutrition.push(log);
      }
      log.waterMl += Number(req.body.amountMl) || 250;
      log.updatedAt = now;
      store.write(db);
      return res.json({ log });
    }

    if (method === 'POST' && path === '/nutrition/meal') {
      const db = store.read();
      const date = req.body.date || todayKey();
      let log = db.nutrition.find((item) => item.user === user._id && item.date === date);
      if (!log) {
        log = { _id: store.id(), user: user._id, date, meals: [], waterMl: 0, createdAt: now, updatedAt: now };
        db.nutrition.push(log);
      }
      log.meals.push({
        name: req.body.name || 'Meal',
        calories: Number(req.body.calories) || 0,
        protein: Number(req.body.protein) || 0,
        carbs: Number(req.body.carbs) || 0,
        fats: Number(req.body.fats) || 0,
        time: req.body.time || '12:00'
      });
      log.updatedAt = now;
      store.write(db);
      return res.status(201).json({ log });
    }

    if (method === 'POST' && path === '/workouts') {
      const db = store.read();
      const workout = {
        _id: store.id(),
        user: user._id,
        title: req.body.title || 'Workout',
        type: req.body.type || 'Strength',
        status: req.body.status || 'completed',
        startedAt: req.body.startedAt || now,
        completedAt: req.body.completedAt || now,
        durationMin: Number(req.body.durationMin) || 45,
        caloriesBurned: Number(req.body.caloriesBurned) || 0,
        exercises: Array.isArray(req.body.exercises) ? req.body.exercises : [],
        createdAt: now,
        updatedAt: now
      };
      db.workouts.push(workout);
      user.streak = Math.max(1, Number(user.streak) || 1);
      store.write(db);
      return res.status(201).json({ workout });
    }

    if (method === 'PUT' && path === '/body') {
      const db = store.read();
      const stat = {
        _id: store.id(),
        user: user._id,
        date: req.body.date || todayKey(),
        weightKg: Number(req.body.weightKg) || user.currentWeightKg || 75,
        heightCm: Number(req.body.heightCm) || user.heightCm || 175,
        bodyFatPercent: Number(req.body.bodyFatPercent) || 0,
        measurements: {
          waist: Number(req.body.waist) || 0
        },
        createdAt: now,
        updatedAt: now
      };
      db.bodyStats = db.bodyStats.filter((item) => !(item.user === user._id && item.date === stat.date));
      db.bodyStats.push(stat);
      user.currentWeightKg = stat.weightKg;
      user.heightCm = stat.heightCm;
      store.write(db);
      return res.json({ stat });
    }

    if (method === 'POST' && path === '/goals') {
      const db = store.read();
      const goal = {
        _id: store.id(),
        user: user._id,
        title: req.body.title || 'Fitness goal',
        category: req.body.category || 'Consistency',
        current: Number(req.body.current) || 0,
        target: Number(req.body.target) || 100,
        unit: req.body.unit || '%',
        completed: false,
        createdAt: now,
        updatedAt: now
      };
      db.goals.push(goal);
      store.write(db);
      return res.status(201).json({ goal });
    }

    if (method === 'GET' && path === '/steps') {
      const db = store.read();
      const logs = (db.steps || []).filter((log) => log.user === user._id).sort((a, b) => b.date.localeCompare(a.date));
      return res.json({ logs });
    }

    if (method === 'GET' && path === '/steps/today') {
      const db = store.read();
      const date = req.query.date || todayKey();
      const log = (db.steps || []).find((item) => item.user === user._id && item.date === date);
      return res.json({ log: log || { date, steps: 0, goal: 10000, distanceKm: 0, calories: 0, activeMinutes: 0 } });
    }

    if (method === 'POST' && path === '/steps') {
      const db = store.read();
      db.steps = db.steps || [];
      const date = req.body.date || todayKey();
      const goal = Number(req.body.goal) || 10000;
      const existing = db.steps.find((item) => item.user === user._id && item.date === date);
      const explicitSteps = req.body.steps === undefined ? null : Number(req.body.steps);
      const steps = Math.max(0, explicitSteps !== null ? explicitSteps : (existing?.steps || 0) + (Number(req.body.increment) || 0));
      const log = existing || { _id: store.id(), user: user._id, date, createdAt: now };

      log.steps = steps;
      log.goal = goal;
      log.distanceKm = +(steps * 0.00078).toFixed(2);
      log.calories = Math.round(steps * 0.04);
      log.activeMinutes = Math.round(steps / 110);
      log.source = req.body.source === 'sensor' ? 'sensor' : 'manual';
      log.updatedAt = now;

      if (!existing) db.steps.push(log);
      store.write(db);
      return res.json({ log });
    }

    if (method === 'GET' && path === '/admin/overview' && user.role === 'admin') {
      const db = store.read();
      const recentUsers = db.users.map(publicUser).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({
        stats: {
          users: db.users.length,
          workouts: db.workouts.length,
          meals: db.nutrition.length,
          photos: db.photos.length
        },
        recentUsers,
        topUsers: [],
        flaggedPhotos: []
      });
    }

    return res.status(503).json({
      message: 'This feature needs MongoDB. Login/signup and core dashboard features are running in local demo mode.'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Local fallback error' });
  }
};
