export function money(amountMinor, currency = 'INR', opts = {}) {
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      ...opts,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function number(n) {
  return new Intl.NumberFormat('en-US').format(n ?? 0);
}

export function percent(ratio) {
  if (ratio == null) return '—';
  return `${Math.round(ratio * 100)}%`;
}

export function longDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export function weekday(value) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(value));
}

export function todayLine(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function clock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function relative(value) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return longDate(value);
}

// "$22.50M", "9.0x", "35%" are figures; "Accretive" is words.
export function isFigure(label = '') {
  return /\d/.test(label);
}
