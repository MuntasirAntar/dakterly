import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const inquirySchema = z.object({
  clinicName: z.string().trim().min(2, "Enter your clinic name").max(120),
  contactName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a phone number").max(30),
  city: z.string().trim().min(2, "Enter your city").max(60),
  doctorCount: z.string().trim().max(20).optional(),
  message: z.string().trim().max(1000).optional(),
});

type StoredInquiry = z.infer<typeof inquirySchema> & {
  referenceId: string;
  createdAt: string;
};

const globalStore = globalThis as unknown as { clinicInquiries?: StoredInquiry[] };
if (!globalStore.clinicInquiries) {
  globalStore.clinicInquiries = [];
}

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
    const record: StoredInquiry = {
      ...parsed.data,
      referenceId,
      createdAt: new Date().toISOString(),
    };
    globalStore.clinicInquiries?.push(record);

    return NextResponse.json({ ok: true, referenceId, createdAt: record.createdAt }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
