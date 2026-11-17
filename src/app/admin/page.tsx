import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { first, type SearchParams } from "@/lib/params";
import { getClinicDay } from "@/lib/queue-data";
import { summarizeDay, type Status } from "@/lib/queue";
import { formatDate, nowInClinicTz, weekdayOf } from "@/lib/time";
import AutoRefresh from "@/components/AutoRefresh";
import ClinicDoctorRemovalPanel from "@/components/ClinicDoctorRemovalPanel";
import DoctorDayCard from "@/components/DoctorDayCard";

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("CLINIC_ADMIN");
  const raw = await searchParams;
  const isManageDoctors = first(raw.view) === "manage-doctors";

  // Only THIS user's clinic is loaded: the clinicId comes from the logged-in account.
  const clinic = user.clinicId ? await db.clinic.findUnique({ where: { id: user.clinicId } }) : null;
  if (!user.clinicId || !clinic) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-teal-700">Clinic dashboard</h1>
        <p className="mt-2 text-gray-600">No clinic is linked to this account. Please contact the site administrator.</p>
      </main>
    );
  }
  if (!clinic.isActive) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold text-teal-700">{clinic.name}</h1>
        <p className="mt-2 text-amber-800">This clinic is currently deactivated. Please contact the site administrator.</p>
      </main>
    );
  }

  const today = nowInClinicTz().date;

  if (isManageDoctors) {
    const [allClinicDoctors, removalRequests] = await Promise.all([
      db.doctor.findMany({
        where: { clinicId: clinic.id, isActive: true },
        orderBy: { name: "asc" },
        include: { specialty: { select: { name: true } } },
      }),
      db.doctorRemovalRequest.findMany({
        where: { clinicId: clinic.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    const serializedDoctors = allClinicDoctors.map((d) => ({
      id: d.id,
      name: d.name,
      qualifications: d.qualifications,
      photoUrl: d.photoUrl ?? null,
      specialtyName: d.specialty.name,
    }));

    const serializedRequests = removalRequests.map((r) => ({
      id: r.id,
      doctorId: r.doctorId,
      doctorName: r.doctorName,
      specialty: r.specialty,
      reason: r.reason ?? null,
      status: r.status,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AutoRefresh seconds={15} />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-teal-700 sm:text-3xl">{clinic.name}</h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Manage doctors assigned to your clinic and send removal requests to the Super Admin.
          </p>
        </div>
        <ClinicDoctorRemovalPanel doctors={serializedDoctors} requests={serializedRequests} />
      </main>
    );
  }

  const doctors = await getClinicDay(clinic.id, today, weekdayOf(today));
  const totals = summarizeDay(doctors.flatMap((d) => d.appointments.map((a) => a.status as Status)));

  const tiles = [
    { label: "Expected today", value: totals.expected },
    { label: "Not arrived", value: totals.notArrived },
    { label: "Waiting", value: totals.waiting },
    { label: "With doctor", value: totals.withDoctor },
    { label: "Completed", value: totals.completed },
    { label: "No-show", value: totals.noShow },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <AutoRefresh seconds={15} />
      <h1 className="text-2xl font-bold text-teal-700 sm:text-3xl">{clinic.name}</h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        Today: {formatDate(today)}. This page updates by itself every 15 seconds.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <dt className="text-xs uppercase tracking-wide text-gray-500">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 space-y-5">
        {doctors.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-gray-600 shadow-sm">No doctors are working at this clinic today.</p>
        ) : (
          doctors.map((doctor) => <DoctorDayCard key={doctor.id} doctor={doctor} rows={doctor.appointments} />)
        )}
      </div>
    </main>
  );
}
