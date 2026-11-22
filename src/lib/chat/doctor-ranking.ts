import { db } from "@/lib/db";
import { searchDoctors } from "@/lib/doctors";
import { formatTime } from "@/lib/format";
import { availableSlots, bookableDates } from "@/lib/slots";
import { formatDate, nowInClinicTz } from "@/lib/time";
import { rankDoctorsByLocation, resolveSpecialtyName } from "./ranking";
import type { ChatDoctorResult } from "./types";

export {
  extractAreaTokens,
  normalizeLocationText,
  rankDoctorsByLocation,
  resolveSpecialtyName,
  type RankableDoctor,
  type RankedDoctorEntry,
} from "./ranking";

export async function findDoctorsForChat(input: {
  specialty?: string;
  city?: string;
  area?: string;
  specialties?: string[];
}): Promise<{
  specialtyUsed: string;
  doctors: ChatDoctorResult[];
  fallbackFromOtherCities: boolean;
  requestedCity: string | null;
}> {
  const availableSpecialties =
    input.specialties && input.specialties.length > 0
      ? input.specialties
      : (
          await db.specialty.findMany({
            where: { doctors: { some: { isActive: true, clinic: { isActive: true } } } },
            orderBy: { name: "asc" },
            select: { name: true },
          })
        ).map((s) => s.name);
  const specialtyUsed = resolveSpecialtyName(input.specialty, availableSpecialties);

  let candidates = await searchDoctors({ specialty: specialtyUsed }, 50);

  if (candidates.length === 0 && specialtyUsed !== "General Physician") {
    candidates = await searchDoctors({ specialty: "General Physician" }, 50);
  }
  if (candidates.length === 0) {
    candidates = await searchDoctors({}, 50);
  }

  const { ranked, fallbackFromOtherCities, requestedCity } = rankDoctorsByLocation(
    candidates,
    { city: input.city, area: input.area },
    5,
  );

  const doctorIds = ranked.map((r) => r.doctor.id);
  const now = nowInClinicTz();
  const dates = bookableDates(now.date);

  const [fullDoctors, bookedRows] =
    doctorIds.length > 0
      ? await Promise.all([
          db.doctor.findMany({
            where: { id: { in: doctorIds }, isActive: true, clinic: { isActive: true } },
            select: {
              id: true,
              schedules: {
                select: { weekday: true, startTime: true, endTime: true, slotMinutes: true },
                orderBy: { weekday: "asc" },
              },
            },
          }),
          db.appointment.findMany({
            where: {
              doctorId: { in: doctorIds },
              status: { not: "CANCELLED" },
              date: { gte: dates[0], lte: dates[dates.length - 1] },
            },
            select: { doctorId: true, date: true, slotTime: true },
          }),
        ])
      : [[], []];

  const schedulesByDoctor = new Map(fullDoctors.map((d) => [d.id, d.schedules]));
  const bookedByDoctorDate = new Map<string, string[]>();
  for (const row of bookedRows) {
    const key = `${row.doctorId}|${row.date}`;
    bookedByDoctorDate.set(key, [...(bookedByDoctorDate.get(key) ?? []), row.slotTime]);
  }

  const results: ChatDoctorResult[] = ranked.map(({ doctor, matchedCity, matchedArea }) => {
    const schedules = schedulesByDoctor.get(doctor.id) ?? [];
    let nextAvailable: string | null = null;
    for (const date of dates) {
      const open = availableSlots({
        schedules,
        date,
        bookedTimes: bookedByDoctorDate.get(`${doctor.id}|${date}`) ?? [],
        now,
      });
      if (open.length > 0) {
        nextAvailable = `${formatDate(date)} · ${formatTime(open[0])}`;
        break;
      }
    }

    return {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty.name,
      qualifications: doctor.qualifications,
      photoUrl: doctor.photoUrl,
      clinicId: doctor.clinic.id,
      clinicName: doctor.clinic.name,
      city: doctor.clinic.city,
      address: doctor.clinic.address,
      fee: doctor.consultationFee,
      nextAvailable,
      matchedCity,
      matchedArea,
    };
  });

  return {
    specialtyUsed,
    doctors: results,
    fallbackFromOtherCities,
    requestedCity,
  };
}
