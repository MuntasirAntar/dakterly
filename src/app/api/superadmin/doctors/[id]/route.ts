import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUploadedDoctorPhoto } from "@/lib/photo-upload";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (actor.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admins can update doctor info or photos." }, { status: 403 });
  }

  const { id: doctorId } = await params;
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor ID is required." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read upload. Ensure image is smaller than 5 MB." }, { status: 400 });
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

  const removePhoto = str(formData, "removePhoto") === "on";
  const isActive = str(formData, "isActive") !== "false";

  const photoUpdate = photo.dataUrl
    ? { photoUrl: photo.dataUrl }
    : removePhoto
      ? { photoUrl: null }
      : pastedPhotoUrl
        ? { photoUrl: pastedPhotoUrl }
        : {};

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
      ...photoUpdate,
    },
  });

  await db.auditLog.create({
    data: {
      userId: actor.id,
      action: photo.dataUrl || pastedPhotoUrl ? "UPDATE_DOCTOR_PHOTO" : "UPDATE_DOCTOR",
      entity: "Doctor",
      entityId: updated.id,
    },
  });

  revalidatePath("/superadmin");
  revalidatePath("/");
  revalidatePath("/doctors");
  revalidatePath(`/doctors/${doctorId}`);
  revalidatePath("/admin");

  return NextResponse.json({ ok: true, message: `Updated ${updated.name}.`, doctorId: updated.id });
}
