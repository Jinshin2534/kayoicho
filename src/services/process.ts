import { POINT_RETENTION_MS } from '../lib/config';
import { planStay, type StayAction } from '../lib/match';
import { detectStays } from '../lib/stay';
import * as db from './db';
import { lookupName } from './overpass';

/** 1回の処理で名前を問い合わせる建物の数(Overpass に負荷をかけないため) */
const NAMING_PER_RUN = 3;

let running: Promise<void> | null = null;
let naming: Promise<void> | null = null;

/** 未処理の座標 → 滞在 → 建物・訪問 を反映し、古い座標を捨てる(通信しない) */
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
  const { points, maxId } = await db.getUnprocessedPoints();
  const { stays, consumedUntil } = detectStays(points);

  // 訪問の記録と「処理済み」の印は一緒に確定させる(途中で落ちて二重に数えないため)
  await db.transaction(async () => {
    for (const stay of stays) {
      const [places, lastVisit] = await Promise.all([db.getPlaces(), db.getLastVisit()]);
      await apply(planStay(places, lastVisit, stay), now);
    }
    if (consumedUntil !== null && maxId !== null) await db.markProcessedBefore(consumedUntil, maxId);
  });

  await db.prunePoints(now - POINT_RETENTION_MS);
}

/** 名前の無い建物に名前をつける(通信する。失敗した建物は次回に回す) */
export function nameNewPlaces(): Promise<void> {
  if (!naming) {
    naming = runNaming().finally(() => {
      naming = null;
    });
  }
  return naming;
}

async function runNaming(): Promise<void> {
  for (const place of await db.getPendingNaming(NAMING_PER_RUN)) {
    const result = await lookupName(place);
    // 失敗したら naming_pending のまま残し、次回また問い合わせる
    if (result.ok) await db.setOsmName(place.id, result.name);
  }
}
