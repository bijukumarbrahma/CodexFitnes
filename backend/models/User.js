const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: String,
  bio: {
    type: String,
    maxlength: 220,
    default: ''
  },
  heightCm: {
    type: Number,
    default: 175
  },
  currentWeightKg: {
    type: Number,
    default: 75
  },
  targetWeightKg: {
    type: Number,
    default: 72
  },
  calorieTarget: {
    type: Number,
    default: 2400
  },
  proteinTarget: {
    type: Number,
    default: 160
  },
  carbTarget: {
    type: Number,
    default: 260
  },
  fatTarget: {
    type: Number,
    default: 70
  },
  waterTargetMl: {
    type: Number,
    default: 3000
  },
  streak: {
    type: Number,
    default: 0
  },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toClient = function toClient() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
