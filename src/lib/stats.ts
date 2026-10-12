import type { Place, Visit } from './types';

export const UNNAMED = '名前のない場所';

export function displayName(place: Pick<Place, 'name'>): string {
  return place.name ?? UNNAMED;
}

export type PlaceStats = {
  placeId: number;
  name: string;
  lat: number;
  lng: number;
  count: number;
  totalMs: number;
  firstAt: number;
  lastAt: number;
};

export function summarize(places: readonly Place[], visits: readonly Visit[]): PlaceStats[] {
  const byPlace = new Map<number, PlaceStats>();
  const placeById = new Map(places.map((p) => [p.id, p]));
  for (const v of visits) {
    const place = placeById.get(v.placeId);
    if (!place) continue;
    const s = byPlace.get(v.placeId);
    if (s) {
      s.count += 1;
      s.totalMs += v.departedAt - v.arrivedAt;
      s.firstAt = Math.min(s.firstAt, v.arrivedAt);
      s.lastAt = Math.max(s.lastAt, v.arrivedAt);
    } else {
      byPlace.set(v.placeId, {
        placeId: place.id,
        name: displayName(place),
        lat: place.lat,
        lng: place.lng,
        count: 1,
        totalMs: v.departedAt - v.arrivedAt,
        firstAt: v.arrivedAt,
        lastAt: v.arrivedAt,
      });
    }
  }
  return [...byPlace.values()].sort((a, b) => a.placeId - b.placeId);
}

export type RankBy = 'count' | 'duration';

export function rank(stats: readonly PlaceStats[], by: RankBy): PlaceStats[] {
  const key = (s: PlaceStats) => (by === 'count' ? s.count : s.totalMs);
  return [...stats].sort((a, b) => key(b) - key(a) || b.lastAt - a.lastAt);
}

export type HistoryItem = { visitId: number; placeId: number; name: string; arrivedAt: number; departedAt: number };
export type DaySection = { dayKey: string; dayStart: number; items: HistoryItem[] };

const pad = (n: number) => String(n).padStart(2, '0');

export function groupByDay(places: readonly Place[], visits: readonly Visit[]): DaySection[] {
  const placeById = new Map(places.map((p) => [p.id, p]));
  const sorted = [...visits].sort((a, b) => b.arrivedAt - a.arrivedAt);
  const sections: DaySection[] = [];
  for (const v of sorted) {
    const d = new Date(v.arrivedAt);
    const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    let section = sections[sections.length - 1];
    if (!section || section.dayKey !== dayKey) {
      section = { dayKey, dayStart: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), items: [] };
      sections.push(section);
    }
    const place = placeById.get(v.placeId);
    section.items.push({
      visitId: v.id,
      placeId: v.placeId,
      name: place ? displayName(place) : UNNAMED,
      arrivedAt: v.arrivedAt,
      departedAt: v.departedAt,
    });
  }
  return sections;
}
