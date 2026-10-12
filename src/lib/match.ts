import { MERGE_GAP_MS, SAME_PLACE_RADIUS_M } from './config';
import { distanceMeters } from './geo';
import type { LatLng, Stay, Visit } from './types';

export type PlaceLocation = { id: number; lat: number; lng: number };

export type StayAction =
  | { type: 'extend'; visitId: number; departedAt: number }
  | { type: 'append'; placeId: number; arrivedAt: number; departedAt: number }
  | { type: 'newPlace'; lat: number; lng: number; arrivedAt: number; departedAt: number };

export function findPlace(places: readonly PlaceLocation[], at: LatLng): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const place of places) {
    const d = distanceMeters(place, at);
    if (d <= SAME_PLACE_RADIUS_M && d < bestDistance) {
      best = place.id;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * 滞在1件をどう記録するか決める。
 * lastVisit は全建物を通して最も新しい訪問。同じ建物で短い途切れなら延長する
 * (建物の中でGPSが一瞬外れても2回に数えないため)。
 */
export function planStay(places: readonly PlaceLocation[], lastVisit: Visit | null, stay: Stay): StayAction {
  const placeId = findPlace(places, stay);
  if (placeId === null) {
    return { type: 'newPlace', lat: stay.lat, lng: stay.lng, arrivedAt: stay.arrivedAt, departedAt: stay.departedAt };
  }
  if (lastVisit && lastVisit.placeId === placeId && stay.arrivedAt - lastVisit.departedAt <= MERGE_GAP_MS) {
    return { type: 'extend', visitId: lastVisit.id, departedAt: Math.max(lastVisit.departedAt, stay.departedAt) };
  }
  return { type: 'append', placeId, arrivedAt: stay.arrivedAt, departedAt: stay.departedAt };
}
