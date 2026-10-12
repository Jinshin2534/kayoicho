import { NAME_SEARCH_RADIUS_M } from './config';
import { distanceMeters } from './geo';
import type { LatLng } from './types';

export function buildOverpassQuery(at: LatLng, radius: number = NAME_SEARCH_RADIUS_M): string {
  return `[out:json][timeout:10];nwr(around:${radius},${at.lat},${at.lng})[name];out center tags;`;
}

const PLACE_KEYS = ['building', 'shop', 'amenity', 'tourism', 'office', 'leisure', 'healthcare', 'craft', 'public_transport'];

function isPlaceLike(tags: Record<string, unknown>): boolean {
  if (tags.railway === 'station') return true;
  return PLACE_KEYS.some((key) => key in tags);
}

function positionOf(el: Record<string, unknown>): LatLng | null {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') return { lat: el.lat, lng: el.lon };
  const center = el.center as Record<string, unknown> | undefined;
  if (center && typeof center.lat === 'number' && typeof center.lon === 'number') {
    return { lat: center.lat, lng: center.lon };
  }
  return null;
}

/** Overpass の応答から、最も近い名前付きの建物・お店の名前を選ぶ */
export function pickName(json: unknown, at: LatLng): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const elements = (json as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return null;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const raw of elements) {
    if (typeof raw !== 'object' || raw === null) continue;
    const el = raw as Record<string, unknown>;
    const tags = el.tags as Record<string, unknown> | undefined;
    if (!tags || !isPlaceLike(tags)) continue;
    const name = typeof tags['name:ja'] === 'string' ? tags['name:ja'] : tags.name;
    if (typeof name !== 'string' || name.trim() === '') continue;
    const pos = positionOf(el);
    if (!pos) continue;
    const d = distanceMeters(at, pos);
    if (d < bestDistance) {
      best = name.trim();
      bestDistance = d;
    }
  }
  return best;
}
