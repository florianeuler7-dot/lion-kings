// ===== WINTER ARC 26/27 =====
// The "arc" is the training season the crew commits to. Dates are local.
import { toLocalDateStr } from '../lib/date';

export const ARC = {
  name: 'WinterArc',
  season: '26/27',
  start: '2026-10-01',
  end: '2027-03-31',
};

const DAY = 24 * 60 * 60 * 1000;

function parseLocal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Returns { status: 'before'|'active'|'done', day, total, pct, daysLeft, daysUntil }
export function arcProgress(now = new Date()) {
  const start = parseLocal(ARC.start);
  const end = parseLocal(ARC.end);
  const today = parseLocal(toLocalDateStr(now));
  const total = Math.round((end - start) / DAY) + 1;
  if (today < start) {
    return { status: 'before', day: 0, total, pct: 0, daysLeft: total, daysUntil: Math.round((start - today) / DAY) };
  }
  if (today > end) {
    return { status: 'done', day: total, total, pct: 100, daysLeft: 0, daysUntil: 0 };
  }
  const day = Math.round((today - start) / DAY) + 1;
  return {
    status: 'active',
    day,
    total,
    pct: Math.round((day / total) * 100),
    daysLeft: total - day,
    daysUntil: 0,
  };
}

// Number of planned training days per week (everything except rest / optional cardio)
export function weeklyGoalFromSchedule(schedule = []) {
  return schedule.filter(k => k && k !== 'rest' && k !== 'cardio_optional').length || 1;
}
