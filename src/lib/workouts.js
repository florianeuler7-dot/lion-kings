// Pure helpers around workout data (no React, no Supabase)

// Duration is stored in MINUTES. Some legacy rows stored seconds.
// Heuristic: values > 300 are almost certainly seconds (5h+ workout = implausible).
export function normalizeMinutes(raw) {
  const n = Number(raw);
  if (!n || n <= 0) return 0;
  return n > 300 ? Math.round(n / 60) : Math.round(n);
}

export function formatDuration(raw) {
  const mins = normalizeMinutes(raw);
  if (!mins) return null;
  if (mins < 60) return `${mins} Min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m} Min` : `${h}h`;
}

// Merges same-day cardio + mobility pairs into one combined entry (handles legacy data)
// Works on both app-shape (isCardio/isMobility/dateOnly) and DB rows (is_cardio/is_mobility/date)
export function mergeCardioMobilityPairs(workouts) {
  const getDateKey = w => w.dateOnly || (w.date || w.created_at || '').split('T')[0];
  const isC = w => !!(w.isCardio || w.is_cardio);
  const isM = w => !!(w.isMobility || w.is_mobility);

  const byDate = {};
  workouts.forEach(w => {
    const dk = getDateKey(w);
    if (!byDate[dk]) byDate[dk] = [];
    byDate[dk].push(w);
  });

  const usedIds = new Set();
  const result = [];
  const sorted = [...workouts].sort((a, b) =>
    new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0)
  );

  sorted.forEach(w => {
    if (usedIds.has(w.id)) return;
    // Already combined in new format
    if (isC(w) && isM(w)) { result.push({ ...w, _allIds: [w.id] }); usedIds.add(w.id); return; }

    const dk = getDateKey(w);
    const dayList = byDate[dk] || [];

    if (isC(w) && !isM(w)) {
      const partner = dayList.find(p => isM(p) && !isC(p) && !usedIds.has(p.id) && p.id !== w.id);
      if (partner) {
        usedIds.add(w.id); usedIds.add(partner.id);
        const baseName = w.plan_name || w.planName || '';
        result.push({
          ...w, _allIds: [w.id, partner.id],
          is_mobility: true, isMobility: true,
          completed: partner.completed, total: partner.total, focus: partner.focus,
          plan_name: `${baseName} + Mobility`, planName: `${baseName} + Mobility`,
        });
        return;
      }
    }

    if (isM(w) && !isC(w)) {
      const partner = dayList.find(p => isC(p) && !isM(p) && !usedIds.has(p.id) && p.id !== w.id);
      if (partner) {
        usedIds.add(w.id); usedIds.add(partner.id);
        const baseName = partner.plan_name || partner.planName || '';
        result.push({
          ...partner, _allIds: [partner.id, w.id],
          is_mobility: true, isMobility: true,
          completed: w.completed, total: w.total, focus: w.focus,
          plan_name: `${baseName} + Mobility`, planName: `${baseName} + Mobility`,
        });
        return;
      }
    }

    usedIds.add(w.id);
    result.push({ ...w, _allIds: [w.id] });
  });

  return result;
}

// Stats for a finished strength workout
export function workoutTotals(logs = []) {
  const totalSets = logs.reduce((s, l) => s + (l.sets?.length || 0), 0);
  const totalReps = logs.reduce((s, l) => s + (l.sets || []).reduce((r, set) => r + (parseInt(set.reps) || 0), 0), 0);
  const totalVolume = Math.round(logs.reduce((s, l) => s + (l.sets || []).reduce((r, set) => r + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0));
  const exerciseCount = logs.filter(l => l.sets?.length > 0).length;
  return { totalSets, totalReps, totalVolume, exerciseCount };
}

export function heaviestOf(sets = []) {
  if (!sets.length) return 0;
  return Math.max(...sets.map(s => parseFloat(s.weight) || 0));
}
