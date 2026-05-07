const NutritionLog = require('../models/NutritionLog');
const { cleanString, toNumber } = require('../utils/validation');

exports.list = async (req, res, next) => {
  try {
    const logs = await NutritionLog.find({ user: req.user._id }).sort({ date: -1 }).limit(60);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const meals = Array.isArray(req.body.meals) ? req.body.meals : [];
    const log = await NutritionLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        user: req.user._id,
        date,
        waterMl: toNumber(req.body.waterMl),
        meals: meals.map((meal) => ({
          name: cleanString(meal.name, 'Meal'),
          calories: toNumber(meal.calories),
          protein: toNumber(meal.protein),
          carbs: toNumber(meal.carbs),
          fats: toNumber(meal.fats),
          time: cleanString(meal.time, '12:00')
        }))
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ log });
  } catch (error) {
    next(error);
  }
};

exports.addMeal = async (req, res, next) => {
  try {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const meal = {
      name: cleanString(req.body.name, 'Meal'),
      calories: toNumber(req.body.calories),
      protein: toNumber(req.body.protein),
      carbs: toNumber(req.body.carbs),
      fats: toNumber(req.body.fats),
      time: cleanString(req.body.time, '12:00')
    };

    const log = await NutritionLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        $setOnInsert: { user: req.user._id, date },
        $push: { meals: meal },
        $inc: { waterMl: toNumber(req.body.waterMl) }
      },
      { upsert: true, new: true }
    );
    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
};

exports.water = async (req, res, next) => {
  try {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const log = await NutritionLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        $setOnInsert: { user: req.user._id, date, meals: [] },
        $inc: { waterMl: toNumber(req.body.amountMl, 250) }
      },
      { upsert: true, new: true }
    );
    res.json({ log });
  } catch (error) {
    next(error);
  }
};
