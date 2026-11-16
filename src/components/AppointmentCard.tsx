import Link from "next/link";
import { formatTime } from "@/lib/format";
import { formatDate } from "@/lib/time";
import type { getMyAppointments } from "@/lib/booking";
import StatusBadge from "@/components/StatusBadge";

type AppointmentItem = Awaited<ReturnType<typeof getMyAppointments>>[number];

export default function AppointmentCard({ appointment }: { appointment: AppointmentItem }) {
  const { doctor } = appointment;

  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-700 text-white">
        <span className="text-[10px] uppercase tracking-wide text-teal-100">Token</span>
        <span className="text-2xl font-bold leading-none">{appointment.tokenNumber}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{doctor.name}</p>
        <p className="truncate text-sm text-gray-600">
          {doctor.specialty.name} · {doctor.clinic.name}
        </p>
        <p className="mt-1 text-sm font-medium text-gray-800">
          {formatDate(appointment.date)} at {formatTime(appointment.slotTime)}
        </p>
      </div>
      <StatusBadge status={appointment.status} />
    </Link>
  );
}
