import { z } from "zod";
import { db } from "@/lib/db";
import { getDoctor } from "@/lib/doctors";
import { availableSlots, bookableDates, canCancel, slotsForDate } from "@/lib/slots";
import { nowInClinicTz, type ClinicNow } from "@/lib/time";

export const MAX_UPCOMING_APPOINTMENTS = 5;

export type BookingError =
  | "invalid"
  | "not_found"
  | "slot_unavailable"
  | "slot_taken"
  | "duplicate_doctor_day"
  | "overlap"
  | "limit"
  | "busy";

export type CancelError = "not_found" | "not_cancellable" | "too_late";

export type BookingResult = { ok: true; id: string } | { ok: false; error: BookingError };
export type CancelResult = { ok: true } | { ok: false; error: CancelError };

// Messages shown to the patient for each error code.
export const BOOKING_MESSAGES: Record<string, string> = {
  invalid: "Something was wrong with that request. Please try again.",
  not_found: "This doctor or appointment could not be found.",
  slot_unavailable: "That time is no longer available. Please pick another slot.",
  slot_taken: "Sorry, someone else just booked that time. Please pick another slot.",
  duplicate_doctor_day: "You already have an appointment with this doctor on that day.",
  overlap: "You already have another appointment at that time.",
  limit: `You can have at most ${MAX_UPCOMING_APPOINTMENTS} upcoming appointments. Cancel one, or wait until after a visit.`,
  busy: "We are very busy right now. Please try again in a moment.",
  too_late: "It is too late to cancel online. Please call the clinic.",
  not_cancellable: "This appointment can no longer be cancelled.",
};

const bookingInputSchema = z.object({
  patientId: z.string().min(1).max(40),
  doctorId: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/),
});

// Prisma reports "this value must be unique" with the error code P2002.
function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

// Times already taken for a doctor on a date (cancelled ones are free again).
export async function getBookedTimes(doctorId: string, date: string) {
  const rows = await db.appointment.findMany({
    where: { doctorId, date, status: { not: "CANCELLED" } },
    select: { slotTime: true },
  });
  return rows.map((r) => r.slotTime);
}

type ScheduleRow = { weekday: number; startTime: string; endTime: string; slotMinutes: number };

// For the date picker: for each bookable day, which slots are still free?
export async function getAvailabilityByDate(doctorId: string, schedules: ScheduleRow[], now: ClinicNow) {
  const dates = bookableDates(now.date);
  const rows = await db.appointment.findMany({
    where: {
      doctorId,
      status: { not: "CANCELLED" },
      date: { gte: dates[0], lte: dates[dates.length - 1] },
    },
    select: { date: true, slotTime: true },
  });

  const bookedByDate = new Map<string, string[]>();
  for (const row of rows) bookedByDate.set(row.date, [...(bookedByDate.get(row.date) ?? []), row.slotTime]);

  return dates.map((date) => ({
    date,
    total: slotsForDate(schedules, date).length, // 0 means the doctor does not sit that day
    slots: availableSlots({ schedules, date, bookedTimes: bookedByDate.get(date) ?? [], now }),
  }));
}

// Book a slot. Every rule is checked here on the server, because the browser
// can be edited by anyone. The database has the final say: the unique
// "activeSlotKey" means two people can never hold the same slot.
export async function createBooking(input: {
  patientId: string;
  doctorId: string;
  date: string;
  slotTime: string;
}): Promise<BookingResult> {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { patientId, doctorId, date, slotTime } = parsed.data;

  const now = nowInClinicTz();
  const doctor = await getDoctor(doctorId);
  if (!doctor) return { ok: false, error: "not_found" };

  const bookedTimes = await getBookedTimes(doctorId, date);
  const open = availableSlots({ schedules: doctor.schedules, date, bookedTimes, now });
  if (!open.includes(slotTime)) {
    return { ok: false, error: bookedTimes.includes(slotTime) ? "slot_taken" : "slot_unavailable" };
  }

  // Rules about the patient
  const stillActive = { not: "CANCELLED" } as const;
  if (await db.appointment.findFirst({ where: { patientId, doctorId, date, status: stillActive }, select: { id: true } })) {
    return { ok: false, error: "duplicate_doctor_day" };
  }
  if (await db.appointment.findFirst({ where: { patientId, date, slotTime, status: stillActive }, select: { id: true } })) {
    return { ok: false, error: "overlap" };
  }
  const upcoming = await db.appointment.count({ where: { patientId, status: "BOOKED", date: { gte: now.date } } });
  if (upcoming >= MAX_UPCOMING_APPOINTMENTS) return { ok: false, error: "limit" };

  // Create it. Two things must be unique: the slot, and the token number for
  // that doctor and day. If someone else wins the race, the database refuses
  // and we find out which of the two it was.
  const activeSlotKey = `${doctorId}|${date}|${slotTime}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await db.appointment.aggregate({ where: { doctorId, date }, _max: { tokenNumber: true } });
    const tokenNumber = (last._max.tokenNumber ?? 0) + 1;

    try {
      const created = await db.appointment.create({
        data: { patientId, doctorId, date, slotTime, tokenNumber, activeSlotKey },
        select: { id: true },
      });
      return { ok: true, id: created.id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const taken = await db.appointment.findFirst({ where: { activeSlotKey }, select: { id: true } });
      if (taken) return { ok: false, error: "slot_taken" };
      // Otherwise two people got the same token number at once: try again with a fresh one.
    }
  }
  return { ok: false, error: "busy" };
}

// Cancel. Frees the slot for someone else and keeps the record for history.
export async function cancelBooking(input: { patientId: string; appointmentId: string }): Promise<CancelResult> {
  const { patientId, appointmentId } = input;

  // "patientId" in the filter means you can only ever cancel your own.
  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, patientId } });
  if (!appointment) return { ok: false, error: "not_found" };
  if (appointment.status !== "BOOKED") return { ok: false, error: "not_cancellable" };
  if (!canCancel(appointment.date, appointment.slotTime, nowInClinicTz())) return { ok: false, error: "too_late" };

  // Only change it if it is STILL booked (a double click, or the clinic
  // checking the patient in at the same moment, must not be overwritten).
  const result = await db.appointment.updateMany({
    where: { id: appointment.id, patientId, status: "BOOKED" },
    data: { status: "CANCELLED", cancelledAt: new Date(), activeSlotKey: null },
  });
  if (result.count === 0) return { ok: false, error: "not_cancellable" };
  return { ok: true };
}

const doctorInfo = {
  include: {
    specialty: { select: { name: true } },
    clinic: { select: { id: true, name: true, city: true, address: true, phone: true } },
  },
} as const;

export async function getMyAppointments(patientId: string) {
  return db.appointment.findMany({
    where: { patientId },
    include: { doctor: doctorInfo },
    orderBy: [{ date: "asc" }, { slotTime: "asc" }],
    take: 100,
  });
}

// Filtering by patientId as well means another user's id in the URL finds nothing.
export async function getMyAppointment(patientId: string, id: string) {
  return db.appointment.findFirst({
    where: { id, patientId },
    include: { doctor: doctorInfo },
  });
}

export async function getPatientDoctorAppointmentsInWindow(
  patientId: string,
  doctorId: string,
  dates: string[],
) {
  if (dates.length === 0) return [];
  return db.appointment.findMany({
    where: {
      patientId,
      doctorId,
      status: { not: "CANCELLED" },
      date: { gte: dates[0], lte: dates[dates.length - 1] },
    },
    select: { id: true, date: true, slotTime: true, tokenNumber: true, status: true },
  });
}

export function isUpcoming(status: string, date: string, today: string) {
  return (status === "BOOKED" || status === "CHECKED_IN" || status === "IN_PROGRESS") && date >= today;
}
