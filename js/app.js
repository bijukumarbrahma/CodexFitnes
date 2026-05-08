const storage = {
  get user() { try { return JSON.parse(localStorage.getItem('fit_user') || 'null'); } catch { return null; } },
  set user(v) { localStorage.setItem('fit_user', JSON.stringify(v)); },
  get theme() { return localStorage.getItem('fit_theme') || 'light'; },
  set theme(v) { localStorage.setItem('fit_theme', v); }
};
let dashboardState = null;
const chartInstances = {};
const stepCounterState = { running: false, sessionSteps: 0, lastPeakAt: 0, lastMagnitude: 0, handler: null };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const page = () => document.body.querySelector('[data-page]')?.dataset.page;
const clamp = (v, m = 100) => Math.max(0, Math.min(m, Number(v) || 0));
const today = () => new Date().toISOString().slice(0, 10);
function initTheme() { document.documentElement.dataset.theme = storage.theme; }
function toggleTheme() { storage.theme = storage.theme === 'dark' ? 'light' : 'dark'; initTheme(); }
function toast(msg) {
  const stack = $('#toastStack') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast-stack', id: 'toastStack' }));
  const item = document.createElement('div'); item.className = 'toast'; item.textContent = msg;
  stack.appendChild(item); setTimeout(() => item.remove(), 3600);
}
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function setProgress(id, v) { const el = document.getElementById(id); if (el) el.style.setProperty('--value', `${clamp(v)}%`); }
function requireAuth() {
  if (!auth.currentUser) { location.href = 'login.html'; return false; } return true;
}
function redirectIfAuthed() {
  auth.onAuthStateChanged(u => { if (u && page() === 'home') location.href = 'dashboard.html'; });
}
function decorate() {
  initTheme(); window.lucide?.createIcons();
  $('#themeToggle')?.addEventListener('click', toggleTheme);
  $('#logoutBtn')?.addEventListener('click', () => {
    auth.signOut().then(() => { localStorage.removeItem('fit_user'); toast('Logged out'); setTimeout(() => { location.href = 'login.html'; }, 250); });
  });
  if ('serviceWorker' in navigator && !['localhost','127.0.0.1'].includes(location.hostname)) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
function initAuthForms() {
  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { email, password } = formObject(e.currentTarget);
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const profile = await FireData.getProfile(cred.user.uid);
      if (profile) { storage.user = profile; await FireData.updateProfile(cred.user.uid, { lastLoginAt: new Date().toISOString() }); }
      toast('Session restored'); location.href = 'dashboard.html';
    } catch (err) { toast(err.message); }
  });
  $('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { name, email, password } = formObject(e.currentTarget);
      if (!name || !email.includes('@') || password.length < 6) { toast('Name, valid email, and 6+ char password required'); return; }
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const profile = await FireData.createProfile(cred.user.uid, { name, email, role: 'user' });
      storage.user = profile; toast('Account created'); location.href = 'dashboard.html';
    } catch (err) { toast(err.message); }
  });
  $('#forgotBtn')?.addEventListener('click', async () => {
    try {
      const email = $('#email')?.value || '';
      await auth.sendPasswordResetEmail(email); toast('Password reset email sent');
    } catch (err) { toast(err.message); }
  });
}
function initNavigation() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-section-target]'); if (!btn) return;
    const target = btn.dataset.sectionTarget; const section = document.getElementById(target); if (!section) return;
    $$('.section').forEach(el => el.classList.toggle('active', el.id === target));
    $$('[data-section-target]').forEach(el => el.classList.toggle('active', el.dataset.sectionTarget === target));
    setText('pageTitle', btn.textContent.trim() || target);
  });
}
function initModals() {
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-modal]');
    const closer = e.target.closest('[data-close-modal]');
    if (opener) document.getElementById(opener.dataset.openModal)?.classList.add('open');
    if (closer) closer.closest('.modal')?.classList.remove('open');
    if (e.target.classList.contains('modal')) e.target.classList.remove('open');
  });
}
function renderHeatmap(workouts = []) {
  const heatmap = $('#heatmap'); if (!heatmap) return; heatmap.innerHTML = '';
  const days = Array.from({ length: 28 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (27 - i)); return d.toISOString().slice(0, 10); });
  days.forEach(day => {
    const count = workouts.filter(w => { const v = w.completedAt || w.updatedAt || w.createdAt; return v && new Date(v).toISOString().slice(0, 10) === day; }).length;
    const cell = document.createElement('div'); cell.className = 'heat-cell';
    cell.dataset.level = count > 2 ? '3' : String(count); cell.title = `${day}: ${count} workout${count === 1 ? '' : 's'}`;
    heatmap.appendChild(cell);
  });
}
function renderWorkoutList(workouts = []) {
  const list = $('#workoutList'); const history = $('#exerciseHistory'); if (!list) return;
  if (!workouts.length) { list.innerHTML = '<div class="empty-state">No workouts yet. Start with one focused session.</div>'; if (history) history.innerHTML = '<div class="empty-state">Exercise history appears after your first workout.</div>'; return; }
  list.innerHTML = workouts.slice(0, 12).map(w => {
    const sets = w.exercises?.reduce((s, ex) => s + (ex.sets?.length || 0), 0) || 0;
    const volume = w.exercises?.reduce((s, ex) => s + ex.sets.reduce((a, set) => a + (set.weightKg || 0) * (set.reps || 0), 0), 0) || 0;
    return `<div class="list-row"><div><p class="list-title">${w.title}</p><p class="list-meta">${sets} sets · ${Math.round(volume)} kg volume · ${w.status}</p></div><span class="pill ${w.status === 'completed' ? 'good' : ''}">${w.caloriesBurned || 0} kcal</span></div>`;
  }).join('');
  if (history) {
    const exercises = workouts.flatMap(w => w.exercises || []).slice(0, 8);
    history.innerHTML = exercises.length ? exercises.map(ex => {
      const pr = Math.max(0, ...ex.sets.map(s => s.weightKg || 0));
      return `<div class="list-row"><div><p class="list-title">${ex.name}</p><p class="list-meta">${ex.category} · ${ex.sets.length} sets</p></div><span class="pill good">PR ${pr}kg</span></div>`;
    }).join('') : '<div class="empty-state">Exercise history appears after your first workout.</div>';
  }
}
function renderNutrition(state) {
  const nutrition = state.nutrition || { meals: [], waterMl: 0 }; const stats = state.stats || {}; const user = state.user || {};
  const meals = nutrition.meals || [];
  setText('mealCount', `${meals.length} meal${meals.length === 1 ? '' : 's'}`);
  setText('proteinText', `${stats.protein || 0}g / ${user.proteinTarget || 160}g`);
  setText('carbsText', `${stats.carbs || 0}g / ${user.carbTarget || 260}g`);
  setText('fatsText', `${stats.fats || 0}g / ${user.fatTarget || 70}g`);
  setProgress('proteinBar', ((stats.protein || 0) / (user.proteinTarget || 160)) * 100);
  setProgress('carbsBar', ((stats.carbs || 0) / (user.carbTarget || 260)) * 100);
  setProgress('fatsBar', ((stats.fats || 0) / (user.fatTarget || 70)) * 100);
  const mealList = $('#mealList'); if (!mealList) return;
  mealList.innerHTML = meals.length ? meals.map(m => `<div class="list-row"><div><p class="list-title">${m.name}</p><p class="list-meta">${m.protein}g protein · ${m.carbs}g carbs · ${m.fats}g fats</p></div><span class="pill">${m.calories} kcal</span></div>`).join('') : '<div class="empty-state">Meals logged today will stack here.</div>';
}
function renderBody(state) {
  const bodyList = $('#bodyList'); const photoGrid = $('#photoGrid');
  const stats = state.bodyStats || []; const photos = state.photos || [];
  if (bodyList) {
    bodyList.innerHTML = stats.length ? stats.slice(-8).reverse().map(s => {
      const bmi = s.heightCm ? (s.weightKg / ((s.heightCm / 100) ** 2)).toFixed(1) : '0';
      return `<div class="list-row"><div><p class="list-title">${s.date}</p><p class="list-meta">${s.bodyFatPercent || 0}% body fat · BMI ${bmi}</p></div><span class="pill">${s.weightKg} kg</span></div>`;
    }).join('') : '<div class="empty-state">Log weight and measurements to build your trendline.</div>';
  }
  if (photoGrid) {
    photoGrid.innerHTML = photos.length ? photos.map(p => `<article class="photo-card"><img src="${p.imageUrl}" alt="${p.caption || 'Progress photo'}" loading="lazy"><div>${p.date} · ${p.weightKg || ''}kg</div></article>`).join('') : '<div class="empty-state" style="grid-column: 1 / -1;">Transformation photos stay private by default.</div>';
  }
}
function renderGoals(goals = []) {
  const list = $('#goalList'); if (!list) return;
  list.innerHTML = goals.length ? goals.map(g => {
    const pct = clamp((g.current / g.target) * 100);
    return `<div class="list-row"><div style="width:100%;"><p class="list-title">${g.title}</p><p class="list-meta">${g.category} · ${g.current}/${g.target}${g.unit}</p><div class="progress" style="margin-top:10px;"><span style="--value:${pct}%;"></span></div></div><span class="pill ${pct >= 100 ? 'good' : ''}">${Math.round(pct)}%</span></div>`;
  }).join('') : '<div class="empty-state">Set a target for strength, weight, nutrition, consistency, or recovery.</div>';
}
function renderSteps(state) {
  const stats = state.stats || {}; const logs = state.stepLogs || [];
  const steps = Number(stats.steps) || 0; const goal = Number(stats.stepGoal) || 10000;
  const completion = Math.min(100, Math.round((steps / goal) * 100));
  setText('stepsValue', steps.toLocaleString()); setText('stepsSub', `of ${goal.toLocaleString()} goal`);
  setText('stepsLargeValue', steps.toLocaleString()); setText('stepsGoalText', `${steps.toLocaleString()} / ${goal.toLocaleString()}`);
  setText('stepCaloriesText', `${stats.stepCalories || 0} kcal`); setText('stepDistanceText', `${stats.stepDistanceKm || 0} km`);
  setText('stepMinutesText', `${stats.stepActiveMinutes || 0} min`); setProgress('stepsBar', completion);
  const ring = $('#stepsRing');
  if (ring) { ring.dataset.label = `${completion}%`; ring.style.setProperty('--p', completion); }
  const history = $('#stepHistory');
  if (history) {
    history.innerHTML = logs.length ? logs.slice(-7).reverse().map(l => `<div class="list-row"><div><p class="list-title">${Number(l.steps || 0).toLocaleString()} steps</p><p class="list-meta">${l.date} · ${l.distanceKm || 0} km · ${l.source || 'manual'}</p></div><span class="pill ${l.steps >= l.goal ? 'good' : ''}">${Math.min(100, Math.round((l.steps / l.goal) * 100))}%</span></div>`).join('') : '<div class="empty-state">Step history appears after you log your first walk.</div>';
  }
}
function lineChart(id, labels, data, label, color) {
  const canvas = document.getElementById(id); if (!canvas || !window.Chart) return;
  chartInstances[id]?.destroy();
  chartInstances[id] = new Chart(canvas, { type: 'line', data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: `${color}24`, fill: true, tension: 0.42, pointRadius: 3 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(125,158,184,.16)' }, beginAtZero: true } }, animation: { duration: 850, easing: 'easeOutQuart' } } });
}
function barChart(id, labels, data, label, color) {
  const canvas = document.getElementById(id); if (!canvas || !window.Chart) return;
  chartInstances[id]?.destroy();
  chartInstances[id] = new Chart(canvas, { type: 'bar', data: { labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 12 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(125,158,184,.16)' }, beginAtZero: true } }, animation: { duration: 850, easing: 'easeOutQuart' } } });
}
function renderCharts(state) {
  const chart = state.chart || {};
  const wp = chart.weight?.length ? chart.weight : [{ date: today().slice(5), value: state.stats?.weight || 75 }];
  const sp = chart.strength?.length ? chart.strength : [{ label: 'Start', value: 0 }];
  lineChart('weightChart', wp.map(p => p.date), wp.map(p => p.value), 'Weight', '#38bdf8');
  barChart('caloriesChart', chart.labels || [], chart.calories || [], 'Calories', '#5eead4');
  barChart('consistencyChart', chart.labels || [], chart.workouts || [], 'Workouts', '#fbbf24');
  lineChart('strengthChart', sp.map(p => p.label), sp.map(p => p.value), 'Strength', '#a78bfa');
  barChart('stepsChart', chart.labels || [], chart.steps || [], 'Steps', '#38bdf8');
}
function renderDashboard(state) {
  dashboardState = state; localStorage.setItem('fit_dashboard_cache', JSON.stringify(state)); storage.user = state.user;
  const stats = state.stats || {}; const user = state.user || {}; const smart = state.smart || {};
  $('#adminLink')?.toggleAttribute('hidden', user.role !== 'admin');
  setText('todayLabel', new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }));
  setText('smartGreeting', smart.greeting || `Ready, ${user.name || 'athlete'}?`);
  setText('smartRecommendation', smart.recommendation || 'Log one session to tune recommendations.');
  setText('heroGreeting', smart.greeting || "Own today's session.");
  setText('quoteText', smart.quote || 'Discipline compounds.');
  setText('rewardText', smart.reward || 'Daily challenge active');
  setText('caloriesValue', stats.calories || 0); setText('caloriesSub', `of ${user.calorieTarget || 2400} kcal target`);
  setText('streakValue', stats.streak || 0); setText('bmiValue', stats.bmi || 0);
  setText('weightSub', `${stats.weight || user.currentWeightKg || 0} kg · ${stats.weightDelta || 0} kg`);
  setText('burnedValue', stats.caloriesBurned || 0); setText('weeklyWorkouts', `${stats.weeklyWorkouts || 0} sessions`);
  setText('goalPercent', `${stats.goalCompletion || 0}%`); setText('waterText', `${stats.waterMl || 0} ml`);
  setProgress('goalBar', stats.goalCompletion || 0);
  setProgress('waterBar', ((stats.waterMl || 0) / (user.waterTargetMl || 3000)) * 100);
  const ring = $('#scoreRing');
  if (ring) { ring.dataset.label = stats.performanceScore || 0; ring.style.setProperty('--p', stats.performanceScore || 0); }
  renderHeatmap((state.workouts || []).filter(w => w.status === 'completed'));
  renderWorkoutList(state.workouts || []); renderNutrition(state); renderSteps(state);
  renderBody(state); renderGoals(state.goals || []); renderCharts(state); window.lucide?.createIcons();
}
async function loadDashboard() {
  if (!auth.currentUser) { location.href = 'login.html'; return; }
  try { const cache = localStorage.getItem('fit_dashboard_cache'); if (cache) renderDashboard(JSON.parse(cache)); } catch {}
  try {
    const state = await FireData.buildDashboard(auth.currentUser.uid);
    if (state) renderDashboard(state);
  } catch (err) { toast(err.message); }
}
function closeModalFrom(form) { form.closest('.modal')?.classList.remove('open'); form.reset(); }
function initDashboardForms() {
  const uid = () => auth.currentUser?.uid;
  $('#addWaterBtn')?.addEventListener('click', async () => { try { await FireData.addWater(uid(), 250); toast('Water logged'); await loadDashboard(); } catch (e) { toast(e.message); } });
  $('#workoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const d = formObject(e.currentTarget);
    const sets = [1,2,3].map(n => ({ weightKg: Number(d[`w${n}`]||0), reps: Number(d[`r${n}`]||0) }));
    try {
      await FireData.addWorkout(uid(), { title: d.title, status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMin: 52, caloriesBurned: Number(d.caloriesBurned||0), exercises: [{ name: d.exercise, category: d.category, sets }] });
      closeModalFrom(e.currentTarget); toast('Workout completed. PR scan updated.'); await loadDashboard();
    } catch (err) { toast(err.message); }
  });
  $('#mealForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); try { await FireData.addMeal(uid(), { ...formObject(e.currentTarget), date: today() }); closeModalFrom(e.currentTarget); toast('Meal logged'); await loadDashboard(); } catch (err) { toast(err.message); }
  });
  $('#bodyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); try { await FireData.addBodyStat(uid(), { ...formObject(e.currentTarget), date: today() }); closeModalFrom(e.currentTarget); toast('Body log saved'); await loadDashboard(); } catch (err) { toast(err.message); }
  });
  $('#goalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); try { await FireData.addGoal(uid(), formObject(e.currentTarget)); closeModalFrom(e.currentTarget); toast('Goal added'); await loadDashboard(); } catch (err) { toast(err.message); }
  });
  $('#photoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); toast('Photo uploads require Firebase Storage setup.'); closeModalFrom(e.currentTarget);
  });
  $('#stepsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); try { await FireData.addSteps(uid(), { ...formObject(e.currentTarget), date: today(), source: 'manual' }); closeModalFrom(e.currentTarget); toast('Footsteps saved'); await loadDashboard(); } catch (err) { toast(err.message); }
  });
}
async function saveSensorSteps() {
  if (!stepCounterState.sessionSteps) { toast('No sensor steps to save yet'); return; }
  try {
    await FireData.addSteps(auth.currentUser.uid, { increment: stepCounterState.sessionSteps, date: today(), goal: dashboardState?.stats?.stepGoal || 10000, source: 'sensor' });
    stepCounterState.sessionSteps = 0; setText('sensorSessionSteps', '0'); toast('Sensor steps saved'); await loadDashboard();
  } catch (err) { toast(err.message); }
}
async function initStepCounter() {
  const startBtn = $('#startStepCounterBtn'); const saveBtn = $('#saveSensorStepsBtn'); if (!startBtn) return;
  saveBtn?.addEventListener('click', saveSensorSteps);
  const updateStatus = (msg) => setText('sensorStepStatus', msg);
  const stop = () => { if (stepCounterState.handler) window.removeEventListener('devicemotion', stepCounterState.handler); stepCounterState.running = false; stepCounterState.handler = null; startBtn.querySelector('span').textContent = 'Start Sensor'; updateStatus('Sensor paused.'); };
  const start = async () => {
    if (!window.DeviceMotionEvent) { updateStatus('Motion sensor not available.'); return; }
    if (typeof DeviceMotionEvent.requestPermission === 'function') { const p = await DeviceMotionEvent.requestPermission(); if (p !== 'granted') { updateStatus('Motion permission denied.'); return; } }
    stepCounterState.running = true; startBtn.querySelector('span').textContent = 'Pause Sensor'; updateStatus('Sensor running.');
    stepCounterState.handler = (e) => {
      const r = e.accelerationIncludingGravity || e.acceleration; if (!r) return;
      const mag = Math.sqrt((r.x||0)**2 + (r.y||0)**2 + (r.z||0)**2); const now = Date.now();
      if (mag > 13.2 && stepCounterState.lastMagnitude <= 12.4 && now - stepCounterState.lastPeakAt > 320) {
        stepCounterState.sessionSteps++; stepCounterState.lastPeakAt = now; setText('sensorSessionSteps', stepCounterState.sessionSteps.toLocaleString());
      }
      stepCounterState.lastMagnitude = mag;
    };
    window.addEventListener('devicemotion', stepCounterState.handler);
  };
  startBtn.addEventListener('click', () => { if (stepCounterState.running) stop(); else start().catch(e => updateStatus(e.message)); });
}
function initTimers() {
  const init = (btnId, txtId, startSec, countDown = false) => {
    const btn = document.getElementById(btnId); const txt = document.getElementById(txtId); if (!btn || !txt) return;
    let timer = null, seconds = startSec;
    const paint = () => { txt.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; };
    paint();
    btn.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; btn.querySelector('span').textContent = 'Start'; return; }
      btn.querySelector('span').textContent = 'Pause';
      timer = setInterval(() => { seconds = countDown ? Math.max(0, seconds-1) : seconds+1; paint(); if (countDown && seconds === 0) { clearInterval(timer); timer = null; seconds = startSec; btn.querySelector('span').textContent = 'Start'; toast('Rest finished'); paint(); } }, 1000);
    });
  };
  init('timerBtn', 'timerText', 0, false); init('restTimerBtn', 'restTimerText', 90, true);
}
async function loadAdmin() {
  if (!auth.currentUser) { location.href = 'login.html'; return; }
  try {
    const data = await FireData.getAdminOverview(auth.currentUser.uid);
    const stats = data.stats || {};
    setText('adminUsers', stats.users || 0); setText('adminWorkouts', stats.workouts || 0);
    setText('adminMeals', stats.meals || 0); setText('adminPhotos', stats.photos || 0);
    setText('userCountPill', `${stats.users || 0} users`); setText('flaggedCount', `${data.flaggedPhotos?.length || 0} flagged`);
    const rows = $('#adminUserRows');
    if (rows) { rows.innerHTML = (data.recentUsers || []).map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td><span class="pill ${u.role === 'admin' ? 'good' : ''}">${u.role}</span></td><td>${new Date(u.createdAt).toLocaleDateString()}</td><td></td></tr>`).join(''); }
    const top = $('#topUsers');
    if (top) { top.innerHTML = (data.topUsers || []).length ? data.topUsers.map((it, i) => `<div class="list-row"><div><p class="list-title">${i+1}. ${it.user.name}</p><p class="list-meta">${it.workouts} workouts</p></div><span class="pill good">Active</span></div>`).join('') : '<div class="empty-state">Leaderboard fills as athletes log workouts.</div>'; }
    const flagged = $('#flaggedPhotos');
    if (flagged) { flagged.innerHTML = '<div class="empty-state">No flagged content.</div>'; }
    barChart('adminGrowthChart', ['Users','Workouts','Nutrition','Photos'], [stats.users, stats.workouts, stats.meals, stats.photos], 'Growth', '#38bdf8');
    window.lucide?.createIcons();
  } catch (err) { toast(err.message); if (err.message.includes('Admin')) setTimeout(() => { location.href = 'dashboard.html'; }, 600); }
}
document.addEventListener('DOMContentLoaded', () => {
  decorate(); redirectIfAuthed(); initAuthForms(); initNavigation(); initModals();
  if (page() === 'dashboard') {
    auth.onAuthStateChanged(u => { if (u) { loadDashboard(); initDashboardForms(); initTimers(); initStepCounter(); } else { location.href = 'login.html'; } });
  }
  if (page() === 'admin') {
    auth.onAuthStateChanged(u => { if (u) { loadAdmin(); } else { location.href = 'login.html'; } });
  }
});
