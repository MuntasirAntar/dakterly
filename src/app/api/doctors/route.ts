import { NextRequest, NextResponse } from "next/server";
import { doctorFilterSchema, getFilterOptions, searchDoctors } from "@/lib/doctors";

// GET /api/doctors?q=derm&city=Dhaka&specialty=Dermatologist&clinicId=...&all=1
// Public information only: no emails, no patient data.
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const includeAll = params.all === "1";
  const parsed = doctorFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [doctors, options] = await Promise.all([
    searchDoctors(parsed.data, includeAll ? 200 : 30),
    includeAll ? getFilterOptions() : Promise.resolve(null),
  ]);

  const body = options
    ? {
        count: doctors.length,
        doctors,
        specialties: options.specialties,
        cities: options.cities,
      }
    : {
        count: doctors.length,
        doctors,
      };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
