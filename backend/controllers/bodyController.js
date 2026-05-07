const BodyStat = require('../models/BodyStat');
const User = require('../models/User');
const { toNumber } = require('../utils/validation');

exports.list = async (req, res, next) => {
  try {
    const stats = await BodyStat.find({ user: req.user._id }).sort({ date: -1 }).limit(100);
    res.json({ stats });
  } catch (error) {
    next(error);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const stat = await BodyStat.findOneAndUpdate(
      { user: req.user._id, date },
      {
        user: req.user._id,
        date,
        weightKg: toNumber(req.body.weightKg, req.user.currentWeightKg),
        heightCm: toNumber(req.body.heightCm, req.user.heightCm),
        bodyFatPercent: toNumber(req.body.bodyFatPercent),
        measurements: {
          chest: toNumber(req.body.chest),
          waist: toNumber(req.body.waist),
          hips: toNumber(req.body.hips),
          arms: toNumber(req.body.arms),
          thighs: toNumber(req.body.thighs)
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    await User.findByIdAndUpdate(req.user._id, {
      currentWeightKg: stat.weightKg,
      heightCm: stat.heightCm
    });

    const heightM = stat.heightCm / 100;
    const bmi = heightM ? +(stat.weightKg / (heightM * heightM)).toFixed(1) : 0;
    res.json({ stat, bmi });
  } catch (error) {
    next(error);
  }
};
