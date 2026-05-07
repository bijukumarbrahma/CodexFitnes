const mongoose = require('mongoose');

const waitForConnection = () => new Promise((resolve) => {
  if (mongoose.connection.readyState === 1) return resolve(true);
  if (mongoose.connection.readyState !== 2) return resolve(false);

  const timeout = setTimeout(() => {
    cleanup();
    resolve(mongoose.connection.readyState === 1);
  }, 8000);

  const cleanup = () => {
    clearTimeout(timeout);
    mongoose.connection.off('connected', onConnected);
    mongoose.connection.off('error', onError);
  };

  const onConnected = () => {
    cleanup();
    resolve(true);
  };

  const onError = () => {
    cleanup();
    resolve(false);
  };

  mongoose.connection.once('connected', onConnected);
  mongoose.connection.once('error', onError);
});

module.exports = async function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState === 2) {
    await waitForConnection();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'MongoDB is not connected. Check MONGO_URI and Atlas Network Access, then retry.'
    });
  }
  next();
};
