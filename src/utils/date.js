export function toISODate(input) {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toISOString().slice(0, 10);
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return toISODate(date);
}

export function startOfWeek(date = new Date()) {
  const dt = new Date(date);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return toISODate(dt);
}

export function startOfMonth(date = new Date()) {
  const dt = new Date(date);
  dt.setDate(1);
  dt.setHours(0, 0, 0, 0);
  return toISODate(dt);
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString();
}
