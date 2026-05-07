module.exports = function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.statusCode || 500;
  res.status(status).json({
    message: error.message || 'Server error',
    details: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
};
