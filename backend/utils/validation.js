const validator = require('validator');

exports.cleanString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return validator.escape(value.trim());
};

exports.toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

exports.isEmail = (email) => validator.isEmail(String(email || ''));
