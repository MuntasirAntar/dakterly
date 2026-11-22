import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { BOOKING_MESSAGES, getMyAppointment } from "@/lib/booking";
import { formatFee, formatTime } from "@/lib/format";
import { first, type SearchParams } from "@/lib/params";
import { CANCEL_CUTOFF_MINUTES, canCancel } from "@/lib/slots";
import { getQueueSnapshot } from "@/lib/queue-data";
import { formatDate, nowInClinicTz } from "@/lib/time";
import StatusBadge from "@/components/StatusBadge";
import QueueTracker from "@/components/QueueTracker";
import BackButton from "@/components/BackButton";
import CancelAppointmentButton from "@/components/CancelAppointmentButton";

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("PATIENT");
  const { id } = await params;
  const raw = await searchParams;

  // Looked up by id AND patient, so other people's appointments are "not found".
  const appointment = await getMyAppointment(user.id, id);
  if (!appointment) notFound();

  const { doctor } = appointment;
  const cancellable = appointment.status === "BOOKED" && canCancel(appointment.date, appointment.slotTime, nowInClinicTz());
  const errorCode = first(raw.error);
  const snapshot = await getQueueSnapshot(user.id, id);
  const isLive = ["BOOKED", "CHECKED_IN", "IN_PROGRESS"].includes(appointment.status);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <BackButton href="/appointments" />

      {first(raw.booked) && (
        <p role="status" className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-900">
          Your appointment is booked. Please arrive about 15 minutes early and show your token number.
        </p>
      )}
      {first(raw.cancelled) && (
        <p role="status" className="mt-4 rounded-lg bg-gray-100 p-3 text-sm font-medium text-gray-800">
          Your appointment has been cancelled.
        </p>
      )}
      {errorCode && BOOKING_MESSAGES[errorCode] && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {BOOKING_MESSAGES[errorCode]}
        </p>
      )}

      <article className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={`flex items-center justify-between px-6 py-5 text-white ${isLive ? "bg-teal-700" : "bg-gray-500"}`}>
          <div>
            <p className={`text-sm ${isLive ? "text-teal-100" : "text-gray-200"}`}>Your token number</p>
            <p className="text-5xl font-bold leading-tight" aria-label={`Token number ${appointment.tokenNumber}`}>
              #{appointment.tokenNumber}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Date</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{formatDate(appointment.date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Time</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{formatTime(appointment.slotTime)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Doctor</dt>
            <dd className="mt-0.5 text-gray-900">
              <Link href={`/doctors/${doctor.id}`} className="font-semibold hover:text-teal-700">
                {doctor.name}
              </Link>
              <span className="block text-sm text-gray-600">{doctor.specialty.name}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Clinic</dt>
            <dd className="mt-0.5 text-gray-900">
              <span className="font-semibold">{doctor.clinic.name}</span>
              <span className="block text-sm text-gray-600">
                {doctor.clinic.address}, {doctor.clinic.city}
              </span>
              {doctor.clinic.phone && <span className="block text-sm text-gray-600">{doctor.clinic.phone}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Fee (pay at the clinic)</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{formatFee(doctor.consultationFee)}</dd>
          </div>
        </dl>

        {snapshot?.phase === "later" && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="text-sm text-gray-600">Your place in the queue will show here on the day of your visit.</p>
          </div>
        )}
        {snapshot && <QueueTracker initial={snapshot} />}
      </article>

      {appointment.status === "BOOKED" && (
        <section className="mt-5">
          {cancellable ? (
            <CancelAppointmentButton appointmentId={appointment.id} />
          ) : (
            <p className="text-sm text-gray-600">
              Online cancelling closes {CANCEL_CUTOFF_MINUTES / 60} hours before the appointment. Please call the clinic if you cannot come.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
