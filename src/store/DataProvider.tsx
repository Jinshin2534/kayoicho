import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Place, Visit } from '../lib/types';
import { getPlaces, getVisits, renamePlace } from '../services/db';
import { nameNewPlaces, processPending } from '../services/process';
import { getTrackingState, startTracking, type TrackingState } from '../services/tracker';

type DataValue = {
  places: Place[];
  visits: Visit[];
  tracking: TrackingState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  enableTracking: () => Promise<void>;
  rename: (placeId: number, name: string) => Promise<void>;
};

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tracking, setTracking] = useState<TrackingState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([getPlaces(), getVisits()]);
    setPlaces(p);
    setVisits(v);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await processPending();
    } finally {
      await load();
      setLoading(false);
    }
    // 名前検索は遅いので待たず、終わったら表示を更新する
    nameNewPlaces()
      .then(load)
      .catch((e) => console.warn('名前の検索に失敗', e));
  }, [load]);

  // 権限ダイアログ中は AppState が inactive→active と揺れるので、その間は同期を止める
  const startingRef = useRef(false);

  const enableTracking = useCallback(async () => {
    startingRef.current = true;
    try {
      setTracking(await startTracking());
    } finally {
      startingRef.current = false;
    }
  }, []);

  // 権限がすでにあるなら黙って記録を始める。まだ聞いていないなら帯で理由を説明してから聞く
  const syncTracking = useCallback(async () => {
    startingRef.current = true;
    try {
      const s = await getTrackingState();
      setTracking(s === 'unavailable' ? await startTracking() : s);
    } finally {
      startingRef.current = false;
    }
  }, []);

  const rename = useCallback(
    async (placeId: number, name: string) => {
      await renamePlace(placeId, name);
      await load();
    },
    [load],
  );

  useEffect(() => {
    (async () => {
      try {
        await syncTracking();
      } catch (e) {
        console.warn('記録状態の確認に失敗', e);
      } finally {
        await refresh();
      }
    })().catch((e) => console.warn('初期読み込みに失敗', e));
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (!startingRef.current) {
        syncTracking().catch((e) => console.warn('記録状態の確認に失敗', e));
      }
      refresh().catch((e) => console.warn('更新に失敗', e));
    });
    return () => sub.remove();
  }, [refresh, syncTracking]);

  const value = useMemo(
    () => ({ places, visits, tracking, loading, refresh, enableTracking, rename }),
    [places, visits, tracking, loading, refresh, enableTracking, rename],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData は DataProvider の中で使うこと');
  return value;
}
