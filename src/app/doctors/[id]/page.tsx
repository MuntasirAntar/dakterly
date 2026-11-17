import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoctor } from "@/lib/doctors";
import { WEEKDAY_LONG, formatFee, formatTime } from "@/lib/format";
import DoctorAvatar from "@/components/DoctorAvatar";
import BackButton from "@/components/BackButton";

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <BackButton href="/doctors" />

      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {/* Header */}
          <section className="flex flex-col items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:gap-5 sm:p-6">
            <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{doctor.name}</h1>
              <p className="mt-1">
                <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
                  {doctor.specialty.name}
                </span>
              </p>
              {doctor.qualifications && <p className="mt-2 text-gray-600">{doctor.qualifications}</p>}
              <p className="mt-2 text-sm text-gray-600">
                <Link href={`/clinics/${doctor.clinic.id}`} className="font-medium hover:text-teal-700">
                  {doctor.clinic.name}
                </Link>{" "}
                · {doctor.clinic.city}
              </p>
            </div>
          </section>

          {/* About */}
          {doctor.bio && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <p className="mt-2 text-gray-700">{doctor.bio}</p>
            </section>
          )}

          {/* Weekly schedule */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">Weekly schedule</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {WEEKDAY_LONG.map((dayName, weekday) => {
                    const rows = doctor.schedules.filter((s) => s.weekday === weekday);
                    return (
                      <tr key={dayName} className="border-t border-gray-100">
                        <th scope="row" className="w-28 py-2.5 pr-3 text-left font-medium text-gray-800 sm:w-32">
                          {dayName}
                        </th>
                        <td className="py-2.5 text-gray-700">
                          {rows.length > 0 ? (
                            rows.map((r) => `${formatTime(r.startTime)} – ${formatTime(r.endTime)}`).join(", ")
                          ) : (
                            <span className="text-gray-400">Not available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">Consultation fee</p>
            <p className="text-2xl font-bold text-gray-900">{formatFee(doctor.consultationFee)}</p>
            <p className="mt-2 text-sm text-gray-600">About {doctor.avgConsultMinutes} minutes per patient</p>
            <Link
              href={`/doctors/${doctor.id}/book`}
              className="mt-4 block w-full rounded-lg bg-teal-700 py-2.5 text-center font-medium text-white hover:bg-teal-800"
            >
              Book appointment
            </Link>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
            <h2 className="text-lg font-semibold text-gray-900">Clinic</h2>
            <p className="mt-2 font-medium">{doctor.clinic.name}</p>
            <p>
              {doctor.clinic.address}, {doctor.clinic.city}
            </p>
            {doctor.clinic.phone && <p className="mt-1">Phone: {doctor.clinic.phone}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
