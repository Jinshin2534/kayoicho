import { MAX_ACCURACY_M, STAY_MIN_MS, STAY_RADIUS_M } from './config';
import { centroid, distanceMeters } from './geo';
import type { Point, Stay } from './types';

export type DetectResult = {
  stays: Stay[];
  /** この時刻より前の点は処理済みにしてよい。null なら何も確定していない */
  consumedUntil: number | null;
};

/**
 * 座標の列から滞在を切り出す。
 * 出発時刻は「塊の外に出た最初の点」の時刻。止まっている間は位置更新が
 * 届かないので、次の点が来るまではそこにいたとみなす。
 */
export function detectStays(points: readonly Point[]): DetectResult {
  const good = points
    .filter((p) => p.accuracy === null || p.accuracy <= MAX_ACCURACY_M)
    .sort((a, b) => a.t - b.t);
  const stays: Stay[] = [];

  let i = 0;
  while (i < good.length) {
    const cluster: Point[] = [good[i]];
    let center = { lat: good[i].lat, lng: good[i].lng };
    let j = i + 1;
    while (j < good.length && distanceMeters(center, good[j]) <= STAY_RADIUS_M) {
      cluster.push(good[j]);
      center = centroid(cluster);
      j++;
    }
    if (j >= good.length) {
      // 最後の塊はまだ続いているかもしれないので次回に持ち越す
      return { stays, consumedUntil: good[i].t };
    }
    const arrivedAt = cluster[0].t;
    const departedAt = good[j].t;
    if (departedAt - arrivedAt >= STAY_MIN_MS) {
      stays.push({ lat: center.lat, lng: center.lng, arrivedAt, departedAt });
    }
    i = j;
  }
  return { stays, consumedUntil: null };
}
