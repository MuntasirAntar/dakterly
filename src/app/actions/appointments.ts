"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { cancelBooking, createBooking } from "@/lib/booking";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function bookAppointment(formData: FormData) {
  const user = await requireRole("PATIENT");
  const doctorId = text(formData, "doctorId");
  const date = text(formData, "date");
  const slotTime = text(formData, "slotTime");

  const result = await createBooking({ patientId: user.id, doctorId, date, slotTime });

  if (!result.ok) {
    redirect(`/doctors/${encodeURIComponent(doctorId)}/book?date=${encodeURIComponent(date)}&error=${result.error}`);
  }
  revalidatePath("/appointments");
  revalidatePath(`/doctors/${doctorId}/book`);
  revalidatePath("/admin");
  redirect(`/appointments/${result.id}?booked=1`);
}

export async function cancelAppointment(formData: FormData) {
  const user = await requireRole("PATIENT");
  const appointmentId = text(formData, "appointmentId");

  const result = await cancelBooking({ patientId: user.id, appointmentId });

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath("/admin");
  const page = `/appointments/${encodeURIComponent(appointmentId)}`;
  redirect(result.ok ? `${page}?cancelled=1` : `${page}?error=${result.error}`);
}
