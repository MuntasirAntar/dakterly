import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePatient } from "@/lib/auth";
import { BOOKING_MESSAGES, getAvailabilityByDate } from "@/lib/booking";
import { getDoctor } from "@/lib/doctors";
import { formatFee, formatTime } from "@/lib/format";
import { first, type SearchParams } from "@/lib/params";
import { dateChip, formatDate, isValidDateString, nowInClinicTz } from "@/lib/time";
import { bookAppointment } from "@/app/actions/appointments";
import DoctorAvatar from "@/components/DoctorAvatar";
import BackButton from "@/components/BackButton";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Book an appointment | Dakterly" };

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const dateParam = first(raw.date);
  const slotParam = first(raw.slot);
  const errorCode = first(raw.error);

  // Not logged in? Go to login and come straight back here afterwards.
  const query = new URLSearchParams();
  if (dateParam) query.set("date", dateParam);
  if (slotParam) query.set("slot", slotParam);
  const here = `/doctors/${encodeURIComponent(id)}/book${query.toString() ? `?${query}` : ""}`;
  await requirePatient(here);

  const doctor = await getDoctor(id);
  if (!doctor) notFound();

  const now = nowInClinicTz();
  const days = await getAvailabilityByDate(doctor.id, doctor.schedules, now);

  // Which day is selected? The one in the URL if it is a real, bookable day,
  // otherwise the first day with a free slot.
  const requested = dateParam && isValidDateString(dateParam) ? days.find((d) => d.date === dateParam) : undefined;
  const selected = requested && requested.slots.length > 0 ? requested : days.find((d) => d.slots.length > 0);
  const slot = selected && slotParam && selected.slots.includes(slotParam) ? slotParam : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BackButton href={`/doctors/${doctor.id}`} />
      <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">Book an appointment</h1>

      <section className="mt-5 flex flex-wrap items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-nowrap sm:gap-4">
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{doctor.name}</p>
          <p className="text-sm text-gray-600">
            {doctor.specialty.name} · {doctor.clinic.name}, {doctor.clinic.city}
          </p>
        </div>
        <p className="font-semibold text-gray-900 tabular-nums">{formatFee(doctor.consultationFee)}</p>
      </section>

      {errorCode && BOOKING_MESSAGES[errorCode] && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {BOOKING_MESSAGES[errorCode]}
        </p>
      )}

      {!selected ? (
        <p className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          No free slots in the next 14 days. Please check again later.
        </p>
      ) : (
        <>
          <h2 className="mt-8 text-lg font-semibold text-gray-900">1. Choose a day</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-7">
            {days.map((day) => {
              const chip = dateChip(day.date);
              const isSelected = day.date === selected.date;
              const base = "rounded-xl border px-2 py-2.5 text-center text-sm";
              const inner = (
                <>
                  <span className="block text-xs">{chip.weekday}</span>
                  <span className="block text-lg font-bold leading-tight">{chip.day}</span>
                  <span className="block text-xs">{chip.month}</span>
                  <span className="mt-1 block text-[11px]">
                    {day.total === 0 ? "Off" : day.slots.length === 0 ? "Full" : `${day.slots.length} left`}
                  </span>
                </>
              );
              return day.slots.length === 0 ? (
                <div key={day.date} aria-disabled className={`${base} border-gray-100 bg-gray-50 text-gray-400`}>
                  {inner}
                </div>
              ) : (
                <Link
                  key={day.date}
                  href={`/doctors/${doctor.id}/book?date=${day.date}`}
                  aria-current={isSelected ? "date" : undefined}
                  className={`${base} ${
                    isSelected ? "border-teal-700 bg-teal-700 text-white" : "border-gray-300 bg-white text-gray-800 hover:border-teal-600"
                  }`}
                >
                  {inner}
                </Link>
              );
            })}
          </div>

          <h2 className="mt-8 text-lg font-semibold text-gray-900">2. Choose a time on {formatDate(selected.date)}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {selected.slots.map((time) => (
              <Link
                key={time}
                href={`/doctors/${doctor.id}/book?date=${selected.date}&slot=${time}`}
                aria-current={time === slot ? "true" : undefined}
                className={`rounded-lg border px-2 py-2 text-center text-sm font-medium ${
                  time === slot ? "border-teal-700 bg-teal-700 text-white" : "border-gray-300 bg-white text-gray-800 hover:border-teal-600"
                }`}
              >
                {formatTime(time)}
              </Link>
            ))}
          </div>

          {slot && (
            <section className="mt-8 rounded-2xl border-2 border-teal-700 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">3. Confirm</h2>
              <p className="mt-2 text-gray-700">
                {doctor.name} on <strong>{formatDate(selected.date)}</strong> at <strong>{formatTime(slot)}</strong>
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {doctor.clinic.name}, {doctor.clinic.address}. You pay the fee ({formatFee(doctor.consultationFee)}) at the clinic.
              </p>
              <form action={bookAppointment} className="mt-4">
                <input type="hidden" name="doctorId" value={doctor.id} />
                <input type="hidden" name="date" value={selected.date} />
                <input type="hidden" name="slotTime" value={slot} />
                <SubmitButton pendingLabel="Booking..." className="bg-teal-700 hover:bg-teal-800">
                  Confirm booking
                </SubmitButton>
              </form>
            </section>
          )}
        </>
      )}
    </main>
  );
}
