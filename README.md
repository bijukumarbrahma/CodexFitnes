# Codex Fitness

Premium gym-focused fitness tracker built with HTML, CSS, vanilla JavaScript, Node.js, Express, JWT auth, and MongoDB.

## Features

- Signup, login, JWT sessions, hashed passwords, forgot password UI, secure logout
- Dashboard for calories, streaks, water, BMI, weekly workouts, calories burned, goals, timer, recovery, and heatmap
- Workout logging with exercises, sets, reps, weight, PR history, categories, and rest timer
- Nutrition tracking for calories, protein, carbs, fats, meals, water, and macro progress
- Body tracking with BMI, weight history, body fat, measurements, and progress photo uploads
- Chart.js analytics for weight, calories, consistency, strength, and admin growth
- Smart JavaScript recommendations, rewards, motivational copy, daily challenges, leaderboard surfaces
- Responsive Apple-inspired glassmorphism UI with dark/light mode, mobile bottom nav, modals, animations, and PWA support
- Admin panel for user management, platform stats, top users, and content moderation

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from the example:

   ```bash
   copy .env.example .env
   ```

3. Start MongoDB locally, or set `MONGO_URI` in `.env` to your MongoDB Atlas connection string.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open:

   ```text
   http://localhost:5000
   ```

If MongoDB is not installed yet, the app automatically uses a local development JSON store so signup/login still work on your computer. MongoDB is still used automatically as soon as `MONGO_URI` connects.

## Demo Data

After MongoDB is running, seed a demo admin account:

```bash
npm run seed
```

Login:

```text
demo@codexfit.demo
password123
```

The first real account registered in an empty database also becomes an admin.

## Project Structure

```text
index.html
login.html
register.html
dashboard.html
admin.html
css/styles.css
js/app.js
app.js
backend/
  config/
  controllers/
  middleware/
  models/
  routes/
  uploads/
```

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users/dashboard`
- `PUT /api/users/profile`
- `GET|POST /api/workouts`
- `PUT|DELETE /api/workouts/:id`
- `GET|PUT /api/nutrition`
- `POST /api/nutrition/meal`
- `POST /api/nutrition/water`
- `GET|PUT /api/body`
- `GET|POST /api/goals`
- `PUT|DELETE /api/goals/:id`
- `GET|POST /api/photos`
- `GET /api/admin/overview`

## Production Notes

- Set a long random `JWT_SECRET`.
- Use MongoDB Atlas or a managed MongoDB service.
- Put the app behind HTTPS.
- Replace the forgot password placeholder with a signed token email flow.
- Use persistent object storage for uploads in production.
