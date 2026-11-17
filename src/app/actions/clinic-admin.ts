"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export type RemovalRequestResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function requestDoctorRemovalAction(input: {
  doctorId: string;
  reason?: string;
}): Promise<RemovalRequestResult> {
  const user = await requireRole("CLINIC_ADMIN");
  if (!user.clinicId) {
    return { ok: false, error: "No clinic is linked to this account." };
  }

  const doctorId = input.doctorId.trim();
  const reason = input.reason?.trim().slice(0, 300) || null;
  if (!doctorId) {
    return { ok: false, error: "Select a doctor first." };
  }

  const doctor = await db.doctor.findFirst({
    where: { id: doctorId, clinicId: user.clinicId },
    include: {
      specialty: { select: { name: true } },
      clinic: { select: { name: true } },
    },
  });
  if (!doctor) {
    return { ok: false, error: "Doctor not found in your clinic." };
  }

  const existingPending = await db.doctorRemovalRequest.findFirst({
    where: { doctorId: doctor.id, clinicId: user.clinicId, status: "PENDING" },
  });
  if (existingPending) {
    return { ok: false, error: `A removal request for ${doctor.name} is already pending.` };
  }

  const created = await db.doctorRemovalRequest.create({
    data: {
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialty: doctor.specialty.name,
      clinicId: doctor.clinicId,
      clinicName: doctor.clinic.name,
      requestedBy: `${user.name} (${user.email})`,
      reason,
      status: "PENDING",
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "REQUEST_DOCTOR_REMOVAL",
      entity: "DoctorRemovalRequest",
      entityId: created.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/superadmin");

  return { ok: true, message: `Removal request for ${doctor.name} sent to Super Admin.` };
}
