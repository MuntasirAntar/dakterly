import { cache } from "react";
import { redirect } from "next/navigation";
import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/firebase";
import { readSessionPayload, type SessionRole } from "@/lib/session";

export type Role = SessionRole;

export function homePathFor(role: Role) {
  if (role === "SUPER_ADMIN") return "/superadmin";
  if (role === "CLINIC_ADMIN") return "/admin";
  return "/";
}

export const getCurrentUser = cache(async () => {
  const session = await readSessionPayload();
  if (!session) return null;

  const isBootstrap = session.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
  const role: Role = isBootstrap ? "SUPER_ADMIN" : session.role ?? "PATIENT";

  return {
    id: session.userId,
    name: session.name ?? session.email ?? "User",
    email: session.email ?? "",
    role,
    clinicId: session.clinicId ?? null,
    isActive: true,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}

export async function requirePatient(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (user.role !== "PATIENT") redirect(homePathFor(user.role));
  return user;
}
