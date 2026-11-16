import Link from "next/link";
import { formatTime } from "@/lib/format";
import { formatDate } from "@/lib/time";
import StatusBadge from "@/components/StatusBadge";

type AppointmentItem = {
  id: string;
  date: string;
  slotTime: string;
  status: string;
  tokenNumber: number;
  doctor: {
    name: string;
    specialty: { name: string };
    clinic: { name: string };
  };
};

export default function AppointmentCard({ appointment }: { appointment: AppointmentItem }) {
  const { doctor } = appointment;

  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-700 text-white sm:h-16 sm:w-16">
          <span className="text-[10px] uppercase tracking-wide text-teal-100">Token</span>
          <span className="text-xl font-bold leading-none sm:text-2xl">{appointment.tokenNumber}</span>
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
      </div>
      <div className="self-start sm:self-center">
        <StatusBadge status={appointment.status} />
      </div>
    </Link>
  );
}
