/**
 * RustMaps API client (https://rustmaps.com/dashboard). Requires RUSTMAPS_API_KEY.
 * All response shapes below verified live on 2026-07-31.
 */

const BASE_URL = "https://api.rustmaps.com/v4/maps";

function getApiKey(): string {
  const key = process.env.RUSTMAPS_API_KEY;
  if (!key) {
    throw new Error("RUSTMAPS_API_KEY is not set in the environment");
  }
  return key;
}

function authHeaders(): HeadersInit {
  return { "X-API-Key": getApiKey() };
}

export interface RustMapMonument {
  type: string;
  coordinates: { x: number; y: number };
}

export interface RustMapData {
  id: string;
  seed: number;
  size: number;
  url: string;
  imageUrl: string;
  imageIconUrl: string;
  thumbnailUrl: string;
  isStaging: boolean;
  isCustomMap: boolean;
  totalMonuments: number;
  monuments: RustMapMonument[];
}

function normalizeMapData(raw: {
  id: string;
  seed: number;
  size: number;
  url: string;
  imageUrl: string;
  imageIconUrl: string;
  thumbnailUrl: string;
  isStaging: boolean;
  isCustomMap: boolean;
  totalMonuments: number;
  monuments: RustMapMonument[];
}): RustMapData {
  return {
    id: raw.id,
    seed: raw.seed,
    size: raw.size,
    url: raw.url,
    imageUrl: raw.imageUrl,
    imageIconUrl: raw.imageIconUrl,
    thumbnailUrl: raw.thumbnailUrl,
    isStaging: raw.isStaging,
    isCustomMap: raw.isCustomMap,
    totalMonuments: raw.totalMonuments,
    monuments: raw.monuments,
  };
}

/** Fetches an already-generated map by size+seed. Returns null if it hasn't been generated yet. */
export async function getMap(size: number, seed: number): Promise<RustMapData | null> {
  const res = await fetch(`${BASE_URL}/${size}/${seed}`, { headers: authHeaders() });
  const body = await res.json();

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`RustMaps GET /${size}/${seed} failed: ${res.status} ${body?.meta?.errors?.join(", ") ?? ""}`);
  }
  return normalizeMapData(body.data);
}

export interface MapGenerationQueued {
  mapId: string;
  queuePosition: number | null;
  state: string;
}

/**
 * Requests generation of a not-yet-existing map. Note: if the map already exists, RustMaps
 * responds 200 with `data: null` (verified live) — it does NOT hand back the map data, so
 * callers must still follow up with `getMap`/`getMapById` regardless of what this returns.
 */
export async function requestMapGeneration(size: number, seed: number): Promise<MapGenerationQueued | null> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ size, seed, staging: false }),
  });
  const body = await res.json();

  if (!res.ok) {
    throw new Error(`RustMaps POST /maps failed: ${res.status} ${body?.meta?.errors?.join(", ") ?? ""}`);
  }
  if (!body.data) {
    return null;
  }
  return { mapId: body.data.mapId, queuePosition: body.data.queuePosition ?? null, state: body.data.state };
}

/** Fetches a map by its RustMaps-assigned id. Returns null while it's still generating. */
export async function getMapById(mapId: string): Promise<RustMapData | null> {
  const res = await fetch(`${BASE_URL}/${mapId}`, { headers: authHeaders() });
  const body = await res.json();

  if (res.status === 409) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`RustMaps GET /${mapId} failed: ${res.status} ${body?.meta?.errors?.join(", ") ?? ""}`);
  }
  return normalizeMapData(body.data);
}
