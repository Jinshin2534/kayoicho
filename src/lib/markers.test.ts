import { markerRadius, toMarkers } from './markers';

describe('markerRadius', () => {
  it.each([
    [1, 6],
    [2, 10],
    [4, 14],
    [16, 22],
    [100, 24],
  ])('%i回 → 半径%i', (count, radius) => {
    expect(markerRadius(count)).toBeCloseTo(radius, 5);
  });
});

describe('toMarkers', () => {
  it('名前と回数をラベルにする', () => {
    const [m] = toMarkers([
      { placeId: 3, name: 'ローソン', lat: 35, lng: 139, count: 4, totalMs: 0, firstAt: 0, lastAt: 0 },
    ]);
    expect(m).toEqual({ id: 3, lat: 35, lng: 139, radius: 14, label: 'ローソン・4回' });
  });
});
