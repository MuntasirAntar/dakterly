import { z } from "zod";
import { db } from "@/lib/db";

// Words that people type but that should not have to match anything.
const STOP_WORDS = new Set(["in", "at", "for", "a", "an", "the", "near", "doctor", "doctors", "dr", "specialist"]);

// The only filters a visitor may use. Everything else in the URL is ignored.
export const doctorFilterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  specialty: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  clinicId: z.string().trim().max(40).optional(),
});
export type DoctorFilters = z.infer<typeof doctorFilterSchema>;

// Finds active doctors at active clinics. Every word in "q" must match the
// doctor's name, qualifications, specialty, clinic name or city, so
// "dermatologist dhaka" works.
// NOTE: SQLite's "contains" ignores upper/lower case. When we move to Postgres
// we will add  mode: "insensitive"  to each contains.
export async function searchDoctors(filters: DoctorFilters) {
  try {
    const words = (filters.q ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word && !STOP_WORDS.has(word))
      .slice(0, 5);

    return await db.doctor.findMany({
      where: {
        isActive: true,
        clinic: { isActive: true, ...(filters.city ? { city: filters.city } : {}) },
        ...(filters.specialty ? { specialty: { name: filters.specialty } } : {}),
        ...(filters.clinicId ? { clinicId: filters.clinicId } : {}),
        AND: words.map((word) => ({
          OR: [
            { name: { contains: word } },
            { qualifications: { contains: word } },
            { specialty: { name: { contains: word } } },
            { clinic: { name: { contains: word } } },
            { clinic: { city: { contains: word } } },
          ],
        })),
      },
      include: {
        specialty: { select: { name: true } },
        clinic: { select: { id: true, name: true, city: true, address: true } },
        schedules: {
          select: { weekday: true, startTime: true, endTime: true },
          orderBy: { weekday: "asc" },
        },
      },
      orderBy: { name: "asc" },
      take: 30,
    });
  } catch (err) {
    console.error("[Dakterly] searchDoctors failed:", err);
    return [];
  }
}

// One doctor with everything the profile page needs. Returns null if the
// doctor or their clinic is switched off, so the page shows "not found".
export async function getDoctor(id: string) {
  try {
    return await db.doctor.findFirst({
      where: { id, isActive: true, clinic: { isActive: true } },
      include: {
        specialty: { select: { name: true } },
        clinic: true,
        schedules: { orderBy: { weekday: "asc" } },
      },
    });
  } catch (err) {
    console.error("[Dakterly] getDoctor failed:", err);
    return null;
  }
}

export async function getClinic(id: string) {
  try {
    return await db.clinic.findFirst({ where: { id, isActive: true } });
  } catch (err) {
    console.error("[Dakterly] getClinic failed:", err);
    return null;
  }
}

// Choices for the search form: specialties that have doctors, and cities.
export async function getFilterOptions() {
  try {
    const [specialties, cities] = await Promise.all([
      db.specialty.findMany({
        where: { doctors: { some: { isActive: true } } },
        orderBy: { name: "asc" },
        select: { name: true },
      }),
      db.clinic.findMany({
        where: { isActive: true },
        distinct: ["city"],
        orderBy: { city: "asc" },
        select: { city: true },
      }),
    ]);
    return {
      specialties: specialties.map((s) => s.name),
      cities: cities.map((c) => c.city),
    };
  } catch (err) {
    console.error("[Dakterly] getFilterOptions failed:", err);
    return { specialties: [], cities: [] };
  }
}
