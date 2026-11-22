"use client";

export type CachedDoctorItem = {
  id: string;
  clinicId: string;
  specialtyId: string;
  name: string;
  qualifications: string | null;
  bio: string | null;
  photoUrl: string | null;
  consultationFee: number;
  avgConsultMinutes: number;
  isActive: boolean;
  specialty: { name: string };
  clinic: { id: string; name: string; city: string; address: string };
  schedules: Array<{ weekday: number; startTime: string; endTime: string }>;
};

export type CachedDoctorsPayload = {
  doctors: CachedDoctorItem[];
  specialties: string[];
  cities: string[];
};

const CACHE_PREFIX = "dakterly_cache_v1:";
const DEFAULT_FRESH_MS = 5 * 60 * 1000; // 5 minutes fresh
const DEFAULT_MAX_STALE_MS = 60 * 60 * 1000; // 1 hour max usable stale window

const STOP_WORDS = new Set([
  "in",
  "at",
  "for",
  "a",
  "an",
  "the",
  "near",
  "doctor",
  "doctors",
  "dr",
  "specialist",
]);

type CacheEnvelope<T> = {
  updatedAt: number;
  data: T;
};

// L1 in-memory cache for instant same-tab reads without JSON.parse overhead.
const memoryCache = new Map<string, CacheEnvelope<unknown>>();

function fullKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

export function readBrowserCache<T>(
  key: string,
  freshMs = DEFAULT_FRESH_MS,
  maxStaleMs = DEFAULT_MAX_STALE_MS,
): { data: T; isStale: boolean; updatedAt: number } | null {
  if (typeof window === "undefined") return null;

  const storageKey = fullKey(key);
  const now = Date.now();

  const memHit = memoryCache.get(storageKey) as CacheEnvelope<T> | undefined;
  if (memHit && typeof memHit.updatedAt === "number") {
    const age = now - memHit.updatedAt;
    if (age <= maxStaleMs) {
      return {
        data: memHit.data,
        isStale: age > freshMs,
        updatedAt: memHit.updatedAt,
      };
    }
    memoryCache.delete(storageKey);
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.updatedAt !== "number" || !("data" in parsed)) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    const age = now - parsed.updatedAt;
    if (age > maxStaleMs) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    memoryCache.set(storageKey, parsed);
    return {
      data: parsed.data,
      isStale: age > freshMs,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeBrowserCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  const storageKey = fullKey(key);
  const envelope: CacheEnvelope<T> = {
    updatedAt: Date.now(),
    data,
  };

  memoryCache.set(storageKey, envelope);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota or private-mode errors; L1 memory cache still works.
  }
}

export function clearBrowserCache(keyPrefix?: string): void {
  if (typeof window === "undefined") return;
  const targetPrefix = keyPrefix ? fullKey(keyPrefix) : CACHE_PREFIX;

  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(targetPrefix)) {
      memoryCache.delete(key);
    }
  }

  try {
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(targetPrefix)) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore private-mode errors.
  }

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_DATA_CACHE" });
  }
}

export const DOCTORS_CATALOG_CACHE_KEY = "doctors_catalog";

export async function refreshDoctorsCatalogCache(): Promise<CachedDoctorsPayload | null> {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch("/api/doctors?all=1", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      doctors?: CachedDoctorItem[];
      specialties?: string[];
      cities?: string[];
    };
    if (!Array.isArray(json.doctors)) return null;

    const specialties =
      Array.isArray(json.specialties) && json.specialties.length > 0
        ? json.specialties
        : Array.from(new Set(json.doctors.map((d) => d.specialty.name))).sort((a, b) => a.localeCompare(b));

    const cities =
      Array.isArray(json.cities) && json.cities.length > 0
        ? json.cities
        : Array.from(new Set(json.doctors.map((d) => d.clinic.city))).sort((a, b) => a.localeCompare(b));

    const payload: CachedDoctorsPayload = {
      doctors: json.doctors,
      specialties,
      cities,
    };
    writeBrowserCache(DOCTORS_CATALOG_CACHE_KEY, payload);
    return payload;
  } catch {
    return null;
  }
}

export function filterCachedDoctors(
  doctors: CachedDoctorItem[],
  filters: { q?: string; specialty?: string; city?: string; clinicId?: string },
): CachedDoctorItem[] {
  const words = (filters.q ?? "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .slice(0, 5);

  return doctors.filter((doc) => {
    if (filters.city && doc.clinic.city !== filters.city) return false;
    if (filters.specialty && doc.specialty.name !== filters.specialty) return false;
    if (filters.clinicId && doc.clinicId !== filters.clinicId) return false;

    if (words.length === 0) return true;

    const haystack = [
      doc.name,
      doc.qualifications ?? "",
      doc.specialty.name,
      doc.clinic.name,
      doc.clinic.city,
    ]
      .join(" ")
      .toLowerCase();

    return words.every((word) => haystack.includes(word));
  });
}
