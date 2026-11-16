import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUploadedDoctorPhoto } from "@/lib/photo-upload";

const timeRegex = /^\d{2}:\d{2}$/;

const doctorSchema = z.object({
  name: z.string().trim().min(2, "Doctor name must be at least 2 characters").max(100),
  clinicId: z.string().trim().min(1, "Select a clinic"),
  specialtyId: z.string().trim().min(1, "Select a specialty"),
  qualifications: z.string().trim().max(150).optional(),
  bio: z.string().trim().max(500).optional(),
  consultationFee: z.coerce.number().int().min(0, "Consultation fee must be 0 or more").max(100000),
  avgConsultMinutes: z.coerce.number().int().min(5, "Minutes per patient must be at least 5").max(120),
});

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function isSafeImageUrl(url: string) {
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("data:image/");
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (actor.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admins can add doctors or upload photos." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read form upload. Ensure image is smaller than 5 MB." }, { status: 400 });
  }

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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid doctor details." }, { status: 400 });
  }

  const photo = await readUploadedDoctorPhoto(formData.get("photo"));
  if (!photo.ok) {
    return NextResponse.json({ error: photo.error }, { status: 400 });
  }

  const pastedPhotoUrl = str(formData, "photoUrl");
  if (!photo.dataUrl && pastedPhotoUrl && !isSafeImageUrl(pastedPhotoUrl)) {
    return NextResponse.json({ error: "Photo URL must start with http:// or https://." }, { status: 400 });
  }

  const daysRaw = formData
    .getAll("weekdays")
    .map((d) => Number(d))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
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
      photoUrl: photo.dataUrl ?? (pastedPhotoUrl || null),
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

  await db.auditLog.create({
    data: {
      userId: actor.id,
      action: photo.dataUrl || pastedPhotoUrl ? "CREATE_DOCTOR_WITH_PHOTO" : "CREATE_DOCTOR",
      entity: "Doctor",
      entityId: doctor.id,
    },
  });

  revalidatePath("/superadmin");
  revalidatePath("/");
  revalidatePath("/doctors");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true, message: `Added ${doctor.name}.`, doctorId: doctor.id });
}
