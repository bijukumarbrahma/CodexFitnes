/* Firebase data operations for Codex Fitness */
const todayKey = () => new Date().toISOString().slice(0, 10);
const lastNDays = (n) => {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
};
const sumMeals = (log) => (log?.meals || []).reduce((a, m) => {
  a.calories += Number(m.calories) || 0; a.protein += Number(m.protein) || 0;
  a.carbs += Number(m.carbs) || 0; a.fats += Number(m.fats) || 0; return a;
}, { calories: 0, protein: 0, carbs: 0, fats: 0 });
const deriveSteps = (s) => ({ distanceKm: +(s * 0.00078).toFixed(2), calories: Math.round(s * 0.04), activeMinutes: Math.round(s / 110) });

const FireData = {
  async getProfile(uid) {
    const doc = await db.collection('profiles').doc(uid).get();
    return doc.exists ? { _id: uid, id: uid, ...doc.data() } : null;
  },
  async createProfile(uid, data) {
    const profile = {
      name: data.name, email: data.email, role: data.role || 'user',
      bio: '', heightCm: 175, currentWeightKg: 75, targetWeightKg: 72,
      calorieTarget: 2400, proteinTarget: 160, carbTarget: 260, fatTarget: 70,
      waterTargetMl: 3000, streak: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await db.collection('profiles').doc(uid).set(profile);
    return { _id: uid, id: uid, ...profile };
  },
  async updateProfile(uid, updates) {
    updates.updatedAt = new Date().toISOString();
    await db.collection('profiles').doc(uid).update(updates);
  },
  async addWorkout(uid, data) {
    const payload = {
      userId: uid, title: data.title || 'Workout', type: data.type || 'Strength',
      status: data.status || 'completed', startedAt: data.startedAt || new Date().toISOString(),
      completedAt: data.completedAt || new Date().toISOString(),
      durationMin: Number(data.durationMin) || 45, caloriesBurned: Number(data.caloriesBurned) || 0,
      exercises: Array.isArray(data.exercises) ? data.exercises : [], notes: data.notes || '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const ref = await db.collection('workouts').add(payload);
    return { _id: ref.id, ...payload };
  },
  async getWorkouts(uid) {
    const snap = await db.collection('workouts').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(80).get();
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  },
  async addMeal(uid, data) {
    const date = data.date || todayKey();
    const docId = `${uid}_${date}`;
    const ref = db.collection('nutrition_logs').doc(docId);
    const existing = await ref.get();
    const meals = existing.exists ? (existing.data().meals || []) : [];
    meals.push({ name: data.name || 'Meal', calories: Number(data.calories) || 0, protein: Number(data.protein) || 0, carbs: Number(data.carbs) || 0, fats: Number(data.fats) || 0, time: data.time || '12:00' });
    const payload = { userId: uid, date, meals, waterMl: existing.exists ? (existing.data().waterMl || 0) : 0, updatedAt: new Date().toISOString() };
    if (!existing.exists) payload.createdAt = new Date().toISOString();
    await ref.set(payload, { merge: true });
    return { _id: docId, ...payload };
  },
  async addWater(uid, amountMl) {
    const date = todayKey();
    const docId = `${uid}_${date}`;
    const ref = db.collection('nutrition_logs').doc(docId);
    const existing = await ref.get();
    const current = existing.exists ? (existing.data().waterMl || 0) : 0;
    const payload = { userId: uid, date, meals: existing.exists ? (existing.data().meals || []) : [], waterMl: current + (Number(amountMl) || 250), updatedAt: new Date().toISOString() };
    if (!existing.exists) payload.createdAt = new Date().toISOString();
    await ref.set(payload, { merge: true });
    return payload;
  },
  async getNutritionLogs(uid, days) {
    const snap = await db.collection('nutrition_logs').where('userId', '==', uid).where('date', 'in', days.slice(0, 10)).get();
    let results = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    if (days.length > 10) {
      const snap2 = await db.collection('nutrition_logs').where('userId', '==', uid).where('date', 'in', days.slice(10)).get();
      results = results.concat(snap2.docs.map(d => ({ _id: d.id, ...d.data() })));
    }
    return results;
  },
  async addBodyStat(uid, data) {
    const date = data.date || todayKey();
    const docId = `${uid}_${date}`;
    const payload = {
      userId: uid, date, weightKg: Number(data.weightKg) || 75, heightCm: Number(data.heightCm) || 175,
      bodyFatPercent: Number(data.bodyFatPercent) || 0, measurements: { waist: Number(data.waist) || 0 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await db.collection('body_stats').doc(docId).set(payload, { merge: true });
    await this.updateProfile(uid, { currentWeightKg: payload.weightKg, heightCm: payload.heightCm });
    return { _id: docId, ...payload };
  },
  async getBodyStats(uid) {
    const snap = await db.collection('body_stats').where('userId', '==', uid).orderBy('date', 'asc').limit(60).get();
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  },
  async addGoal(uid, data) {
    const payload = {
      userId: uid, title: data.title || 'Fitness goal', category: data.category || 'Consistency',
      current: Number(data.current) || 0, target: Number(data.target) || 100, unit: data.unit || '%',
      completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const ref = await db.collection('goals').add(payload);
    return { _id: ref.id, ...payload };
  },
  async getGoals(uid) {
    const snap = await db.collection('goals').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(20).get();
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  },
  async addSteps(uid, data) {
    const date = data.date || todayKey();
    const docId = `${uid}_${date}`;
    const ref = db.collection('step_logs').doc(docId);
    const existing = await ref.get();
    const explicitSteps = data.steps === undefined ? null : Number(data.steps);
    const steps = Math.max(0, explicitSteps !== null ? explicitSteps : (existing.exists ? (existing.data().steps || 0) : 0) + (Number(data.increment) || 0));
    const derived = deriveSteps(steps);
    const payload = {
      userId: uid, date, steps, goal: Number(data.goal) || (existing.exists ? existing.data().goal : 10000),
      distanceKm: derived.distanceKm, calories: derived.calories, activeMinutes: derived.activeMinutes,
      source: data.source === 'sensor' ? 'sensor' : 'manual',
      createdAt: existing.exists ? existing.data().createdAt : new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await ref.set(payload);
    return { _id: docId, ...payload };
  },
  async getStepLogs(uid, days) {
    const snap = await db.collection('step_logs').where('userId', '==', uid).where('date', 'in', days.slice(0, 10)).get();
    let results = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    if (days.length > 10) {
      const snap2 = await db.collection('step_logs').where('userId', '==', uid).where('date', 'in', days.slice(10)).get();
      results = results.concat(snap2.docs.map(d => ({ _id: d.id, ...d.data() })));
    }
    return results.sort((a, b) => a.date.localeCompare(b.date));
  },
  async getPhotos(uid) {
    const snap = await db.collection('progress_photos').where('userId', '==', uid).orderBy('createdAt', 'desc').limit(8).get();
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  },
  async buildDashboard(uid) {
    const days = lastNDays(14);
    const today = todayKey();
    const profile = await this.getProfile(uid);
    if (!profile) return null;
    const user = profile;
    const [workouts, nutritionLogs, bodyStats, goals, stepLogs, photos] = await Promise.all([
      this.getWorkouts(uid), this.getNutritionLogs(uid, days), this.getBodyStats(uid),
      this.getGoals(uid), this.getStepLogs(uid, days), this.getPhotos(uid)
    ]);
    const todayNutrition = nutritionLogs.find(l => l.date === today);
    const todaySteps = stepLogs.find(l => l.date === today) || { steps: 0, goal: 10000, distanceKm: 0, calories: 0, activeMinutes: 0 };
    const macros = sumMeals(todayNutrition);
    const completed = workouts.filter(w => w.status === 'completed');
    const latestBody = bodyStats.at(-1);
    const previousBody = bodyStats.at(-2);
    const weight = latestBody?.weightKg || user.currentWeightKg || 75;
    const heightM = ((latestBody?.heightCm || user.heightCm || 175) / 100);
    const bmi = heightM ? +(weight / (heightM * heightM)).toFixed(1) : 0;
    const goalCompletion = goals.length ? Math.round(goals.reduce((s, g) => s + Math.min(100, (g.current / g.target) * 100), 0) / goals.length) : 0;
    return {
      user, workouts, nutrition: todayNutrition, bodyStats, goals, photos, stepLogs,
      stats: {
        calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fats: macros.fats,
        waterMl: todayNutrition?.waterMl || 0, streak: user.streak || completed.length,
        weeklyWorkouts: completed.length, caloriesBurned: completed.reduce((s, w) => s + (Number(w.caloriesBurned) || 0), 0),
        goalCompletion, steps: todaySteps.steps, stepGoal: todaySteps.goal,
        stepDistanceKm: todaySteps.distanceKm, stepCalories: todaySteps.calories,
        stepActiveMinutes: todaySteps.activeMinutes,
        stepCompletion: Math.min(100, Math.round((todaySteps.steps / todaySteps.goal) * 100)),
        bmi, weight, weightDelta: previousBody ? +(weight - previousBody.weightKg).toFixed(1) : 0,
        performanceScore: Math.min(99, Math.round(54 + completed.length * 7 + goalCompletion * 0.24))
      },
      chart: {
        labels: days.map(d => d.slice(5)),
        calories: days.map(d => sumMeals(nutritionLogs.find(l => l.date === d)).calories),
        workouts: days.map(d => completed.filter(w => (w.completedAt || w.createdAt || '').slice(0, 10) === d).length),
        steps: days.map(d => stepLogs.find(l => l.date === d)?.steps || 0),
        weight: bodyStats.slice(-14).map(s => ({ date: s.date.slice(5), value: s.weightKg })),
        strength: completed.slice(0, 12).reverse().map(w => ({
          label: w.title.slice(0, 10),
          value: Math.max(0, ...w.exercises.flatMap(e => (e.sets || []).map(s => Number(s.weightKg) || 0)))
        }))
      },
      smart: {
        greeting: `Ready for a sharp session, ${user.name.split(' ')[0]}?`,
        recommendation: completed.length < 3 ? 'Log one focused workout today to start your rhythm.' : 'Your week has momentum. Add mobility and keep the lifts crisp.',
        quote: 'Discipline compounds. Tiny wins become visible later.',
        reward: completed.length >= 4 ? 'Iron Week badge unlocked' : 'Complete 4 workouts this week to unlock Iron Week.'
      }
    };
  },
  async getAdminOverview(uid) {
    const profile = await this.getProfile(uid);
    if (!profile || profile.role !== 'admin') throw new Error('Admin access required');
    const [usersSnap, workoutsSnap, mealsSnap, photosSnap] = await Promise.all([
      db.collection('profiles').get(), db.collection('workouts').get(),
      db.collection('nutrition_logs').get(), db.collection('progress_photos').get()
    ]);
    const allProfiles = usersSnap.docs.map(d => ({ _id: d.id, id: d.id, ...d.data() }));
    return {
      stats: { users: usersSnap.size, workouts: workoutsSnap.size, meals: mealsSnap.size, photos: photosSnap.size },
      recentUsers: allProfiles.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 12),
      topUsers: [], flaggedPhotos: []
    };
  }
};
