"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { parseDoctorsCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { readUploadedDoctorPhoto } from "@/lib/photo-upload";

export type AdminActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function logAudit(userId: string, action: string, entity: string, entityId?: string | null) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: entityId ?? null,
    },
  });
}

function revalidateAll() {
  revalidatePath("/superadmin");
  revalidatePath("/");
  revalidatePath("/doctors");
  revalidatePath("/admin");
}

const timeRegex = /^\d{2}:\d{2}$/;

const clinicSchema = z.object({
  name: z.string().trim().min(2, "Clinic name must be at least 2 characters").max(120),
  address: z.string().trim().min(3, "Address is required").max(200),
  city: z.string().trim().min(2, "City is required").max(80),
  phone: z.string().trim().max(30).optional(),
  openTime: z.string().regex(timeRegex, "Open time must be HH:MM"),
  closeTime: z.string().regex(timeRegex, "Close time must be HH:MM"),
});

export async function createClinicAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = clinicSchema.safeParse({
    name: str(formData, "name"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    phone: str(formData, "phone") || undefined,
    openTime: str(formData, "openTime") || "09:00",
    closeTime: str(formData, "closeTime") || "21:00",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid clinic details." };
  }

  const clinic = await db.clinic.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      phone: parsed.data.phone ?? null,
      openTime: parsed.data.openTime,
      closeTime: parsed.data.closeTime,
      isActive: true,
    },
  });

  await logAudit(actor.id, "CREATE_CLINIC", "Clinic", clinic.id);
  revalidateAll();
  return { ok: true, message: `Created clinic "${clinic.name}".` };
}

export async function updateClinicAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");
  const clinicId = str(formData, "clinicId");
  if (!clinicId) return { ok: false, error: "Clinic ID is required." };

  const parsed = clinicSchema.safeParse({
    name: str(formData, "name"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    phone: str(formData, "phone") || undefined,
    openTime: str(formData, "openTime") || "09:00",
    closeTime: str(formData, "closeTime") || "21:00",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid clinic details." };
  }

  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      phone: parsed.data.phone ?? null,
      openTime: parsed.data.openTime,
      closeTime: parsed.data.closeTime,
    },
  });

  await logAudit(actor.id, "UPDATE_CLINIC", "Clinic", clinic.id);
  revalidateAll();
  return { ok: true, message: `Updated "${clinic.name}".` };
}

export async function toggleClinicActiveAction(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");
  const clinicId = str(formData, "clinicId");
  const nextActive = str(formData, "nextActive") === "true";
  if (!clinicId) return;

  await db.clinic.update({
    where: { id: clinicId },
    data: { isActive: nextActive },
  });

  await logAudit(actor.id, nextActive ? "ACTIVATE_CLINIC" : "DEACTIVATE_CLINIC", "Clinic", clinicId);
  revalidateAll();
}

const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(80),
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  clinicId: z.string().trim().min(1, "Select a clinic"),
});

export async function createClinicAdminAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = createAdminSchema.safeParse({
    name: str(formData, "name"),
    email: str(formData, "email"),
    phone: str(formData, "phone") || undefined,
    password: str(formData, "password"),
    clinicId: str(formData, "clinicId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid clinic admin input." };
  }

  const clinic = await db.clinic.findUnique({ where: { id: parsed.data.clinicId } });
  if (!clinic) return { ok: false, error: "Selected clinic does not exist." };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false, error: "An account with this email already exists." };

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "CLINIC_ADMIN",
      clinicId: clinic.id,
      isActive: true,
    },
  });

  await logAudit(actor.id, "CREATE_CLINIC_ADMIN", "User", created.id);
  revalidateAll();
  return { ok: true, message: `Created clinic login ${created.email} for ${clinic.name}.` };
}

const resetPasswordSchema = z.object({
  userId: z.string().trim().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(72),
});

export async function resetUserPasswordAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = resetPasswordSchema.safeParse({
    userId: str(formData, "userId"),
    newPassword: str(formData, "newPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  await logAudit(actor.id, "RESET_PASSWORD", "User", parsed.data.userId);
  revalidateAll();
  return { ok: true, message: "Password updated successfully." };
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");
  const userId = str(formData, "userId");
  const nextActive = str(formData, "nextActive") === "true";
  if (!userId || userId === actor.id) return;

  await db.user.update({
    where: { id: userId },
    data: { isActive: nextActive },
  });

  await logAudit(actor.id, nextActive ? "ENABLE_USER" : "DISABLE_USER", "User", userId);
  revalidateAll();
}

const doctorSchema = z.object({
  name: z.string().trim().min(2, "Doctor name is required").max(100),
  clinicId: z.string().trim().min(1, "Select a clinic"),
  specialtyId: z.string().trim().min(1, "Select a specialty"),
  qualifications: z.string().trim().max(150).optional(),
  bio: z.string().trim().max(500).optional(),
  consultationFee: z.coerce.number().int().min(0).max(100000),
  avgConsultMinutes: z.coerce.number().int().min(5).max(120),
});

export async function createDoctorAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = doctorSchema.safeParse({
    name: str(formData, "name"),
    clinicId: str(formData, "clinicId"),
    specialtyId: str(formData, "specialtyId"),
    qualifications: str(formData, "qualifications") || undefined,
    bio: str(formData, "bio") || undefined,
    consultationFee: str(formData, "consultationFee"),
    avgConsultMinutes: str(formData, "avgConsultMinutes") || "15",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid doctor details." };
  }

  const photo = await readUploadedDoctorPhoto(formData.get("photo"));
  if (!photo.ok) return { ok: false, error: photo.error };

  const daysRaw = formData.getAll("weekdays").map((d) => Number(d)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const weekdays = daysRaw.length > 0 ? daysRaw : [0, 1, 2, 3, 4];
  const startTime = timeRegex.test(str(formData, "startTime")) ? str(formData, "startTime") : "16:00";
  const endTime = timeRegex.test(str(formData, "endTime")) ? str(formData, "endTime") : "20:00";

  const doctor = await db.doctor.create({
    data: {
      name: parsed.data.name,
      clinicId: parsed.data.clinicId,
      specialtyId: parsed.data.specialtyId,
      qualifications: parsed.data.qualifications ?? null,
      bio: parsed.data.bio ?? null,
      photoUrl: photo.dataUrl ?? null,
      consultationFee: parsed.data.consultationFee,
      avgConsultMinutes: parsed.data.avgConsultMinutes,
      isActive: true,
      schedules: {
        create: weekdays.map((weekday) => ({
          weekday,
          startTime,
          endTime,
          slotMinutes: parsed.data.avgConsultMinutes,
        })),
      },
    },
  });

  await logAudit(actor.id, "CREATE_DOCTOR", "Doctor", doctor.id);
  revalidateAll();
  return { ok: true, message: `Added ${doctor.name}.` };
}

export async function updateDoctorAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");
  const doctorId = str(formData, "doctorId");
  if (!doctorId) return { ok: false, error: "Doctor ID is required." };

  const parsed = doctorSchema.safeParse({
    name: str(formData, "name"),
    clinicId: str(formData, "clinicId"),
    specialtyId: str(formData, "specialtyId"),
    qualifications: str(formData, "qualifications") || undefined,
    bio: str(formData, "bio") || undefined,
    consultationFee: str(formData, "consultationFee"),
    avgConsultMinutes: str(formData, "avgConsultMinutes") || "15",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid doctor details." };
  }

  const photo = await readUploadedDoctorPhoto(formData.get("photo"));
  if (!photo.ok) return { ok: false, error: photo.error };

  const removePhoto = str(formData, "removePhoto") === "on";
  const isActive = str(formData, "isActive") !== "false";

  const updated = await db.doctor.update({
    where: { id: doctorId },
    data: {
      name: parsed.data.name,
      clinicId: parsed.data.clinicId,
      specialtyId: parsed.data.specialtyId,
      qualifications: parsed.data.qualifications ?? null,
      bio: parsed.data.bio ?? null,
      consultationFee: parsed.data.consultationFee,
      avgConsultMinutes: parsed.data.avgConsultMinutes,
      isActive,
      ...(photo.dataUrl ? { photoUrl: photo.dataUrl } : removePhoto ? { photoUrl: null } : {}),
    },
  });

  await logAudit(actor.id, photo.dataUrl ? "UPDATE_DOCTOR_PHOTO" : "UPDATE_DOCTOR", "Doctor", updated.id);
  revalidateAll();
  revalidatePath(`/doctors/${doctorId}`);
  return { ok: true, message: `Updated ${updated.name}.` };
}

export async function importDoctorsCsvAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("SUPER_ADMIN");

  let csvText = str(formData, "csvText");
  const file = formData.get("csvFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 1024 * 1024) {
      return { ok: false, error: "CSV file must be smaller than 1 MB." };
    }
    csvText = await file.text();
  }

  if (!csvText.trim()) {
    return { ok: false, error: "Provide a CSV file or paste CSV rows first." };
  }

  const parsed = parseDoctorsCsv(csvText);
  if (parsed.rows.length === 0) {
    return { ok: false, error: parsed.errors[0] ?? "No valid rows found in CSV." };
  }

  const [clinics, specialties] = await Promise.all([
    db.clinic.findMany({ select: { id: true, name: true } }),
    db.specialty.findMany({ select: { id: true, name: true } }),
  ]);

  const clinicByName = new Map(clinics.map((c) => [c.name.toLowerCase(), c.id]));
  const specByName = new Map(specialties.map((s) => [s.name.toLowerCase(), s.id]));

  const rowErrors = [...parsed.errors];
  let createdCount = 0;

  for (const row of parsed.rows) {
    const clinicId = clinicByName.get(row.clinicName.toLowerCase());
    if (!clinicId) {
      rowErrors.push(`Row ${row.line}: clinic "${row.clinicName}" not found.`);
      continue;
    }

    let specialtyId = specByName.get(row.specialty.toLowerCase());
    if (!specialtyId) {
      const createdSpec = await db.specialty.create({ data: { name: row.specialty } });
      specialtyId = createdSpec.id;
      specByName.set(row.specialty.toLowerCase(), specialtyId);
    }

    await db.doctor.create({
      data: {
        name: row.name,
        clinicId,
        specialtyId,
        qualifications: row.qualifications ?? null,
        bio: row.bio ?? null,
        photoUrl: null,
        consultationFee: row.consultationFee,
        avgConsultMinutes: row.avgConsultMinutes,
        isActive: true,
        schedules: {
          create: [0, 1, 2, 3, 4].map((weekday) => ({
            weekday,
            startTime: "16:00",
            endTime: "20:00",
            slotMinutes: row.avgConsultMinutes,
          })),
        },
      },
    });
    createdCount++;
  }

  if (createdCount > 0) {
    await logAudit(actor.id, "CSV_IMPORT_DOCTORS", "Doctor", `${createdCount} imported`);
    revalidateAll();
  }

  if (createdCount === 0) {
    return { ok: false, error: rowErrors.join(" ") };
  }

  const warningSuffix = rowErrors.length > 0 ? ` (${rowErrors.length} skipped: ${rowErrors[0]})` : "";
  return { ok: true, message: `Imported ${createdCount} doctor${createdCount === 1 ? "" : "s"}${warningSuffix}.` };
}

const VALID_INQUIRY_STATUSES = new Set(["NEW", "REVIEWED", "APPROVED", "DISMISSED"]);

export async function updatePartnershipStatusAction(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");
  const inquiryId = str(formData, "inquiryId");
  const status = str(formData, "status");
  if (!inquiryId || !VALID_INQUIRY_STATUSES.has(status)) return;

  await db.clinicInquiry.update({
    where: { id: inquiryId },
    data: { status },
  });

  await logAudit(actor.id, `PARTNERSHIP_${status}`, "ClinicInquiry", inquiryId);
  revalidateAll();
}

export async function approvePartnershipCreateClinicAction(formData: FormData): Promise<void> {
  const actor = await requireRole("SUPER_ADMIN");
  const inquiryId = str(formData, "inquiryId");
  if (!inquiryId) return;

  const inquiry = await db.clinicInquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) return;

  const clinic = await db.clinic.create({
    data: {
      name: inquiry.clinicName,
      address: str(formData, "address") || inquiry.city,
      city: inquiry.city,
      phone: inquiry.phone || null,
      openTime: "09:00",
      closeTime: "21:00",
      isActive: true,
    },
  });

  await db.clinicInquiry.update({
    where: { id: inquiry.id },
    data: { status: "APPROVED" },
  });

  await logAudit(actor.id, "APPROVE_PARTNERSHIP_CLINIC", "Clinic", clinic.id);
  revalidateAll();
}
