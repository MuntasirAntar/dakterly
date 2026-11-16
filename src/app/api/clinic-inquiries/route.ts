import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPartnershipNotificationEmail } from "@/lib/email";

const inquirySchema = z.object({
  clinicName: z.string().trim().min(2, "Enter your clinic name").max(120),
  contactName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a phone number").max(30),
  city: z.string().trim().min(2, "Enter your city").max(60),
  doctorCount: z.string().trim().max(20).optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const referenceId = `DK-CL-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const created = await db.clinicInquiry.create({
      data: {
        referenceId,
        clinicName: parsed.data.clinicName,
        contactName: parsed.data.contactName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        city: parsed.data.city,
        doctorCount: parsed.data.doctorCount || null,
        message: parsed.data.message || null,
        status: "NEW",
        emailSent: false,
      },
    });

    const createdAtIso =
      created.createdAt instanceof Date ? created.createdAt.toISOString() : new Date().toISOString();

    const emailResult = await sendPartnershipNotificationEmail({
      referenceId,
      clinicName: parsed.data.clinicName,
      contactName: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      city: parsed.data.city,
      doctorCount: parsed.data.doctorCount || null,
      message: parsed.data.message || null,
      createdAt: createdAtIso,
    });

    if (emailResult.sent) {
      await db.clinicInquiry.update({
        where: { id: created.id },
        data: { emailSent: true },
      });
    }

    await db.auditLog.create({
      data: {
        action: "CLINIC_PARTNERSHIP_REQUEST",
        entity: "ClinicInquiry",
        entityId: created.id,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        referenceId,
        createdAt: createdAtIso,
        emailSent: emailResult.sent,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[Dakterly] Clinic inquiry submission error:", err);
    return NextResponse.json({ error: "Could not submit your inquiry. Please try again." }, { status: 400 });
  }
}
