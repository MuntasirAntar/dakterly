import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_MESSAGES, cancelBooking } from "@/lib/booking";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Please log in to cancel an appointment." },
      { status: 401, headers: NO_STORE },
    );
  }

  if (user.role !== "PATIENT") {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "Only patients can cancel their appointments." },
      { status: 403, headers: NO_STORE },
    );
  }

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: BOOKING_MESSAGES.not_found },
      { status: 400, headers: NO_STORE },
    );
  }

  const result = await cancelBooking({ patientId: user.id, appointmentId: id });

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  revalidatePath("/admin");

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        message: BOOKING_MESSAGES[result.error] ?? "Could not cancel this appointment.",
      },
      { status: result.error === "not_found" ? 404 : 409, headers: NO_STORE },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
