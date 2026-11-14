import { requireRole } from "@/lib/auth";

export default async function SuperAdminPage() {
  const user = await requireRole("SUPER_ADMIN");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-teal-700">Super admin</h1>
      <p className="mt-2 text-gray-600">Welcome, {user.name}. Clinic and account management will appear here.</p>
    </main>
  );
}
