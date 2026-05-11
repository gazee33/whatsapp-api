import { config } from '../config.js';

const GOOGLE_MAPS_BASE = 'https://maps.googleapis.com/maps/api';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface DistanceResult {
  distanceKm: number;
  durationMin: number;
}

export interface DeliveryTier {
  maxKm: number;
  fee: number;
}

function getApiKey(): string {
  const key = config.googleMapsApiKey;
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }
  return key;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeResult> {
  const key = getApiKey();
  const url = `${GOOGLE_MAPS_BASE}/geocode/json?latlng=${lat},${lng}&key=${key}`;

  const res = await fetch(url);
  const data = await res.json() as any;

  if (data.status !== 'OK') {
    throw new Error(`Reverse geocode failed: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`);
  }

  return {
    lat,
    lng,
    formattedAddress: data.results[0]?.formatted_address || '',
  };
}

export async function forwardGeocode(address: string): Promise<GeocodeResult> {
  const key = getApiKey();
  const url = `${GOOGLE_MAPS_BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  const res = await fetch(url);
  const data = await res.json() as any;

  if (data.status !== 'OK') {
    throw new Error(`Forward geocode failed: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`);
  }

  const result = data.results?.[0];

  if (!result) {
    throw new Error(`Forward geocode returned no results for address`);
  }

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

export async function getDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<DistanceResult> {
  const key = getApiKey();
  const origin = `${originLat},${originLng}`;
  const dest = `${destLat},${destLng}`;
  const url = `${GOOGLE_MAPS_BASE}/distancematrix/json?origins=${origin}&destinations=${dest}&units=metric&key=${key}`;

  const res = await fetch(url);
  const data = await res.json() as any;

  if (data.status !== 'OK') {
    throw new Error(`Distance matrix failed: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`);
  }

  const element = data.rows[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Could not calculate distance between the locations`);
  }

  return {
    distanceKm: Math.round((element.distance?.value || 0) / 100) / 10,
    durationMin: Math.ceil((element.duration?.value || 0) / 60),
  };
}

export function calculateDeliveryFee(
  distanceKm: number,
  tiersJson: string | null | undefined,
  maxDistanceKm: number | null | undefined,
): { fee: number } | { error: string } {
  if (maxDistanceKm != null && distanceKm > maxDistanceKm) {
    return { error: `Sorry, we only deliver within ${maxDistanceKm} km of the restaurant. Your location is ${distanceKm} km away.` };
  }

  let tiers: DeliveryTier[];
  try {
    tiers = tiersJson ? (JSON.parse(tiersJson) as DeliveryTier[]) : [];
  } catch {
    tiers = [];
  }

  if (tiers.length === 0) {
    return { fee: 0 };
  }

  const sorted = [...tiers].sort((a, b) => a.maxKm - b.maxKm);
  const matched = sorted.find((t) => distanceKm <= t.maxKm);

  if (matched) {
    return { fee: matched.fee };
  }

  const maxTier = sorted[sorted.length - 1];
  return { fee: maxTier.fee };
}
