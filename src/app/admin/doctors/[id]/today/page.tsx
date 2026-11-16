import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatTime } from "@/lib/format";
import { getDoctorDayList } from "@/lib/queue-data";
import { summarizeDay, type Status } from "@/lib/queue";
import { CLINIC_TZ, currentTime, formatDate, nowInClinicTz } from "@/lib/time";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function TodayListPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CLINIC_ADMIN");
  if (!user.clinicId) notFound();
  const { id } = await params;

  const today = nowInClinicTz().date;
  // The doctor must belong to THIS user's clinic, otherwise: not found.
  const data = await getDoctorDayList(user.clinicId, id, today);
  if (!data) notFound();

  const { doctor, appointments } = data;
  const totals = summarizeDay(appointments.map((a) => a.status as Status));
  const rows = appointments.filter((a) => a.status !== "CANCELLED");
  const printedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(currentTime());

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin" className="text-sm text-teal-700 hover:underline">&larr; Back to dashboard</Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-gray-300 pb-4">
          <p className="text-sm text-gray-600">{doctor.clinic.name}</p>
          <h1 className="text-2xl font-bold text-gray-900">{doctor.name}</h1>
          <p className="text-sm text-gray-700">
            {doctor.specialty.name} · {formatDate(today)}
          </p>
          <p className="mt-3 text-lg">
            Patients expected today: <strong data-testid="expected">{totals.expected}</strong>
            {totals.cancelled > 0 && <span className="text-sm text-gray-600"> ({totals.cancelled} cancelled, not listed)</span>}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="py-8 text-gray-600">No appointments for today.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-gray-400 text-xs uppercase tracking-wide text-gray-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Time</th>
                <th className="py-2 pr-2">Patient</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 text-center">Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-200 print:break-inside-avoid" data-testid="print-row">
                  <td className="py-2.5 pr-2 font-bold">{row.tokenNumber}</td>
                  <td className="py-2.5 pr-2 whitespace-nowrap">{formatTime(row.slotTime)}</td>
                  <td className="py-2.5 pr-2 font-medium">{row.patient.name}</td>
                  <td className="py-2.5 pr-2 whitespace-nowrap">{row.patient.phone ?? "-"}</td>
                  <td className="py-2.5 pr-2">{statusText(row.status)}</td>
                  <td className="py-2.5 text-center">
                    <span className="inline-block h-5 w-5 border-2 border-gray-500 align-middle" aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className="mt-6 border-t border-gray-300 pt-3 text-xs text-gray-600">
          Printed at {printedAt}. Status shows the moment of printing. Confidential patient information:
          keep this paper safe and shred it after the clinic day.
        </footer>
      </article>
    </main>
  );
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    BOOKED: "Booked", CHECKED_IN: "Arrived", IN_PROGRESS: "With doctor", COMPLETED: "Seen", NO_SHOW: "No-show",
  };
  return labels[status] ?? status;
}
