const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./backend/config/db');
const errorHandler = require('./backend/middleware/error');
const requireDatabase = require('./backend/middleware/database');
const localFallback = require('./backend/middleware/localFallback');

const authRoutes = require('./backend/routes/authRoutes');
const userRoutes = require('./backend/routes/userRoutes');
const workoutRoutes = require('./backend/routes/workoutRoutes');
const nutritionRoutes = require('./backend/routes/nutritionRoutes');
const bodyRoutes = require('./backend/routes/bodyRoutes');
const goalRoutes = require('./backend/routes/goalRoutes');
const photoRoutes = require('./backend/routes/photoRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use('/uploads', express.static(path.join(__dirname, 'backend', 'uploads')));
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Codex Fitness', time: new Date().toISOString() });
});

app.use('/api', localFallback);
app.use('/api', requireDatabase);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/body', bodyRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/admin', adminRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Codex Fitness running on http://localhost:${PORT}`);
});
