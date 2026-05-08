const jwt = require('jsonwebtoken');
const supabaseConfig = require('../config/supabase');

const todayKey = () => new Date().toISOString().slice(0, 10);
const lastNDays = (days) => {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
};

const publicProfile = (profile) => ({
  _id: profile.id,
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  bio: profile.bio || '',
  heightCm: profile.height_cm || 175,
  currentWeightKg: profile.current_weight_kg || 75,
  targetWeightKg: profile.target_weight_kg || 72,
  calorieTarget: profile.calorie_target || 2400,
  proteinTarget: profile.protein_target || 160,
  carbTarget: profile.carb_target || 260,
  fatTarget: profile.fat_target || 70,
  waterTargetMl: profile.water_target_ml || 3000,
  streak: profile.streak || 0,
  createdAt: profile.created_at,
  updatedAt: profile.updated_at
});

const signToken = (profile) => jwt.sign(
  { id: profile.id, role: profile.role, provider: 'supabase' },
  process.env.JWT_SECRET || 'dev-secret-change-me',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const requireAuth = async (req, client) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', decoded.id)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
};

const sumMeals = (log) => (log?.meals || []).reduce((acc, meal) => {
  acc.calories += Number(meal.calories) || 0;
  acc.protein += Number(meal.protein) || 0;
  acc.carbs += Number(meal.carbs) || 0;
  acc.fats += Number(meal.fats) || 0;
  return acc;
}, { calories: 0, protein: 0, carbs: 0, fats: 0 });

const deriveSteps = (steps) => ({
  distance_km: +(steps * 0.00078).toFixed(2),
  calories: Math.round(steps * 0.04),
  active_minutes: Math.round(steps / 110)
});

const normalizeWorkout = (workout) => ({
  _id: workout.id,
  ...workout,
  user: workout.user_id,
  scheduledFor: workout.scheduled_for,
  startedAt: workout.started_at,
  completedAt: workout.completed_at,
  durationMin: workout.duration_min,
  caloriesBurned: workout.calories_burned,
  exercises: workout.exercises || [],
  createdAt: workout.created_at,
  updatedAt: workout.updated_at
});

const normalizeBody = (stat) => ({
  _id: stat.id,
  user: stat.user_id,
  date: stat.date,
  weightKg: stat.weight_kg,
  heightCm: stat.height_cm,
  bodyFatPercent: stat.body_fat_percent,
  measurements: stat.measurements || {},
  createdAt: stat.created_at
});

const normalizeGoal = (goal) => ({
  _id: goal.id,
  user: goal.user_id,
  title: goal.title,
  category: goal.category,
  target: goal.target,
  current: goal.current,
  unit: goal.unit,
  completed: goal.completed,
  dueDate: goal.due_date,
  createdAt: goal.created_at
});

const normalizeStep = (log) => ({
  _id: log.id,
  user: log.user_id,
  date: log.date,
  steps: log.steps,
  goal: log.goal,
  distanceKm: log.distance_km,
  calories: log.calories,
  activeMinutes: log.active_minutes,
  source: log.source,
  createdAt: log.created_at
});

const normalizeNutrition = (log) => log && ({
  _id: log.id,
  user: log.user_id,
  date: log.date,
  meals: log.meals || [],
  waterMl: log.water_ml || 0,
  createdAt: log.created_at
});

async function dashboard(client, profile) {
  const days = lastNDays(14);
  const today = todayKey();
  const user = publicProfile(profile);

  const [workoutsRes, nutritionRes, bodyRes, goalsRes, stepsRes, photosRes] = await Promise.all([
    client.from('workouts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(80),
    client.from('nutrition_logs').select('*').eq('user_id', profile.id).in('date', days),
    client.from('body_stats').select('*').eq('user_id', profile.id).order('date', { ascending: true }).limit(60),
    client.from('goals').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20),
    client.from('step_logs').select('*').eq('user_id', profile.id).in('date', days).order('date', { ascending: true }),
    client.from('progress_photos').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(8)
  ]);

  const workouts = (workoutsRes.data || []).map(normalizeWorkout);
  const nutritionLogs = (nutritionRes.data || []).map(normalizeNutrition);
  const bodyStats = (bodyRes.data || []).map(normalizeBody);
  const goals = (goalsRes.data || []).map(normalizeGoal);
  const stepLogs = (stepsRes.data || []).map(normalizeStep);
  const photos = (photosRes.data || []).map((photo) => ({
    _id: photo.id,
    user: photo.user_id,
    imageUrl: photo.image_url,
    caption: photo.caption,
    date: photo.date,
    weightKg: photo.weight_kg
  }));

  const todayNutrition = nutritionLogs.find((log) => log.date === today);
  const todaySteps = stepLogs.find((log) => log.date === today) || {
    steps: 0,
    goal: 10000,
    distanceKm: 0,
    calories: 0,
    activeMinutes: 0
  };
  const macros = sumMeals(todayNutrition);
  const completed = workouts.filter((workout) => workout.status === 'completed');
  const latestBody = bodyStats.at(-1);
  const previousBody = bodyStats.at(-2);
  const weight = latestBody?.weightKg || user.currentWeightKg || 75;
  const heightM = ((latestBody?.heightCm || user.heightCm || 175) / 100);
  const bmi = heightM ? +(weight / (heightM * heightM)).toFixed(1) : 0;
  const goalCompletion = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + Math.min(100, (goal.current / goal.target) * 100), 0) / goals.length)
    : 0;

  return {
    user,
    stats: {
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
      waterMl: todayNutrition?.waterMl || 0,
      streak: user.streak || completed.length,
      weeklyWorkouts: completed.length,
      caloriesBurned: completed.reduce((sum, workout) => sum + (Number(workout.caloriesBurned) || 0), 0),
      goalCompletion,
      steps: todaySteps.steps,
      stepGoal: todaySteps.goal,
      stepDistanceKm: todaySteps.distanceKm,
      stepCalories: todaySteps.calories,
      stepActiveMinutes: todaySteps.activeMinutes,
      stepCompletion: Math.min(100, Math.round((todaySteps.steps / todaySteps.goal) * 100)),
      bmi,
      weight,
      weightDelta: previousBody ? +(weight - previousBody.weightKg).toFixed(1) : 0,
      performanceScore: Math.min(99, Math.round(54 + completed.length * 7 + goalCompletion * 0.24))
    },
    workouts,
    nutrition: todayNutrition,
    bodyStats,
    goals,
    photos,
    stepLogs,
    chart: {
      labels: days.map((day) => day.slice(5)),
      calories: days.map((day) => sumMeals(nutritionLogs.find((log) => log.date === day)).calories),
      workouts: days.map((day) => completed.filter((workout) => (workout.completedAt || workout.createdAt || '').slice(0, 10) === day).length),
      steps: days.map((day) => stepLogs.find((log) => log.date === day)?.steps || 0),
      weight: bodyStats.slice(-14).map((stat) => ({ date: stat.date.slice(5), value: stat.weightKg })),
      strength: completed.slice(0, 12).reverse().map((workout) => ({
        label: workout.title.slice(0, 10),
        value: Math.max(0, ...workout.exercises.flatMap((exercise) => (exercise.sets || []).map((set) => Number(set.weightKg) || 0)))
      }))
    },
    smart: {
      greeting: `Ready for a sharp session, ${user.name.split(' ')[0]}?`,
      recommendation: completed.length < 3 ? 'Log one focused workout today to start your rhythm.' : 'Your week has momentum. Add mobility and keep the lifts crisp.',
      quote: 'Discipline compounds. Tiny wins become visible later.',
      reward: completed.length >= 4 ? 'Iron Week badge unlocked' : 'Complete 4 workouts this week to unlock Iron Week.'
    }
  };
}

module.exports = async function supabaseApi(req, res, next) {
  if (!supabaseConfig.enabled()) return next();

  let client;
  let authClient;
  try {
    client = supabaseConfig.service();
    authClient = supabaseConfig.anon();
  } catch (error) {
    return res.status(503).json({ message: error.message });
  }

  const path = req.path;
  const method = req.method;

  try {
    if (method === 'GET' && path === '/health') {
      return res.json({ status: 'ok', app: 'Codex Fitness', database: 'supabase', time: new Date().toISOString() });
    }

    if (method === 'POST' && path === '/auth/register') {
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      if (!name || !email.includes('@') || password.length < 6) {
        return res.status(400).json({ message: 'Name, valid email, and 6+ character password are required' });
      }

      const { count } = await client.from('profiles').select('id', { count: 'exact', head: true });
      const created = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });
      if (created.error) return res.status(400).json({ message: created.error.message });

      const profile = {
        id: created.data.user.id,
        name,
        email,
        role: count === 0 ? 'admin' : 'user',
        height_cm: 175,
        current_weight_kg: 75,
        target_weight_kg: 72,
        calorie_target: 2400,
        protein_target: 160,
        carb_target: 260,
        fat_target: 70,
        water_target_ml: 3000,
        streak: 1
      };

      const saved = await client.from('profiles').insert(profile).select('*').single();
      if (saved.error) return res.status(400).json({ message: saved.error.message });

      return res.status(201).json({
        token: signToken(saved.data),
        user: publicProfile(saved.data),
        provider: 'supabase'
      });
    }

    if (method === 'POST' && (path === '/auth/login' || path === '/api/auth/login')) {
      // Minimal diagnostics (helpful on Netlify)
      try {
        console.log('[auth/login]', {
          reqPath: path,
          method,
          hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
          jwtSecretSet: !!process.env.JWT_SECRET
        });
      } catch {}

      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const login = await authClient.auth.signInWithPassword({ email, password });
      if (login.error || !login.data.user) {
        console.log('[auth/login] signIn failed', {
          message: login.error?.message || 'unknown',
          status: login.error?.status
        });
        return res.status(401).json({ message: login.error?.message || 'Invalid email or password' });
      }


      let { data: profile, error } = await client.from('profiles').select('*').eq('id', login.data.user.id).single();
      if (error || !profile) {
        const fallbackProfile = {
          id: login.data.user.id,
          email,
          name: login.data.user.user_metadata?.name || email.split('@')[0],
          role: 'user'
        };
        const created = await client.from('profiles').insert(fallbackProfile).select('*').single();
        if (created.error) return res.status(400).json({ message: created.error.message });
        profile = created.data;
      }

      await client.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', profile.id);
      return res.json({ token: signToken(profile), user: publicProfile(profile), provider: 'supabase' });
    }

    if (method === 'POST' && path === '/auth/forgot-password') {
      return res.json({ message: 'Use Supabase Auth email templates to send password reset links.' });
    }

    const profile = await requireAuth(req, client);
    if (!profile) return res.status(401).json({ message: 'Authentication required' });

    if (method === 'GET' && path === '/auth/me') {
      return res.json({ user: publicProfile(profile), provider: 'supabase' });
    }

    if (method === 'GET' && path === '/users/dashboard') {
      return res.json(await dashboard(client, profile));
    }

    if (method === 'POST' && path === '/workouts') {
      const payload = {
        user_id: profile.id,
        title: req.body.title || 'Workout',
        type: req.body.type || 'Strength',
        status: req.body.status || 'completed',
        started_at: req.body.startedAt || new Date().toISOString(),
        completed_at: req.body.completedAt || new Date().toISOString(),
        duration_min: Number(req.body.durationMin) || 45,
        calories_burned: Number(req.body.caloriesBurned) || 0,
        exercises: Array.isArray(req.body.exercises) ? req.body.exercises : [],
        notes: req.body.notes || ''
      };
      const { data, error } = await client.from('workouts').insert(payload).select('*').single();
      if (error) return res.status(400).json({ message: error.message });
      return res.status(201).json({ workout: normalizeWorkout(data) });
    }

    if (method === 'GET' && path === '/workouts') {
      const { data, error } = await client.from('workouts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
      if (error) return res.status(400).json({ message: error.message });
      return res.json({ workouts: (data || []).map(normalizeWorkout) });
    }

    if (method === 'POST' && path === '/nutrition/meal') {
      const date = req.body.date || todayKey();
      const { data: existing } = await client.from('nutrition_logs').select('*').eq('user_id', profile.id).eq('date', date).maybeSingle();
      const meals = existing?.meals || [];
      meals.push({
        name: req.body.name || 'Meal',
        calories: Number(req.body.calories) || 0,
        protein: Number(req.body.protein) || 0,
        carbs: Number(req.body.carbs) || 0,
        fats: Number(req.body.fats) || 0,
        time: req.body.time || '12:00'
      });

      const { data, error } = await client.from('nutrition_logs').upsert({
        id: existing?.id,
        user_id: profile.id,
        date,
        meals,
        water_ml: existing?.water_ml || 0
      }).select('*').single();
      if (error) return res.status(400).json({ message: error.message });
      return res.status(201).json({ log: normalizeNutrition(data) });
    }

    if (method === 'POST' && path === '/nutrition/water') {
      const date = req.body.date || todayKey();
      const { data: existing } = await client.from('nutrition_logs').select('*').eq('user_id', profile.id).eq('date', date).maybeSingle();
      const { data, error } = await client.from('nutrition_logs').upsert({
        id: existing?.id,
        user_id: profile.id,
        date,
        meals: existing?.meals || [],
        water_ml: (existing?.water_ml || 0) + (Number(req.body.amountMl) || 250)
      }).select('*').single();
      if (error) return res.status(400).json({ message: error.message });
      return res.json({ log: normalizeNutrition(data) });
    }

    if (method === 'PUT' && path === '/body') {
      const date = req.body.date || todayKey();
      const { data: existing } = await client.from('body_stats').select('id').eq('user_id', profile.id).eq('date', date).maybeSingle();
      const payload = {
        id: existing?.id,
        user_id: profile.id,
        date,
        weight_kg: Number(req.body.weightKg) || profile.current_weight_kg || 75,
        height_cm: Number(req.body.heightCm) || profile.height_cm || 175,
        body_fat_percent: Number(req.body.bodyFatPercent) || 0,
        measurements: { waist: Number(req.body.waist) || 0 }
      };
      const { data, error } = await client.from('body_stats').upsert(payload).select('*').single();
      if (error) return res.status(400).json({ message: error.message });
      await client.from('profiles').update({ current_weight_kg: payload.weight_kg, height_cm: payload.height_cm }).eq('id', profile.id);
      return res.json({ stat: normalizeBody(data) });
    }

    if (method === 'POST' && path === '/goals') {
      const { data, error } = await client.from('goals').insert({
        user_id: profile.id,
        title: req.body.title || 'Fitness goal',
        category: req.body.category || 'Consistency',
        current: Number(req.body.current) || 0,
        target: Number(req.body.target) || 100,
        unit: req.body.unit || '%'
      }).select('*').single();
      if (error) return res.status(400).json({ message: error.message });
      return res.status(201).json({ goal: normalizeGoal(data) });
    }

    if (method === 'POST' && path === '/steps') {
      const date = req.body.date || todayKey();
      const { data: existing } = await client.from('step_logs').select('*').eq('user_id', profile.id).eq('date', date).maybeSingle();
      const explicitSteps = req.body.steps === undefined ? null : Number(req.body.steps);
      const steps = Math.max(0, explicitSteps !== null ? explicitSteps : (existing?.steps || 0) + (Number(req.body.increment) || 0));
      const derived = deriveSteps(steps);
      const { data, error } = await client.from('step_logs').upsert({
        id: existing?.id,
        user_id: profile.id,
        date,
        steps,
        goal: Number(req.body.goal) || existing?.goal || 10000,
        ...derived,
        source: req.body.source === 'sensor' ? 'sensor' : 'manual'
      }).select('*').single();
      if (error) return res.status(400).json({ message: error.message });
      return res.json({ log: normalizeStep(data) });
    }

    if (method === 'GET' && path === '/steps') {
      const { data, error } = await client.from('step_logs').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(60);
      if (error) return res.status(400).json({ message: error.message });
      return res.json({ logs: (data || []).map(normalizeStep) });
    }

    if (method === 'GET' && path === '/admin/overview') {
      if (profile.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const [users, workouts, meals, photos] = await Promise.all([
        client.from('profiles').select('id', { count: 'exact', head: true }),
        client.from('workouts').select('id', { count: 'exact', head: true }),
        client.from('nutrition_logs').select('id', { count: 'exact', head: true }),
        client.from('progress_photos').select('id', { count: 'exact', head: true })
      ]);
      const recent = await client.from('profiles').select('*').order('created_at', { ascending: false }).limit(12);
      return res.json({
        stats: { users: users.count || 0, workouts: workouts.count || 0, meals: meals.count || 0, photos: photos.count || 0 },
        recentUsers: (recent.data || []).map(publicProfile),
        topUsers: [],
        flaggedPhotos: []
      });
    }

    if (path.startsWith('/photos')) {
      return res.status(501).json({ message: 'Supabase Storage is not wired yet. Use database features first, then connect Storage for uploads.' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Supabase API error' });
  }
};
