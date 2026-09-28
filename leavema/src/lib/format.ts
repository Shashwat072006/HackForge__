// src/lib/format.ts

/** Format plain yyyy-MM-dd strings without timezone shift */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

/** Format date range */
export function fmtRange(start: string, end: string): string {
  if (start === end) return fmtDate(start);
  const [sy, sm] = start.split('-');
  const [ey, em] = end.split('-');
  if (sy === ey && sm === em) {
    // Same month
    const [,, sd] = start.split('-');
    return `${parseInt(sd)}–${fmtDate(end)}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

/** Format ISO UTC timestamp to local time */
export function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ts));
}

/** Countdown from now to ISO UTC deadline */
export function countdown(deadline: string | null | undefined): string {
  if (!deadline) return '';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Overdue';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export function isUrgent(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff < 6 * 3_600_000;
}

/** Display a number with at most 1 decimal place, e.g. 12.0 → "12", 12.5 → "12.5" */
export function fmtDays(n: number | null | undefined): string {
  if (n == null) return '—';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}
