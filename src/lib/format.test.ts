import { formatClock, formatDate, formatDayTitle, formatDuration } from './format';

const MIN = 60_000;

describe('formatDuration', () => {
  it.each([
    [30_000, '1分未満'],
    [35 * MIN, '35分'],
    [35 * MIN + 59_000, '35分'],
    [65 * MIN, '1時間5分'],
    [120 * MIN, '2時間'],
  ])('%i → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe('formatClock / formatDate', () => {
  const at = new Date(2026, 9, 12, 9, 5).getTime();
  it('時刻', () => expect(formatClock(at)).toBe('9:05'));
  it('日付', () => expect(formatDate(at)).toBe('2026/10/12'));
});

describe('formatDayTitle', () => {
  const now = new Date(2026, 9, 12, 15, 0).getTime();
  it('今日', () => expect(formatDayTitle(new Date(2026, 9, 12).getTime(), now)).toBe('今日'));
  it('昨日', () => expect(formatDayTitle(new Date(2026, 9, 11).getTime(), now)).toBe('昨日'));
  it('それ以前', () => expect(formatDayTitle(new Date(2026, 9, 5).getTime(), now)).toBe('10月5日(月)'));
  it('年が違う', () => expect(formatDayTitle(new Date(2025, 9, 12).getTime(), now)).toBe('2025年10月12日(日)'));
});
