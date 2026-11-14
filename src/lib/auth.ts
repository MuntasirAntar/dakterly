import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";

// Where each kind of user lands after logging in.
export function homePathFor(role: Role) {
  if (role === "SUPER_ADMIN") return "/superadmin";
  if (role === "CLINIC_ADMIN") return "/admin";
  return "/";
}

// Who is logged in? Loads the user fresh from the database on every request,
// so a suspended or changed account takes effect immediately.
export const getCurrentUser = cache(async () => {
  const userId = await readSession();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, clinicId: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
});

// Use at the top of any page that needs a logged-in user.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Use at the top of any page that only certain roles may see.
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}
