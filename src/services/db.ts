import * as SQLite from 'expo-sqlite';
import type { NameSource, Place, Point, Visit } from '../lib/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('kayoicho.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL,
      t INTEGER NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS points_processed_t ON points (processed, t);
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      name_source TEXT NOT NULL DEFAULT 'none',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at INTEGER NOT NULL,
      naming_pending INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL REFERENCES places (id),
      arrived_at INTEGER NOT NULL,
      departed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS visits_departed ON visits (departed_at);
  `);
  return db;
}

/**
 * 書き込みを1本ずつ直列に実行する JS レベルの mutex。
 * expo-sqlite の withTransactionAsync は排他的ではなく、1本の共有接続に対して
 * 別のクエリが途中で割り込むとトランザクション内で実行され、2つ目の BEGIN は失敗して
 * その ROLLBACK が1つ目を巻き込む。バックグラウンドタスクとフォアグラウンドは
 * 同じ JS ランタイム・同じ接続を使うので、書き込みはここを通して直列化する。
 * 前の保持者が失敗しても鎖は途切れない。
 */
let writeQueue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.catch(() => undefined);
  return result;
}

/**
 * 排他的なトランザクション。fn の中から exclusive で包まれた関数
 * (insertPoints / setOsmName / renamePlace / prunePoints / transaction)
 * を呼んではいけない(デッドロックする)。
 */
export function transaction(fn: () => Promise<void>): Promise<void> {
  return exclusive(async () => {
    const db = await getDb();
    await db.withTransactionAsync(fn);
  });
}

type PointRow = { id: number; lat: number; lng: number; accuracy: number | null; t: number };
type PlaceRow = {
  id: number;
  name: string | null;
  name_source: string;
  lat: number;
  lng: number;
  created_at: number;
  naming_pending: number;
};
type VisitRow = { id: number; place_id: number; arrived_at: number; departed_at: number };

const toPlace = (r: PlaceRow): Place => ({
  id: r.id,
  name: r.name,
  nameSource: (r.name_source === 'osm' || r.name_source === 'user' ? r.name_source : 'none') as NameSource,
  lat: r.lat,
  lng: r.lng,
  createdAt: r.created_at,
  namingPending: r.naming_pending === 1,
});
const toVisit = (r: VisitRow): Visit => ({
  id: r.id,
  placeId: r.place_id,
  arrivedAt: r.arrived_at,
  departedAt: r.departed_at,
});

export function insertPoints(points: readonly Point[]): Promise<void> {
  if (points.length === 0) return Promise.resolve();
  return exclusive(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const p of points) {
        await db.runAsync('INSERT INTO points (lat, lng, accuracy, t) VALUES (?, ?, ?, ?)', p.lat, p.lng, p.accuracy, p.t);
      }
    });
  });
}

/** 未処理の座標と、読んだ中で最大の id(markProcessedBefore で後から入った座標を巻き込まないため) */
export async function getUnprocessedPoints(): Promise<{ points: Point[]; maxId: number | null }> {
  const db = await getDb();
  const rows = await db.getAllAsync<PointRow>(
    'SELECT id, lat, lng, accuracy, t FROM points WHERE processed = 0 ORDER BY t',
  );
  let maxId: number | null = null;
  const points: Point[] = rows.map((r) => {
    if (maxId === null || r.id > maxId) maxId = r.id;
    return { lat: r.lat, lng: r.lng, accuracy: r.accuracy, t: r.t };
  });
  return { points, maxId };
}

export async function markProcessedBefore(t: number, maxId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE points SET processed = 1 WHERE processed = 0 AND t < ? AND id <= ?', t, maxId);
}

export function prunePoints(before: number): Promise<void> {
  return exclusive(async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM points WHERE processed = 1 AND t < ?', before);
  });
}

export async function getPlaces(): Promise<Place[]> {
  const db = await getDb();
  return (await db.getAllAsync<PlaceRow>('SELECT * FROM places ORDER BY id')).map(toPlace);
}

export async function getVisits(): Promise<Visit[]> {
  const db = await getDb();
  return (await db.getAllAsync<VisitRow>('SELECT * FROM visits ORDER BY arrived_at')).map(toVisit);
}

export async function getLastVisit(): Promise<Visit | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<VisitRow>('SELECT * FROM visits ORDER BY departed_at DESC LIMIT 1');
  return row ? toVisit(row) : null;
}

export async function insertPlace(lat: number, lng: number, createdAt: number): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO places (lat, lng, created_at) VALUES (?, ?, ?)', lat, lng, createdAt);
  return result.lastInsertRowId;
}

export async function insertVisit(placeId: number, arrivedAt: number, departedAt: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO visits (place_id, arrived_at, departed_at) VALUES (?, ?, ?)', placeId, arrivedAt, departedAt);
}

export async function extendVisit(visitId: number, departedAt: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE visits SET departed_at = ? WHERE id = ?', departedAt, visitId);
}

export async function getPendingNaming(limit: number): Promise<Place[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PlaceRow>(
    "SELECT * FROM places WHERE naming_pending = 1 AND name_source != 'user' ORDER BY id LIMIT ?",
    limit,
  );
  return rows.map(toPlace);
}

/** 自動でつけた名前を保存する。ユーザーがつけた名前は上書きしない */
export function setOsmName(placeId: number, name: string | null): Promise<void> {
  return exclusive(async () => {
    const db = await getDb();
    await db.runAsync(
      "UPDATE places SET name = ?, name_source = ?, naming_pending = 0 WHERE id = ? AND name_source != 'user'",
      name,
      name === null ? 'none' : 'osm',
      placeId,
    );
  });
}

export function renamePlace(placeId: number, name: string): Promise<void> {
  return exclusive(async () => {
    const db = await getDb();
    await db.runAsync("UPDATE places SET name = ?, name_source = 'user', naming_pending = 0 WHERE id = ?", name, placeId);
  });
}
