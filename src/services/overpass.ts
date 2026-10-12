import { buildOverpassQuery, isOverpassError, pickName } from '../lib/naming';
import type { LatLng } from '../lib/types';

// 本家 overpass-api.de は混雑で 504 を返し続けることがあるため、ミラーへ順にフォールバックする
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
// 公開サーバは混雑時に応答まで10秒以上かかることがある(実測6〜12秒)
const TIMEOUT_MS = 20_000;

export type NameLookup = { ok: true; name: string | null } | { ok: false };

async function tryEndpoint(endpoint: string, at: LatLng): Promise<NameLookup> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kayoicho/0.1' },
      body: `data=${encodeURIComponent(buildOverpassQuery(at))}`,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false };
    const json: unknown = await res.json();
    // HTTP 200 でも runtime error の応答は失敗(次のミラーへ。名前なしとは区別する)
    if (isOverpassError(json)) return { ok: false };
    return { ok: true, name: pickName(json, at) };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** 全エンドポイントが失敗(通信・タイムアウト・HTTPエラー・JSON不正)なら ok:false。名前が無かっただけなら ok:true, name:null */
export async function lookupName(at: LatLng): Promise<NameLookup> {
  for (const endpoint of ENDPOINTS) {
    const result = await tryEndpoint(endpoint, at);
    if (result.ok) return result;
  }
  return { ok: false };
}
