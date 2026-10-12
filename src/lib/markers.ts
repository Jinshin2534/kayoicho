import type { PlaceStats } from './stats';

export type MapMarker = { id: number; lat: number; lng: number; radius: number; label: string };

/** 回数が多いほど大きく。倍になるごとに+4px、24pxで頭打ち */
export function markerRadius(count: number): number {
  return Math.min(24, 6 + 4 * Math.log2(Math.max(1, count)));
}

export function toMarkers(stats: readonly PlaceStats[]): MapMarker[] {
  return stats.map((s) => ({
    id: s.placeId,
    lat: s.lat,
    lng: s.lng,
    radius: markerRadius(s.count),
    label: `${s.name}・${s.count}回`,
  }));
}
