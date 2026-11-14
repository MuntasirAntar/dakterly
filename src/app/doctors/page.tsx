import Link from "next/link";
import type { Metadata } from "next";
import { doctorFilterSchema, getFilterOptions, searchDoctors } from "@/lib/doctors";
import DoctorCard from "@/components/DoctorCard";
import SearchForm from "@/components/SearchForm";
import SpecialtyChips from "@/components/SpecialtyChips";

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Find a doctor</h1>

      <div className="mt-5">
        <SearchForm cities={options.cities} defaults={filters} />
      </div>

      <div className="mt-5">
        <SpecialtyChips specialties={options.specialties} active={filters.specialty} q={filters.q} city={filters.city} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <p aria-live="polite">
          {doctors.length} {doctors.length === 1 ? "doctor" : "doctors"} found
          {filters.city ? ` in ${filters.city}` : ""}
        </p>
        {hasFilters && (
          <Link href="/doctors" className="font-medium text-teal-700 hover:underline">
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
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900">No doctors match your search</p>
          <p className="mt-1 text-sm text-gray-600">Try fewer words, another city, or clear the filters.</p>
          <Link href="/doctors" className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
            Show all doctors
          </Link>
        </div>
      )}
    </main>
  );
}
