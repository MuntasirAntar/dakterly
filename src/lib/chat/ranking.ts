const LOCATION_ALIASES: Array<[RegExp, string]> = [
  [/ঢাকা/g, "dhaka"],
  [/চট্টগ্রাম|চাটগাঁ|chittagong/gi, "chattogram"],
  [/উত্তরা/g, "uttara"],
  [/ধানমন্ডি/g, "dhanmondi"],
  [/জিইসি|gec\s*circle/gi, "gec"],
  [/মিরপুর/g, "mirpur"],
  [/গুলশান/g, "gulshan"],
  [/বনানী/g, "banani"],
  [/মোহাম্মদপুর/g, "mohammadpur"],
  [/মতিঝিল/g, "motijheel"],
  [/সিলেট/g, "sylhet"],
  [/রাজশাহী/g, "rajshahi"],
  [/খুলনা/g, "khulna"],
];

const AREA_STOP_WORDS = new Set([
  "in",
  "at",
  "near",
  "around",
  "area",
  "city",
  "bangladesh",
  "bd",
  "the",
  "of",
  "and",
  "thana",
  "upazila",
]);

export function normalizeLocationText(value?: string | null): string {
  if (!value) return "";
  let text = value.normalize("NFC").toLowerCase().trim();
  for (const [pattern, replacement] of LOCATION_ALIASES) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/[,./-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function extractAreaTokens(area?: string | null, city?: string | null): string[] {
  const normalizedArea = normalizeLocationText(area);
  if (!normalizedArea) return [];
  const normalizedCity = normalizeLocationText(city);
  const cityTokens = new Set(normalizedCity.split(/\s+/).filter(Boolean));

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of normalizedArea.split(/\s+/)) {
    if (!token || token.length < 2) continue;
    if (AREA_STOP_WORDS.has(token)) continue;
    if (cityTokens.has(token)) continue;
    if (!seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }
  return tokens;
}

export function resolveSpecialtyName(
  requested: string | undefined | null,
  availableSpecialties: string[],
): string {
  const fallback =
    availableSpecialties.find((s) => s.toLowerCase() === "general physician") ??
    availableSpecialties[0] ??
    "General Physician";

  if (!requested) return fallback;
  const needle = requested.trim().toLowerCase();
  if (!needle) return fallback;

  const exact = availableSpecialties.find((s) => s.toLowerCase() === needle);
  if (exact) return exact;

  const partial = availableSpecialties.find(
    (s) => s.toLowerCase().includes(needle) || needle.includes(s.toLowerCase()),
  );
  return partial ?? fallback;
}

export interface RankableDoctor {
  id: string;
  name: string;
  qualifications: string | null;
  photoUrl: string | null;
  consultationFee: number;
  specialty: { name: string };
  clinic: {
    id: string;
    name: string;
    city: string;
    address: string;
  };
  schedules?: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    slotMinutes?: number;
  }>;
}

export interface RankedDoctorEntry<T extends RankableDoctor> {
  doctor: T;
  matchedCity: boolean;
  matchedArea: boolean;
  areaScore: number;
}

export function rankDoctorsByLocation<T extends RankableDoctor>(
  doctors: T[],
  location: { city?: string | null; area?: string | null },
  limit = 5,
): {
  ranked: RankedDoctorEntry<T>[];
  fallbackFromOtherCities: boolean;
  requestedCity: string | null;
} {
  const requestedCityRaw = location.city?.trim() || null;
  const normalizedCity = normalizeLocationText(requestedCityRaw);
  const areaTokens = extractAreaTokens(location.area, requestedCityRaw);

  const scored = doctors.map((doctor) => {
    const docCity = normalizeLocationText(doctor.clinic.city);
    const docAddressAndClinic = normalizeLocationText(`${doctor.clinic.address} ${doctor.clinic.name}`);

    const matchedCity = Boolean(
      normalizedCity && (docCity === normalizedCity || docCity.includes(normalizedCity) || normalizedCity.includes(docCity)),
    );

    let areaScore = 0;
    for (const token of areaTokens) {
      if (docAddressAndClinic.includes(token)) {
        areaScore += 1;
      }
    }

    return {
      doctor,
      matchedCity,
      matchedArea: areaScore > 0,
      areaScore,
    };
  });

  scored.sort((a, b) => {
    if (a.matchedCity !== b.matchedCity) return a.matchedCity ? -1 : 1;
    if (a.areaScore !== b.areaScore) return b.areaScore - a.areaScore;
    return a.doctor.name.localeCompare(b.doctor.name);
  });

  const hasCityMatch = Boolean(normalizedCity) && scored.some((entry) => entry.matchedCity);
  const cityFiltered = hasCityMatch ? scored.filter((entry) => entry.matchedCity) : scored;

  return {
    ranked: cityFiltered.slice(0, limit),
    fallbackFromOtherCities: Boolean(normalizedCity) && !hasCityMatch && scored.length > 0,
    requestedCity: requestedCityRaw,
  };
}
