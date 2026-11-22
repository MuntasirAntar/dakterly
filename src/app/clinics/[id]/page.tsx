import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClinic, searchDoctors } from "@/lib/doctors";
import DoctorCard from "@/components/DoctorCard";
import BackButton from "@/components/BackButton";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const clinics = await db.clinic.findMany({
      where: { isActive: true },
      select: { id: true },
      take: 50,
    });
    return clinics.map((c) => ({ id: c.id }));
  } catch {
    return [];
  }
}

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinic = await getClinic(id);
  if (!clinic) notFound();

  const doctors = await searchDoctors({ clinicId: clinic.id });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <BackButton href="/doctors" />

      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
        <p className="mt-1 text-gray-600">
          {clinic.address}, {clinic.city}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Open {clinic.openTime} to {clinic.closeTime}
          {clinic.phone ? ` · ${clinic.phone}` : ""}
        </p>
      </section>

      <h2 className="mt-8 text-xl font-semibold text-gray-900">
        Doctors at this clinic ({doctors.length})
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </main>
  );
}
