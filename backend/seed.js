require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Workout = require('./models/Workout');
const NutritionLog = require('./models/NutritionLog');
const BodyStat = require('./models/BodyStat');
const Goal = require('./models/Goal');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codex_fitness';

const dateKey = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

async function seed() {
  await mongoose.connect(uri);
  const existingDemo = await User.findOne({ email: 'demo@codexfit.demo' });
  if (existingDemo) {
    await Promise.all([
      Workout.deleteMany({ user: existingDemo._id }),
      NutritionLog.deleteMany({ user: existingDemo._id }),
      BodyStat.deleteMany({ user: existingDemo._id }),
      Goal.deleteMany({ user: existingDemo._id }),
      User.deleteOne({ _id: existingDemo._id })
    ]);
  }

  const user = await User.create({
    name: 'Demo Athlete',
    email: 'demo@codexfit.demo',
    password: 'password123',
    role: 'admin',
    heightCm: 178,
    currentWeightKg: 78,
    targetWeightKg: 74,
    calorieTarget: 2500,
    proteinTarget: 175,
    carbTarget: 270,
    fatTarget: 75,
    waterTargetMl: 3200,
    streak: 7
  });

  await Workout.create([
    {
      user: user._id,
      title: 'Demo Push Strength',
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      durationMin: 58,
      caloriesBurned: 420,
      exercises: [
        { name: 'Bench Press', category: 'Chest', sets: [{ reps: 10, weightKg: 70 }, { reps: 8, weightKg: 80 }, { reps: 5, weightKg: 90 }] },
        { name: 'Shoulder Press', category: 'Shoulders', sets: [{ reps: 10, weightKg: 35 }, { reps: 8, weightKg: 40 }] }
      ]
    },
    {
      user: user._id,
      title: 'Demo Legs Volume',
      status: 'completed',
      startedAt: new Date(Date.now() - 2 * 86400000),
      completedAt: new Date(Date.now() - 2 * 86400000),
      durationMin: 64,
      caloriesBurned: 510,
      exercises: [
        { name: 'Squat', category: 'Legs', sets: [{ reps: 8, weightKg: 100 }, { reps: 6, weightKg: 115 }, { reps: 4, weightKg: 125 }] }
      ]
    }
  ]);

  await NutritionLog.create({
    user: user._id,
    date: dateKey(),
    waterMl: 2250,
    meals: [
      { name: 'Oats and whey', calories: 520, protein: 42, carbs: 68, fats: 10, time: '08:30' },
      { name: 'Chicken rice bowl', calories: 720, protein: 58, carbs: 82, fats: 18, time: '13:10' }
    ]
  });

  await BodyStat.create([
    { user: user._id, date: dateKey(-14), weightKg: 80.4, heightCm: 178, bodyFatPercent: 19.5, measurements: { waist: 86 } },
    { user: user._id, date: dateKey(-7), weightKg: 79.1, heightCm: 178, bodyFatPercent: 18.8, measurements: { waist: 84 } },
    { user: user._id, date: dateKey(), weightKg: 78, heightCm: 178, bodyFatPercent: 18.1, measurements: { waist: 82 } }
  ]);

  await Goal.create([
    { user: user._id, title: 'Bench press 100kg', category: 'Strength', current: 90, target: 100, unit: 'kg' },
    { user: user._id, title: 'Four workouts weekly', category: 'Consistency', current: 3, target: 4, unit: 'sessions' },
    { user: user._id, title: 'Protein target streak', category: 'Nutrition', current: 5, target: 7, unit: 'days' }
  ]);

  await mongoose.disconnect();
  console.log('Seed complete: demo@codexfit.demo / password123');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
