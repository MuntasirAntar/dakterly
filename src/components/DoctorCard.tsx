import Link from "next/link";
import { formatFee, initials, summarizeSchedule } from "@/lib/format";
import type { searchDoctors } from "@/lib/doctors";

// The card's data type comes straight from the search query, so they never disagree.
type DoctorItem = Awaited<ReturnType<typeof searchDoctors>>[number];

export default function DoctorCard({ doctor }: { doctor: DoctorItem }) {
  const schedule = summarizeSchedule(doctor.schedules);

  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-800"
        >
          {initials(doctor.name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-gray-900">
            <Link href={`/doctors/${doctor.id}`} className="hover:text-teal-700">
              {doctor.name}
            </Link>
          </h3>
          <p className="mt-0.5">
            <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
              {doctor.specialty.name}
            </span>
          </p>
          {doctor.qualifications && <p className="mt-1 text-sm text-gray-500">{doctor.qualifications}</p>}
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-gray-600">
        <p>
          <Link href={`/clinics/${doctor.clinic.id}`} className="font-medium hover:text-teal-700">
            {doctor.clinic.name}
          </Link>{" "}
          · {doctor.clinic.city}
        </p>
        {schedule.slice(0, 2).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <p className="text-xs text-gray-500">Consultation fee</p>
          <p className="font-semibold text-gray-900">{formatFee(doctor.consultationFee)}</p>
        </div>
        <Link
          href={`/doctors/${doctor.id}`}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
