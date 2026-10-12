import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { locationToPoint } from '../lib/geo';
import { insertPoints } from './db';
import { processPending } from './process';

export const TASK_NAME = 'kayoicho-location';

// アプリが裏で起こされたときにも登録されているよう、モジュール読み込み時に定義する
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  try {
    await insertPoints(data.locations.map(locationToPoint));
    await processPending();
  } catch (e) {
    console.warn('位置タスクの処理に失敗', e);
  }
});

/**
 * notAsked: まだ一度も聞いていない / needsAlways: 「使用中のみ」で止まっている
 * denied: 拒否 / unavailable: 権限はあるが位置タスクを始められない(Expo Go など)
 */
export type TrackingState = 'on' | 'notAsked' | 'needsAlways' | 'denied' | 'unavailable';

export async function getTrackingState(): Promise<TrackingState> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status === 'undetermined') return 'notAsked';
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return 'needsAlways';
  return (await isStarted()) ? 'on' : 'unavailable';
}

async function isStarted(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  } catch {
    return false;
  }
}

/** 権限を求め(まだなら)、位置タスクを始める。結果の状態を返す */
export async function startTracking(): Promise<TrackingState> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return 'needsAlways';
  if (await isStarted()) return 'on';
  try {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 20,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: 'かよい帳',
        notificationBody: '行った建物を記録しています',
      },
    });
  } catch {
    return 'unavailable';
  }
  return 'on';
}
