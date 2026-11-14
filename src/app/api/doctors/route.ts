import { NextRequest, NextResponse } from "next/server";
import { doctorFilterSchema, searchDoctors } from "@/lib/doctors";

// GET /api/doctors?q=derm&city=Dhaka&specialty=Dermatologist&clinicId=...
// Public information only: no emails, no patient data.
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = doctorFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const doctors = await searchDoctors(parsed.data);
  return NextResponse.json({ count: doctors.length, doctors });
}
