import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQueueSnapshot } from "@/lib/queue-data";

const NO_STORE = { "Cache-Control": "no-store" };

// The patient's ticket page asks this every few seconds.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PATIENT") {
    return NextResponse.json({ error: "Please log in." }, { status: 401, headers: NO_STORE });
  }

  const { id } = await params;
  const snapshot = await getQueueSnapshot(user.id, id);
  if (!snapshot) return NextResponse.json({ error: "Not found." }, { status: 404, headers: NO_STORE });

  return NextResponse.json(snapshot, { headers: NO_STORE });
}
