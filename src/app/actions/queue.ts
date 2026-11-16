"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextStatus, timestampChanges, type QueueAction, type Status } from "@/lib/queue";
import { currentTime, nowInClinicTz } from "@/lib/time";

export type QueueFormState = { error?: string; done?: number };

const ACTIONS: QueueAction[] = ["check_in", "start", "complete", "no_show", "undo"];

export async function updateAppointmentStatus(_prev: QueueFormState, formData: FormData): Promise<QueueFormState> {
  const user = await requireRole("CLINIC_ADMIN");
  if (!user.clinicId) return { error: "No clinic is linked to this account." };

  const appointmentId = formData.get("appointmentId");
  const action = formData.get("action");
  if (typeof appointmentId !== "string" || typeof action !== "string" || !ACTIONS.includes(action as QueueAction)) {
    return { error: "That request was not valid. Please refresh the page." };
  }

  // The clinic comes from the logged-in account, never from the form, so
  // staff can only touch appointments of THEIR OWN clinic.
  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, doctor: { clinicId: user.clinicId } },
  });
  if (!appointment) return { error: "Appointment not found." };

  if (appointment.date !== nowInClinicTz().date) {
    return { error: "You can only change today's appointments." };
  }

  const from = appointment.status as Status;
  const to = nextStatus(from, action as QueueAction);
  if (!to) {
    return { error: "This appointment was changed by someone else. The list has been refreshed." };
  }

  // One patient at a time with each doctor.
  if (action === "start") {
    const busy = await db.appointment.count({
      where: { doctorId: appointment.doctorId, date: appointment.date, status: "IN_PROGRESS" },
    });
    if (busy > 0) return { error: "This doctor already has a patient in progress. Complete that visit first." };
  }

  // "Compare and set": only change it if the status is STILL what we just read.
  // If two receptionists click at the same moment, only one of them wins.
  const result = await db.appointment.updateMany({
    where: { id: appointment.id, status: from },
    data: { status: to, ...timestampChanges(action as QueueAction, from, currentTime()) },
  });
  if (result.count === 0) {
    revalidatePath("/admin");
    return { error: "Someone else just changed this appointment. The list has been refreshed." };
  }

  revalidatePath("/admin");
  return { done: Date.now() };
}
