import type { Metadata } from "next";
import { doctorFilterSchema, getFilterOptions, searchDoctors } from "@/lib/doctors";
import type { CachedDoctorItem } from "@/lib/browser-cache";
import DoctorsDirectoryClient from "@/components/DoctorsDirectoryClient";

export const metadata: Metadata = { title: "Find a Doctor | Dakterly" };

export const revalidate = 60;

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

  const [allDoctors, options] = await Promise.all([searchDoctors({}, 200), getFilterOptions()]);

  const serializedDoctors: CachedDoctorItem[] = allDoctors.map((d) => ({
    id: d.id,
    clinicId: d.clinicId,
    specialtyId: d.specialtyId,
    name: d.name,
    qualifications: d.qualifications,
    bio: d.bio,
    photoUrl: d.photoUrl ?? null,
    consultationFee: d.consultationFee,
    avgConsultMinutes: d.avgConsultMinutes,
    isActive: d.isActive,
    specialty: { name: d.specialty.name },
    clinic: {
      id: d.clinic.id,
      name: d.clinic.name,
      city: d.clinic.city,
      address: d.clinic.address,
    },
    schedules: d.schedules.map((s) => ({
      weekday: s.weekday,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  }));

  return (
    <DoctorsDirectoryClient
      initialAllDoctors={serializedDoctors}
      initialSpecialties={options.specialties}
      initialCities={options.cities}
      initialFilters={{
        q: filters.q,
        specialty: filters.specialty,
        city: filters.city,
      }}
    />
  );
}
