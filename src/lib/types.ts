export type LatLng = { lat: number; lng: number };

/** GPSから受け取った1点。accuracy はメートル(不明なら null)、t はミリ秒 */
export type Point = { lat: number; lng: number; accuracy: number | null; t: number };

/** 滞在。lat/lng は中心 */
export type Stay = { lat: number; lng: number; arrivedAt: number; departedAt: number };

export type NameSource = 'osm' | 'user' | 'none';

export type Place = {
  id: number;
  name: string | null;
  nameSource: NameSource;
  lat: number;
  lng: number;
  createdAt: number;
  namingPending: boolean;
};

export type Visit = { id: number; placeId: number; arrivedAt: number; departedAt: number };
