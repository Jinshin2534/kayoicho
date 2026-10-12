const MIN = 60_000;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / MIN);
  if (minutes < 1) return '1分未満';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function formatClock(t: number): string {
  const d = new Date(t);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function startOfDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatDayTitle(dayStart: number, now: number): string {
  const today = startOfDay(now);
  const day = startOfDay(dayStart);
  if (day === today) return '今日';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return '昨日';
  const d = new Date(day);
  const md = `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
  return d.getFullYear() === new Date(now).getFullYear() ? md : `${d.getFullYear()}年${md}`;
}
