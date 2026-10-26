// Date helpers – everything is LOCAL time.
// (The old code used toISOString(), which is UTC and shifted dates after 22:00/23:00 in Germany.)

const pad = (n) => String(n).padStart(2, '0');

// "YYYY-MM-DD" in local time
export function toLocalDateStr(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayStr() {
  return toLocalDateStr(new Date());
}

// Start of the current week (Monday 00:00 local) as timestamp
export function startOfWeek(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Human relative time, German
export function relativeTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return `vor ${Math.max(1, Math.floor(diffH * 60))} Min`;
  if (diffH < 24) return `vor ${Math.floor(diffH)} h`;
  // "gestern" only if it really was the previous calendar day
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (toLocalDateStr(d) === toLocalDateStr(yesterday)) return 'gestern';
  if (diffH < 24 * 6) return d.toLocaleDateString('de-DE', { weekday: 'long' });
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

export function fmtClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
