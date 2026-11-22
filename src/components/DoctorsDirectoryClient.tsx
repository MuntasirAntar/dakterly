"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import doctorsBackdrop from "@/assets/images/hero_medical_team_1794851618083.jpg";
import DoctorCard from "@/components/DoctorCard";
import SearchForm from "@/components/SearchForm";
import SpecialtyChips from "@/components/SpecialtyChips";
import {
  DOCTORS_CATALOG_CACHE_KEY,
  filterCachedDoctors,
  readBrowserCache,
  refreshDoctorsCatalogCache,
  writeBrowserCache,
  type CachedDoctorItem,
  type CachedDoctorsPayload,
} from "@/lib/browser-cache";

type FilterState = {
  q?: string;
  specialty?: string;
  city?: string;
};

type Props = {
  initialAllDoctors: CachedDoctorItem[];
  initialSpecialties: string[];
  initialCities: string[];
  initialFilters: FilterState;
};

function buildDoctorsUrl(nextFilters: FilterState) {
  const params = new URLSearchParams();
  if (nextFilters.q) params.set("q", nextFilters.q);
  if (nextFilters.specialty) params.set("specialty", nextFilters.specialty);
  if (nextFilters.city) params.set("city", nextFilters.city);
  const query = params.toString();
  return query ? `/doctors?${query}` : "/doctors";
}

function readFiltersFromLocation(): FilterState {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  return {
    q: sp.get("q")?.trim() || undefined,
    specialty: sp.get("specialty")?.trim() || undefined,
    city: sp.get("city")?.trim() || undefined,
  };
}

export default function DoctorsDirectoryClient({
  initialAllDoctors,
  initialSpecialties,
  initialCities,
  initialFilters,
}: Props) {
  const [catalog, setCatalog] = useState<CachedDoctorsPayload>(() => ({
    doctors: initialAllDoctors,
    specialties: initialSpecialties,
    cities: initialCities,
  }));

  const serverFilterKey = `${initialFilters.q ?? ""}|${initialFilters.specialty ?? ""}|${initialFilters.city ?? ""}`;
  const [prevServerKey, setPrevServerKey] = useState(serverFilterKey);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  if (serverFilterKey !== prevServerKey) {
    setPrevServerKey(serverFilterKey);
    setFilters(initialFilters);
  }

  // Persist server-hydrated catalog into browser localStorage & refresh in background if needed
  useEffect(() => {
    const payload: CachedDoctorsPayload = {
      doctors: initialAllDoctors,
      specialties: initialSpecialties,
      cities: initialCities,
    };

    if (initialAllDoctors.length > 0) {
      writeBrowserCache(DOCTORS_CATALOG_CACHE_KEY, payload);
      return;
    }

    let cancelled = false;
    const cached = readBrowserCache<CachedDoctorsPayload>(DOCTORS_CATALOG_CACHE_KEY);
    if (cached && cached.data.doctors.length > 0) {
      queueMicrotask(() => {
        if (!cancelled) setCatalog(cached.data);
      });
    }
    if (!cached || cached.isStale) {
      void refreshDoctorsCatalogCache().then((fresh) => {
        if (!cancelled && fresh) setCatalog(fresh);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [initialAllDoctors, initialSpecialties, initialCities]);

  // Support browser back/forward buttons for shallow filter history entries
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname === "/doctors") {
        setFilters(readFiltersFromLocation());
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const applyFilters = useCallback((nextFilters: FilterState, pushHistory = true) => {
    setFilters(nextFilters);
    if (typeof window !== "undefined") {
      const nextUrl = buildDoctorsUrl(nextFilters);
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl !== currentUrl) {
        if (pushHistory) {
          window.history.pushState(null, "", nextUrl);
        } else {
          window.history.replaceState(null, "", nextUrl);
        }
      }
    }
  }, []);

  const filteredDoctors = useMemo(
    () => filterCachedDoctors(catalog.doctors, filters),
    [catalog.doctors, filters],
  );

  const hasFilters = Boolean(filters.q || filters.specialty || filters.city);

  return (
    <main className="flex-1 bg-emerald-50/45">
      {/* Colored emerald-teal header band */}
      <section className="relative overflow-hidden bg-teal-900 text-white">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src={doctorsBackdrop}
            alt="Medical specialists collaborating in a modern clinic corridor"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-950/92 via-teal-900/82 to-emerald-800/72" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="text-sm font-medium text-emerald-300">Verified Specialists</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">Find a doctor</h1>
          <p className="mt-2 max-w-xl text-sm text-teal-50/90 sm:text-base">
            Filter by specialty, clinic, or city to view chamber hours and book your slot.
          </p>
          <div className="mt-6 max-w-3xl">
            <SearchForm
              cities={catalog.cities}
              defaults={filters}
              onSearch={(next) => applyFilters(next, false)}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-emerald-900/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
          <SpecialtyChips
            specialties={catalog.specialties}
            active={filters.specialty}
            q={filters.q}
            city={filters.city}
            onSelect={(specialty) => applyFilters({ ...filters, specialty }, true)}
          />
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <p aria-live="polite" className="font-medium tabular-nums">
            {filteredDoctors.length} {filteredDoctors.length === 1 ? "doctor" : "doctors"} found
            {filters.city ? ` in ${filters.city}` : ""}
          </p>
          {hasFilters && (
            <Link
              href="/doctors"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  applyFilters({}, true);
                }
              }}
              className="font-semibold text-teal-700 hover:text-emerald-600 hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>

        {filteredDoctors.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-teal-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-900">No doctors match your search</p>
            <p className="mt-1 text-sm text-slate-600">Try fewer words, another city, or clear the filters.</p>
            <Link
              href="/doctors"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  applyFilters({}, true);
                }
              }}
              className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Show all doctors
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
