import Link from "next/link";
import { formatTime } from "@/lib/format";
import { actionsFor, summarizeDay, type Status } from "@/lib/queue";
import RowActions from "@/components/RowActions";
import StatusBadge from "@/components/StatusBadge";

type Row = {
  id: string;
  slotLockId: string;
  doctorId: string;
  clinicId: string;
  date: string;
  slotTime: string;
  tokenNumber: number;
  status: string;
  patient: { name: string; phone: string | null };
};

type Props = { doctor: { id: string; name: string; specialty: string }; rows: Row[] };

export default function DoctorDayCard({ doctor, rows }: Props) {
  const totals = summarizeDay(rows.map((r) => r.status as Status));
  const inProgress = rows.find((r) => r.status === "IN_PROGRESS");

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm" aria-label={`${doctor.name} today`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{doctor.name}</h2>
          <p className="text-sm text-gray-600">{doctor.specialty}</p>
        </div>
        <Link
          href={`/admin/doctors/${doctor.id}/today`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
        >
          Print today&apos;s list
        </Link>
      </header>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700">
        <div>Expected today: <strong>{totals.expected}</strong></div>
        <div>Waiting: <strong>{totals.waiting}</strong></div>
        <div>Done: <strong>{totals.completed}</strong></div>
        <div>No-show: <strong>{totals.noShow}</strong></div>
        <div>Now serving: <strong>{inProgress ? `#${inProgress.tokenNumber}` : "none"}</strong></div>
      </dl>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-gray-600">No appointments booked for today.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid="queue-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 font-bold text-teal-800">
                  #{row.tokenNumber}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{row.patient.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(row.slotTime)}
                    {row.patient.phone ? ` · ${row.patient.phone}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={row.status} />
                <RowActions
                  appointmentId={row.id}
                  slotLockId={row.slotLockId}
                  doctorId={row.doctorId}
                  clinicId={row.clinicId}
                  date={row.date}
                  currentStatus={row.status as Status}
                  actions={actionsFor(row.status as Status)}
                  startBlocked={Boolean(inProgress) && row.status === "CHECKED_IN"}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
