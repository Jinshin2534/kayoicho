import { offsetMeters } from './geo';
import { findPlace, planStay } from './match';
import type { Stay, Visit } from './types';

const MIN = 60_000;
const BASE = { lat: 35.681236, lng: 139.767125 };
const shop = { id: 1, ...offsetMeters(BASE, 0, 0) };
const nextDoor = { id: 2, ...offsetMeters(BASE, 0, 60) };

function stayAt(east: number, from: number, to: number): Stay {
  return { ...offsetMeters(BASE, 0, east), arrivedAt: from * MIN, departedAt: to * MIN };
}

describe('findPlace', () => {
  it('40m以内の最も近い建物を返す', () => {
    expect(findPlace([shop, nextDoor], offsetMeters(BASE, 0, 10))).toBe(1);
    expect(findPlace([shop, nextDoor], offsetMeters(BASE, 0, 50))).toBe(2);
  });
  it('40mより遠ければ null', () => {
    expect(findPlace([shop], offsetMeters(BASE, 0, 45))).toBeNull();
    expect(findPlace([], BASE)).toBeNull();
  });
});

describe('planStay', () => {
  it('知らない場所なら新しい建物', () => {
    expect(planStay([], null, stayAt(0, 0, 10))).toEqual({
      type: 'newPlace',
      lat: BASE.lat,
      lng: BASE.lng,
      arrivedAt: 0,
      departedAt: 10 * MIN,
    });
  });

  it('同じ建物に別の日に行った → 訪問を追加', () => {
    const last: Visit = { id: 9, placeId: 1, arrivedAt: 0, departedAt: 10 * MIN };
    const day2 = 24 * 60;
    expect(planStay([shop], last, stayAt(5, day2, day2 + 20))).toEqual({
      type: 'append',
      placeId: 1,
      arrivedAt: day2 * MIN,
      departedAt: (day2 + 20) * MIN,
    });
  });

  it('建物内で3分GPSが外れた → 直前の訪問を延長', () => {
    const last: Visit = { id: 9, placeId: 1, arrivedAt: 0, departedAt: 20 * MIN };
    expect(planStay([shop], last, stayAt(0, 23, 40))).toEqual({
      type: 'extend',
      visitId: 9,
      departedAt: 40 * MIN,
    });
  });

  it('11分空いたら別の訪問', () => {
    const last: Visit = { id: 9, placeId: 1, arrivedAt: 0, departedAt: 20 * MIN };
    expect(planStay([shop], last, stayAt(0, 31, 40)).type).toBe('append');
  });

  it('直前の訪問が別の建物なら延長しない', () => {
    const last: Visit = { id: 9, placeId: 2, arrivedAt: 0, departedAt: 20 * MIN };
    expect(planStay([shop, nextDoor], last, stayAt(0, 22, 40)).type).toBe('append');
  });

  it('隣り合う2店(60m)は別の建物として扱う', () => {
    expect(planStay([shop], null, stayAt(60, 0, 10)).type).toBe('newPlace');
  });
});
