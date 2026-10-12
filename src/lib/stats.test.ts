import { displayName, groupByDay, rank, summarize, UNNAMED } from './stats';
import type { Place, Visit } from './types';

const MIN = 60_000;
const t = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

function place(id: number, name: string | null): Place {
  return { id, name, nameSource: name ? 'osm' : 'none', lat: 35 + id / 1000, lng: 139, createdAt: 0, namingPending: false };
}
function visit(id: number, placeId: number, from: number, minutes: number): Visit {
  return { id, placeId, arrivedAt: from, departedAt: from + minutes * MIN };
}

const places = [place(1, 'ローソン'), place(2, null), place(3, '空き')];
const visits = [
  visit(1, 1, t(10, 9), 10),
  visit(2, 2, t(10, 12), 120),
  visit(3, 1, t(11, 9), 15),
  visit(4, 1, t(12, 8), 5),
];

describe('displayName', () => {
  it('名前が無ければ「名前のない場所」', () => {
    expect(displayName({ name: null })).toBe(UNNAMED);
    expect(displayName({ name: 'ジム' })).toBe('ジム');
  });
});

describe('summarize', () => {
  it('建物ごとの回数・合計・初回・最終', () => {
    const stats = summarize(places, visits);
    expect(stats).toHaveLength(2); // 訪問0件の「空き」は出ない
    expect(stats[0]).toEqual({
      placeId: 1,
      name: 'ローソン',
      lat: places[0].lat,
      lng: 139,
      count: 3,
      totalMs: 30 * MIN,
      firstAt: t(10, 9),
      lastAt: t(12, 8),
    });
    expect(stats[1].name).toBe(UNNAMED);
  });
});

describe('rank', () => {
  const stats = summarize(places, visits);
  it('回数順', () => {
    expect(rank(stats, 'count').map((s) => s.placeId)).toEqual([1, 2]);
  });
  it('合計時間順', () => {
    expect(rank(stats, 'duration').map((s) => s.placeId)).toEqual([2, 1]);
  });
  it('同点は最終訪問が新しい順', () => {
    const tie = summarize(places, [visit(1, 1, t(10, 9), 10), visit(2, 2, t(11, 9), 10)]);
    expect(rank(tie, 'count').map((s) => s.placeId)).toEqual([2, 1]);
  });
  it('元の配列を変えない', () => {
    const before = stats.map((s) => s.placeId);
    rank(stats, 'duration');
    expect(stats.map((s) => s.placeId)).toEqual(before);
  });
});

describe('groupByDay', () => {
  it('日ごとに新しい順でまとめる', () => {
    const sections = groupByDay(places, visits);
    expect(sections.map((s) => s.dayKey)).toEqual(['2026-10-12', '2026-10-11', '2026-10-10']);
    expect(sections[2].items.map((i) => i.visitId)).toEqual([2, 1]);
    expect(sections[2].items[0].name).toBe(UNNAMED);
    expect(sections[0].dayStart).toBe(new Date(2026, 9, 12).getTime());
  });
  it('訪問が無ければ空', () => {
    expect(groupByDay(places, [])).toEqual([]);
  });
});
