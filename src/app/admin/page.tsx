import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const user = await requireRole("CLINIC_ADMIN");

  // Only THIS user's clinic is loaded: the clinicId comes from the logged-in account.
  const clinic = user.clinicId
    ? await db.clinic.findUnique({ where: { id: user.clinicId } })
    : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-teal-700">Clinic dashboard</h1>
      <p className="mt-2 text-gray-600">
        {clinic ? `Clinic: ${clinic.name} (${clinic.city})` : "No clinic is linked to this account."}
      </p>
      <p className="mt-1 text-sm text-gray-500">Today&apos;s queue controls will appear here.</p>
    </main>
  );
}
