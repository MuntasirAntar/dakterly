import { requireRole } from "@/lib/auth";

export default async function AppointmentsPage() {
  const user = await requireRole("PATIENT");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-teal-700">My appointments</h1>
      <p className="mt-2 text-gray-600">Hello {user.name}. Your bookings and live queue will appear here.</p>
    </main>
  );
}
