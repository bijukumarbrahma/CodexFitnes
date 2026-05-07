const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isEmail, cleanString } = require('../utils/validation');

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET || 'dev-secret-change-me',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const sendAuth = (res, user, status = 200) => {
  const token = signToken(user);
  res.status(status).json({ token, user: user.toClient ? user.toClient() : user });
};

exports.register = async (req, res, next) => {
  try {
    const name = cleanString(req.body.name);
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !isEmail(email) || password.length < 6) {
      return res.status(400).json({ message: 'Name, valid email, and 6+ character password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const role = await User.countDocuments() === 0 ? 'admin' : 'user';
    const user = await User.create({ name, email, password, role, lastLoginAt: new Date() });
    sendAuth(res, user, 201);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    user.streak = Math.max(1, user.streak || 1);
    await user.save();
    sendAuth(res, user);
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.forgotPassword = async (req, res) => {
  res.json({
    message: 'Password reset UI captured. Connect an email provider to send secure reset links in production.'
  });
};
