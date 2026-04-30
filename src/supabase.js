import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mmwrvpuwqumqvnymdtzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1td3J2cHV3cXVtcXZueW1kdHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTUxMjYsImV4cCI6MjA5MjY5MTEyNn0.thsgc-resNiw14npwk4M12lxBlgmzYt01JHaafaysik';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== USERS =====

export async function findUserByName(name) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', name.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUser(name, avatarUrl = null) {
  const { data, error } = await supabase
    .from('users')
    .insert({ name: name.trim(), avatar_url: avatarUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update an existing user's avatar
export async function updateUserAvatar(userId, avatarUrl) {
  const { data, error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Resize an image file in browser before upload (keeps storage small)
async function resizeImage(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
      } else {
        if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Resize failed')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Upload an avatar image to Supabase storage and return its public URL
export async function uploadAvatar(userId, file) {
  const blob = await resizeImage(file);
  const fileName = `${userId || 'tmp'}-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function getLastWorkoutDate(userId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.date || null;
}

// ===== WORKOUTS =====

export async function getUserWorkouts(userId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveWorkout(userId, workout) {
  const dateStr = new Date(workout.date).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      date: dateStr,
      plan_key: workout.planKey,
      plan_name: workout.planName,
      logs: workout.logs || [],
      duration: workout.duration || 0,
      is_cardio: !!workout.isCardio,
      is_mobility: !!workout.isMobility,
      focus: workout.focus || null,
      completed: workout.completed ?? null,
      total: workout.total ?? null,
      notes: workout.notes || null,
      skipped_exercises: workout.skippedExercises || [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Convert DB row → app-internal workout shape
export function rowToWorkout(row) {
  return {
    id: row.id,
    date: row.created_at, // use timestamp for sorting
    dateOnly: row.date,
    planKey: row.plan_key,
    planName: row.plan_name,
    logs: row.logs || [],
    duration: row.duration || 0,
    isCardio: row.is_cardio,
    isMobility: row.is_mobility,
    focus: row.focus,
    completed: row.completed,
    total: row.total,
    notes: row.notes || '',
    skippedExercises: row.skipped_exercises || [],
  };
}

// Compute lastWeights from a list of workout rows
export function computeLastWeights(workouts) {
  const lw = {};
  // Iterate from oldest to newest so the latest overwrites
  const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(w => {
    if (!w.logs) return;
    w.logs.forEach(l => {
      if (l.sets && l.sets.length > 0) {
        const heaviest = Math.max(...l.sets.map(s => parseFloat(s.weight) || 0));
        if (heaviest > 0) lw[l.name] = heaviest;
      }
    });
  });
  return lw;
}

// ===== DASHBOARD HELPERS =====

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getActivityFeed(limit = 30) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, users(id, name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getAllLiveStatuses() {
  const { data, error } = await supabase
    .from('live_status')
    .select('*, users(id, name, avatar_url)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setLiveStatus(userId, status, detail) {
  // Upsert (insert or update)
  const { error } = await supabase
    .from('live_status')
    .upsert({
      user_id: userId,
      status,
      detail,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) console.error('Live status error:', error);
}

export async function clearLiveStatus(userId) {
  const { error } = await supabase
    .from('live_status')
    .delete()
    .eq('user_id', userId);
  if (error) console.error('Clear live error:', error);
}

export async function getReactionsForWorkouts(workoutIds) {
  if (!workoutIds.length) return {};
  const { data, error } = await supabase
    .from('reactions')
    .select('*, users(id, name, avatar_url)')
    .in('workout_id', workoutIds);
  if (error) throw error;
  // Group by workout_id
  const grouped = {};
  (data || []).forEach(r => {
    if (!grouped[r.workout_id]) grouped[r.workout_id] = [];
    grouped[r.workout_id].push(r);
  });
  return grouped;
}

export async function toggleReaction(workoutId, userId, emoji) {
  // Check if already exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('workout_id', workoutId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    return false; // removed
  } else {
    await supabase.from('reactions').insert({ workout_id: workoutId, user_id: userId, emoji });
    return true; // added
  }
}

// ===== COMMENTS =====

export async function getCommentsForWorkouts(workoutIds) {
  if (!workoutIds.length) return {};
  const { data, error } = await supabase
    .from('comments')
    .select('*, users(id, name, avatar_url)')
    .in('workout_id', workoutIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const grouped = {};
  (data || []).forEach(c => {
    if (!grouped[c.workout_id]) grouped[c.workout_id] = [];
    grouped[c.workout_id].push(c);
  });
  return grouped;
}

export async function addComment(workoutId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ workout_id: workoutId, user_id: userId, content: content.trim() })
    .select('*, users(id, name, avatar_url)')
    .single();
  if (error) throw error;
  return data;
}

// Compute stats for a user's workouts
// optionalDays: Set of day-of-week numbers (0=Sun…6=Sat) that are rest/optional.
// Those days are skipped entirely — missing a workout on them doesn't break the streak.
export function computeUserStats(workouts, optionalDays = new Set()) {
  const totalWorkouts = workouts.length;
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = workouts.filter(w => new Date(w.created_at || w.date).getTime() > weekAgo).length;

  // Streak: consecutive REQUIRED days back from today
  const dates = new Set(workouts.map(w => (w.date || w.dateOnly)));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const dow = cursor.getDay();
    const ds = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
    const isOptional = optionalDays.has(dow);

    if (isOptional) {
      // Skip rest/optional day — does not break or extend streak
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (dates.has(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      if (i === 0) {
        // Today not yet trained — still allow streak to continue from yesterday
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return { totalWorkouts, thisWeek, streak };
}

// ===== STEPS =====

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export async function getUserSteps(userId, date = null) {
  const d = date || todayStr();
  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .maybeSingle();
  if (error) throw error;
  return data?.steps || 0;
}

export async function setUserSteps(userId, steps, date = null) {
  const d = date || todayStr();
  const { error } = await supabase
    .from('daily_steps')
    .upsert({
      user_id: userId,
      date: d,
      steps: parseInt(steps) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function getAllStepsForDate(date = null) {
  const d = date || todayStr();
  const { data, error } = await supabase
    .from('daily_steps')
    .select('*, users(id, name)')
    .eq('date', d);
  if (error) throw error;
  return data || [];
}

// ===== PLANS =====

export async function saveUserPlan(userId, planData) {
  const { data, error } = await supabase
    .from('users')
    .update({ plan_data: planData })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getActivePlanForUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('plan_data')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data?.plan_data) return null;
  return data.plan_data;
}

// ===== AI BACKEND CALLS =====

export async function parsePlanText(text) {
  const resp = await fetch('/.netlify/functions/parse-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Parse failed');
  return data.plan;
}

export async function findAlternativeExercise({ exerciseName, exerciseHint, planKey, prevExercise, nextExercise }) {
  const resp = await fetch('/.netlify/functions/find-alternative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciseName, exerciseHint, planKey, prevExercise, nextExercise }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Alternative konnte nicht geladen werden');
  return data.alternatives || [];
}

export async function coachChat(messages, currentPlan = null, onboarding = false) {
  const resp = await fetch('/.netlify/functions/coach-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, currentPlan, onboarding }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Coach chat failed');
  return data; // { reply, plan }
}
