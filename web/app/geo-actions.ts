'use server';
import { nameAt, placeOf, type Place } from '@/lib/geo';

/** Used by the service-area map: find a typed place, or name the town under a dropped pin. */
export async function findPlace(text: string): Promise<Place | null> { return placeOf(String(text).slice(0, 60)); }
export async function townAt(lat: number, lng: number): Promise<string | null> {
  return Number.isFinite(lat) && Number.isFinite(lng) ? nameAt(lat, lng) : null;
}
