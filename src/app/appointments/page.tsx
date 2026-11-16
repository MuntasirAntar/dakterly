import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getMyAppointments, isUpcoming } from "@/lib/booking";
import { first, type SearchParams } from "@/lib/params";
import { nowInClinicTz } from "@/lib/time";
import AppointmentCard from "@/components/AppointmentCard";

export const metadata: Metadata = { title: "My appointments | Dakterly" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("PATIENT");
  const tab = first((await searchParams).tab) === "past" ? "past" : "upcoming";

  const all = await getMyAppointments(user.id);
  const today = nowInClinicTz().date;

  const upcoming = all.filter((a) => isUpcoming(a.status, a.date, today)); // already soonest first
  const past = all.filter((a) => !isUpcoming(a.status, a.date, today)).reverse(); // most recent first
  const shown = tab === "past" ? past : upcoming;

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${active ? "bg-teal-700 text-white" : "bg-white text-gray-700 border border-gray-300 hover:border-teal-600"}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">My appointments</h1>

      <div className="mt-5 flex gap-2">
        <Link href="/appointments" className={tabClass(tab === "upcoming")}>
          Upcoming ({upcoming.length})
        </Link>
        <Link href="/appointments?tab=past" className={tabClass(tab === "past")}>
          Past ({past.length})
        </Link>
      </div>

      {shown.length > 0 ? (
        <div className="mt-5 space-y-3">
          {shown.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900">{tab === "past" ? "No past appointments yet" : "No upcoming appointments"}</p>
          <p className="mt-1 text-sm text-gray-600">Find a doctor and book a time that suits you.</p>
          <Link href="/doctors" className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
            Find a doctor
          </Link>
        </div>
      )}
    </main>
  );
}
