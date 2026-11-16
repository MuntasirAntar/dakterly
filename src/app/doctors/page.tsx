import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { doctorFilterSchema, getFilterOptions, searchDoctors } from "@/lib/doctors";
import doctorsBackdrop from "@/assets/images/hero_medical_team_1794851618083.jpg";
import DoctorCard from "@/components/DoctorCard";
import SearchForm from "@/components/SearchForm";
import SpecialtyChips from "@/components/SpecialtyChips";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find a Doctor | Dakterly" };

type SearchParams = Record<string, string | string[] | undefined>;

// A URL can contain ?q=a&q=b. We only use the first value.
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const parsed = doctorFilterSchema.safeParse({
    q: first(raw.q),
    specialty: first(raw.specialty),
    city: first(raw.city),
  });
  const filters = parsed.success ? parsed.data : {};

  const [doctors, options] = await Promise.all([searchDoctors(filters), getFilterOptions()]);
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
            priority
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
            <SearchForm cities={options.cities} defaults={filters} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-emerald-900/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
          <SpecialtyChips specialties={options.specialties} active={filters.specialty} q={filters.q} city={filters.city} />
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <p aria-live="polite" className="font-medium tabular-nums">
            {doctors.length} {doctors.length === 1 ? "doctor" : "doctors"} found
            {filters.city ? ` in ${filters.city}` : ""}
          </p>
          {hasFilters && (
            <Link href="/doctors" className="font-semibold text-teal-700 hover:text-emerald-600 hover:underline">
              Clear filters
            </Link>
          )}
        </div>

        {doctors.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-teal-300 bg-white p-10 text-center">
            <p className="font-semibold text-slate-900">No doctors match your search</p>
            <p className="mt-1 text-sm text-slate-600">Try fewer words, another city, or clear the filters.</p>
            <Link
              href="/doctors"
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
