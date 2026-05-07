const StepLog = require('../models/StepLog');
const { toNumber } = require('../utils/validation');

const todayKey = () => new Date().toISOString().slice(0, 10);

const deriveStepStats = (steps) => ({
  distanceKm: +(steps * 0.00078).toFixed(2),
  calories: Math.round(steps * 0.04),
  activeMinutes: Math.round(steps / 110)
});

exports.list = async (req, res, next) => {
  try {
    const logs = await StepLog.find({ user: req.user._id }).sort({ date: -1 }).limit(60);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

exports.today = async (req, res, next) => {
  try {
    const date = req.query.date || todayKey();
    const log = await StepLog.findOne({ user: req.user._id, date });
    res.json({ log: log || { date, steps: 0, goal: 10000, ...deriveStepStats(0) } });
  } catch (error) {
    next(error);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const date = req.body.date || todayKey();
    const increment = toNumber(req.body.increment);
    const explicitSteps = req.body.steps === undefined ? null : toNumber(req.body.steps);
    const goal = toNumber(req.body.goal, 10000);
    const existing = await StepLog.findOne({ user: req.user._id, date });
    const nextSteps = Math.max(0, explicitSteps !== null ? explicitSteps : (existing?.steps || 0) + increment);
    const derived = deriveStepStats(nextSteps);

    const log = await StepLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        user: req.user._id,
        date,
        steps: nextSteps,
        goal,
        ...derived,
        source: req.body.source === 'sensor' ? 'sensor' : 'manual'
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ log });
  } catch (error) {
    next(error);
  }
};
