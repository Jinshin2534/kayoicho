import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { Place, Visit } from '../lib/types';
import { getPlaces, getVisits, renamePlace } from '../services/db';
import { processPending } from '../services/process';
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
  }, [load]);

  const enableTracking = useCallback(async () => {
    setTracking(await startTracking());
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
      const state = await getTrackingState();
      // 権限がすでにあるなら黙って記録を始める。まだ聞いていないなら帯で理由を説明してから聞く
      setTracking(state === 'unavailable' ? await startTracking() : state);
      await refresh();
    })();
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      getTrackingState().then(setTracking);
      refresh();
    });
    return () => sub.remove();
  }, [refresh]);

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
