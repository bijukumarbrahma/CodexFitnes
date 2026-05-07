const User = require('../models/User');
const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const ProgressPhoto = require('../models/ProgressPhoto');

exports.overview = async (req, res, next) => {
  try {
    const [users, workouts, meals, photos, flaggedPhotos] = await Promise.all([
      User.countDocuments(),
      Workout.countDocuments(),
      NutritionLog.countDocuments(),
      ProgressPhoto.countDocuments(),
      ProgressPhoto.find({ flagged: true }).populate('user', 'name email').sort({ createdAt: -1 })
    ]);

    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(12);
    const topUsers = await Workout.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$user', workouts: { $sum: 1 }, calories: { $sum: '$caloriesBurned' } } },
      { $sort: { workouts: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { workouts: 1, calories: 1, 'user.name': 1, 'user.email': 1 } }
    ]);

    res.json({
      stats: { users, workouts, meals, photos },
      recentUsers,
      topUsers,
      flaggedPhotos
    });
  } catch (error) {
    next(error);
  }
};

exports.users = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Admins cannot delete their own account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    await ProgressPhoto.findByIdAndDelete(req.params.id);
    res.json({ message: 'Photo removed' });
  } catch (error) {
    next(error);
  }
};
