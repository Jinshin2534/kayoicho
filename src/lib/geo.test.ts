import { centroid, distanceMeters, locationToPoint, offsetMeters } from './geo';

const TOKYO = { lat: 35.681236, lng: 139.767125 };
const YURAKUCHO = { lat: 35.675069, lng: 139.763328 };

describe('distanceMeters', () => {
  it('同じ点は0', () => {
    expect(distanceMeters(TOKYO, TOKYO)).toBe(0);
  });
  it('東京駅〜有楽町駅はおよそ770m', () => {
    const d = distanceMeters(TOKYO, YURAKUCHO);
    expect(d).toBeGreaterThan(740);
    expect(d).toBeLessThan(800);
  });
});

describe('offsetMeters', () => {
  it('北へ100m・東へ100mずらした点は、それぞれ約100m離れる', () => {
    expect(distanceMeters(TOKYO, offsetMeters(TOKYO, 100, 0))).toBeCloseTo(100, 0);
    expect(distanceMeters(TOKYO, offsetMeters(TOKYO, 0, 100))).toBeCloseTo(100, 0);
  });
});

describe('centroid', () => {
  it('点の平均を返す', () => {
    expect(centroid([{ lat: 0, lng: 0 }, { lat: 2, lng: 4 }])).toEqual({ lat: 1, lng: 2 });
  });
});

describe('locationToPoint', () => {
  it('expo-location の形を Point にする', () => {
    expect(
      locationToPoint({ coords: { latitude: 35, longitude: 139, accuracy: 12 }, timestamp: 1000 }),
    ).toEqual({ lat: 35, lng: 139, accuracy: 12, t: 1000 });
  });
  it('accuracy が無ければ null', () => {
    expect(
      locationToPoint({ coords: { latitude: 35, longitude: 139, accuracy: null }, timestamp: 1 }).accuracy,
    ).toBeNull();
  });
});
