const Goal = require('../models/Goal');
const { cleanString, toNumber } = require('../utils/validation');

exports.list = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ goals });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const goal = await Goal.create({
      user: req.user._id,
      title: cleanString(req.body.title, 'Fitness goal'),
      category: req.body.category || 'Consistency',
      target: toNumber(req.body.target, 100),
      current: toNumber(req.body.current),
      unit: cleanString(req.body.unit, '%'),
      dueDate: req.body.dueDate || undefined
    });
    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = {
      ...req.body,
      completed: req.body.completed === true || toNumber(req.body.current) >= toNumber(req.body.target, Infinity)
    };
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ goal });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    next(error);
  }
};
