const mongoose = require('mongoose');

module.exports = function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'MongoDB is not connected. Start MongoDB or update MONGO_URI in .env, then retry.'
    });
  }
  next();
};
