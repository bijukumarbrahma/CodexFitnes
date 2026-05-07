# Codex Fitness

Premium gym-focused fitness tracker built with HTML, CSS, vanilla JavaScript, Node.js, Express, JWT auth, and Supabase.

## Features

- Signup, login, JWT sessions, Supabase Auth password handling, forgot password UI, secure logout
- Dashboard for calories, streaks, water, BMI, weekly workouts, calories burned, goals, timer, recovery, and heatmap
- Workout logging with exercises, sets, reps, weight, PR history, categories, and rest timer
- Nutrition tracking for calories, protein, carbs, fats, meals, water, and macro progress
- Body tracking with BMI, weight history, body fat, measurements, and progress photo uploads
- Footstep tracking with manual step logs, daily goals, estimated distance, walking calories, active minutes, and mobile motion-sensor counting where supported
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

3. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL Editor.

4. Fill `.env` with your Supabase values:

   ```text
   USE_SUPABASE=true
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=a-long-random-secret
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5000
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open:

   ```text
   http://localhost:5000
   ```

The first account registered in an empty Supabase `profiles` table becomes an admin.

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
  middleware/
supabase/schema.sql
netlify/functions/api.js
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
- `GET|POST /api/photos` currently returns a Supabase Storage setup message
- `GET /api/admin/overview`

## Production Notes

- Set a long random `JWT_SECRET`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server environment variables.
- Put the app behind HTTPS.
- Replace the forgot password placeholder with a signed token email flow.
- Wire Supabase Storage before enabling progress photo uploads in production.

## Supabase Setup

The app uses Supabase for auth and database storage. The existing frontend calls the same `/api/*` routes through Express or Netlify Functions.

1. Create a Supabase project.
2. Open `SQL Editor` and run [supabase/schema.sql](supabase/schema.sql).
3. Copy your project URL, anon key, and service role key from `Project Settings > API`.
4. Add these environment variables locally and in Netlify:

```text
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-site-name.netlify.app
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend JavaScript. It belongs only in `.env` or Netlify environment variables.

## Netlify Deployment

This project includes Netlify Functions for the Express API. Netlify serves the frontend files and redirects `/api/*` to `netlify/functions/api.js`.

In Netlify, set these environment variables under `Site configuration > Environment variables`:

```text
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=a long random secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-site-name.netlify.app
```

Then redeploy the site. Login and signup will call the same deployed domain at `/api/auth/login` and `/api/auth/register`.
