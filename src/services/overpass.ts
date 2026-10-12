import { buildOverpassQuery, pickName } from '../lib/naming';
import type { LatLng } from '../lib/types';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 15_000;

export type NameLookup = { ok: true; name: string | null } | { ok: false };

/** 失敗(通信・タイムアウト・HTTPエラー)は ok:false。名前が無かっただけなら ok:true, name:null */
export async function lookupName(at: LatLng): Promise<NameLookup> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kayoicho/0.1' },
      body: `data=${encodeURIComponent(buildOverpassQuery(at))}`,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false };
    return { ok: true, name: pickName(await res.json(), at) };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
