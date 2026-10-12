import type { LatLng, Point } from './types';

const EARTH_RADIUS_M = 6_371_000;
const METERS_PER_DEG_LAT = 111_320;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 2点間の距離(メートル、ハバーサイン) */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function centroid(points: readonly LatLng[]): LatLng {
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

/** base から北へ north m、東へ east m ずらした点(短い距離用の近似) */
export function offsetMeters(base: LatLng, north: number, east: number): LatLng {
  return {
    lat: base.lat + north / METERS_PER_DEG_LAT,
    lng: base.lng + east / (METERS_PER_DEG_LAT * Math.cos(toRad(base.lat))),
  };
}

/** expo-location の LocationObject と同じ形(lib を expo に依存させないため構造で受ける) */
export type LocationLike = {
  coords: { latitude: number; longitude: number; accuracy: number | null };
  timestamp: number;
};

export function locationToPoint(loc: LocationLike): Point {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    t: loc.timestamp,
  };
}
