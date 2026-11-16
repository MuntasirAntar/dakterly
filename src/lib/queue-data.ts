// Database reads for the queue. The rules themselves live in queue.ts.
import { db } from "@/lib/db";
import {
  averageConsultMinutes, countAhead, estimateWaitMinutes, phaseFor,
  type QueueSnapshot, type Status,
} from "@/lib/queue";
import { nowInClinicTz } from "@/lib/time";

// Average length of this doctor's last consultations (in minutes).
export async function getAverageMinutes(doctorId: string, fallback: number) {
  const rows = await db.appointment.findMany({
    where: { doctorId, status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
    orderBy: [{ completedAt: "desc" }],
    take: 10,
    select: { startedAt: true, completedAt: true },
  });
  const minutes = rows.map((r) => ((r.completedAt as Date).getTime() - (r.startedAt as Date).getTime()) / 60000);
  return averageConsultMinutes(minutes, fallback);
}

// Everything the clinic dashboard needs for one clinic on one day.
export async function getClinicDay(clinicId: string, date: string, weekday: number) {
  const [doctors, appointments] = await Promise.all([
    db.doctor.findMany({
      where: { clinicId, isActive: true },
      include: { specialty: true, schedules: true },
    }),
    db.appointment.findMany({
      where: { date, doctor: { clinicId } },
      include: { patient: { select: { name: true, phone: true } } },
      orderBy: [{ slotTime: "asc" }, { tokenNumber: "asc" }],
    }),
  ]);

  return doctors
    .map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty.name,
      worksToday: doctor.schedules.some((s) => s.weekday === weekday),
      appointments: appointments.filter((a) => a.doctorId === doctor.id),
    }))
    // Show doctors who work today, or who somehow have bookings today.
    .filter((d) => d.worksToday || d.appointments.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// One doctor's list for one day, only if the doctor belongs to this clinic.
export async function getDoctorDayList(clinicId: string, doctorId: string, date: string) {
  const doctor = await db.doctor.findFirst({
    where: { id: doctorId, clinicId },
    include: { specialty: true, clinic: true },
  });
  if (!doctor) return null;

  const appointments = await db.appointment.findMany({
    where: { doctorId, date },
    include: { patient: { select: { name: true, phone: true } } },
    orderBy: [{ slotTime: "asc" }, { tokenNumber: "asc" }],
  });
  return { doctor, appointments };
}

// The patient's own place in the line. Looked up by id AND patient, so nobody
// can see another person's appointment.
export async function getQueueSnapshot(patientId: string, appointmentId: string): Promise<QueueSnapshot | null> {
  const mine = await db.appointment.findFirst({
    where: { id: appointmentId, patientId },
    include: { doctor: true },
  });
  if (!mine) return null;

  const today = nowInClinicTz().date;
  const status = mine.status as Status;
  let ahead = 0;
  let nowServingToken: number | null = null;
  let avgMinutes = mine.doctor.avgConsultMinutes;

  if (mine.date === today && ["BOOKED", "CHECKED_IN", "IN_PROGRESS"].includes(status)) {
    const day = await db.appointment.findMany({
      where: { doctorId: mine.doctorId, date: today },
      select: { id: true, slotTime: true, tokenNumber: true, status: true },
    });
    const entries = day.map((a) => ({ id: a.id, slotTime: a.slotTime, tokenNumber: a.tokenNumber, status: a.status as Status }));
    ahead = countAhead({ id: mine.id, slotTime: mine.slotTime, tokenNumber: mine.tokenNumber, status }, entries);
    nowServingToken = entries.find((e) => e.status === "IN_PROGRESS")?.tokenNumber ?? null;
    avgMinutes = await getAverageMinutes(mine.doctorId, mine.doctor.avgConsultMinutes);
  }

  return {
    appointmentId: mine.id,
    status,
    phase: phaseFor({ status, date: mine.date, today, ahead }),
    tokenNumber: mine.tokenNumber,
    date: mine.date,
    slotTime: mine.slotTime,
    ahead,
    position: ahead + 1,
    estimatedWaitMinutes: estimateWaitMinutes(ahead, avgMinutes),
    avgMinutes,
    nowServingToken,
  };
}
