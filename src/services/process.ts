import { POINT_RETENTION_MS } from '../lib/config';
import { planStay, type StayAction } from '../lib/match';
import { detectStays } from '../lib/stay';
import * as db from './db';
import { lookupName } from './overpass';

/** 1回の処理で名前を問い合わせる建物の数(Overpass に負荷をかけないため) */
const NAMING_PER_RUN = 3;

let running: Promise<void> | null = null;

/** 未処理の座標 → 滞在 → 建物・訪問 を反映し、名前の無い建物に名前をつける */
export function processPending(now: number = Date.now()): Promise<void> {
  if (!running) {
    running = run(now).finally(() => {
      running = null;
    });
  }
  return running;
}

async function apply(action: StayAction, now: number): Promise<void> {
  switch (action.type) {
    case 'extend':
      await db.extendVisit(action.visitId, action.departedAt);
      return;
    case 'append':
      await db.insertVisit(action.placeId, action.arrivedAt, action.departedAt);
      return;
    case 'newPlace': {
      const placeId = await db.insertPlace(action.lat, action.lng, now);
      await db.insertVisit(placeId, action.arrivedAt, action.departedAt);
      return;
    }
  }
}

async function run(now: number): Promise<void> {
  const points = await db.getUnprocessedPoints();
  const { stays, consumedUntil } = detectStays(points);

  // 訪問の記録と「処理済み」の印は一緒に確定させる(途中で落ちて二重に数えないため)
  await db.transaction(async () => {
    for (const stay of stays) {
      const [places, lastVisit] = await Promise.all([db.getPlaces(), db.getLastVisit()]);
      await apply(planStay(places, lastVisit, stay), now);
    }
    if (consumedUntil !== null) await db.markProcessedBefore(consumedUntil);
  });

  await db.prunePoints(now - POINT_RETENTION_MS);

  for (const place of await db.getPendingNaming(NAMING_PER_RUN)) {
    const result = await lookupName(place);
    // 失敗したら naming_pending のまま残し、次回また問い合わせる
    if (result.ok) await db.setOsmName(place.id, result.name);
  }
}
