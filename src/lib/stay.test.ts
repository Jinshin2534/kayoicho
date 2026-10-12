import { offsetMeters } from './geo';
import { MAX_STAY_GAP_MS } from './config';
import { detectStays } from './stay';
import type { Point } from './types';

const MIN = 60_000;
const STATION = { lat: 35.681236, lng: 139.767125 };

function at(north: number, east: number, minute: number, accuracy: number | null = 10): Point {
  const p = offsetMeters(STATION, north, east);
  return { lat: p.lat, lng: p.lng, accuracy, t: minute * MIN };
}

describe('detectStays', () => {
  it('空なら何も無い', () => {
    expect(detectStays([])).toEqual({ stays: [], consumedUntil: null });
  });

  it('駅に6分いてから離れた → 滞在1件', () => {
    const points = [at(0, 0, 0), at(10, -5, 1), at(-8, 6, 2), at(5, 5, 4), at(0, -10, 6), at(500, 0, 7)];
    const { stays, consumedUntil } = detectStays(points);
    expect(stays).toHaveLength(1);
    expect(stays[0].arrivedAt).toBe(0);
    expect(stays[0].departedAt).toBe(7 * MIN);
    expect(consumedUntil).toBe(7 * MIN);
  });

  it('4分で離れた → 滞在0件', () => {
    const points = [at(0, 0, 0), at(5, 0, 2), at(500, 0, 4), at(1000, 0, 5)];
    expect(detectStays(points).stays).toHaveLength(0);
  });

  it('歩いて通り過ぎただけ → 滞在0件', () => {
    const points = Array.from({ length: 10 }, (_, i) => at(i * 60, 0, i));
    expect(detectStays(points).stays).toHaveLength(0);
  });

  it('止まっていて更新が来ず、30分後に離れた点が来た → 30分の滞在', () => {
    const { stays } = detectStays([at(0, 0, 0), at(800, 0, 30)]);
    expect(stays).toHaveLength(1);
    expect(stays[0].departedAt - stays[0].arrivedAt).toBe(30 * MIN);
  });

  it('精度の悪い点が1つ飛んでも滞在は切れない', () => {
    const points = [at(0, 0, 0), at(5, 0, 2), at(300, 0, 3, 500), at(0, 5, 6), at(600, 0, 8)];
    const { stays } = detectStays(points);
    expect(stays).toHaveLength(1);
    expect(stays[0].departedAt).toBe(8 * MIN);
  });

  it('最後の塊はまだ続いているので確定させない', () => {
    const points = [at(0, 0, 0), at(5, 0, 10), at(0, 5, 20)];
    expect(detectStays(points)).toEqual({ stays: [], consumedUntil: 0 });
  });

  it('時刻順でなくても並べ直して判定する', () => {
    const points = [at(500, 0, 7), at(0, 0, 0), at(5, 0, 6)];
    expect(detectStays(points).stays).toHaveLength(1);
  });

  it('滞在の中心は塊の点の平均', () => {
    const points = [at(-10, 0, 0), at(10, 0, 6), at(500, 0, 7)];
    const [stay] = detectStays(points).stays;
    expect(stay.lat).toBeCloseTo(STATION.lat, 6);
    expect(stay.lng).toBeCloseTo(STATION.lng, 6);
  });

  it('2か所に順に滞在 → 2件', () => {
    const points = [at(0, 0, 0), at(0, 0, 10), at(1000, 0, 12), at(1000, 5, 30), at(3000, 0, 32)];
    expect(detectStays(points).stays).toHaveLength(2);
  });

  it('次の点が何日も来ないときは12時間で打ち切る', () => {
    const points = [at(0, 0, 0), at(5000, 0, 3 * 24 * 60)];
    const { stays } = detectStays(points);
    expect(stays).toHaveLength(1);
    expect(stays[0].departedAt - stays[0].arrivedAt).toBe(12 * 60 * MIN);
    expect(MAX_STAY_GAP_MS).toBe(12 * 60 * MIN);
  });
});
