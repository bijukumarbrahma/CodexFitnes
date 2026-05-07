const ProgressPhoto = require('../models/ProgressPhoto');
const { cleanString, toNumber } = require('../utils/validation');

exports.list = async (req, res, next) => {
  try {
    const photos = await ProgressPhoto.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ photos });
  } catch (error) {
    next(error);
  }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Photo file is required' });
    const photo = await ProgressPhoto.create({
      user: req.user._id,
      imageUrl: `/uploads/${req.file.filename}`,
      caption: cleanString(req.body.caption),
      date: req.body.date || new Date().toISOString().slice(0, 10),
      weightKg: toNumber(req.body.weightKg),
      visibility: req.body.visibility === 'leaderboard' ? 'leaderboard' : 'private'
    });
    res.status(201).json({ photo });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const photo = await ProgressPhoto.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!photo) return res.status(404).json({ message: 'Photo not found' });
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};
