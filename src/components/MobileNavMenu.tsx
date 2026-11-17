"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";

type Props = {
  user: {
    name: string;
    role: string;
  } | null;
  dashboardHref: string | null;
  logoutAction: () => Promise<void>;
};

export default function MobileNavMenu({ user, dashboardHref, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isManageDoctorsView =
    pathname.startsWith("/admin") && searchParams.get("view") === "manage-doctors";
  const isFindDoctors = pathname === "/doctors" || pathname.startsWith("/doctors/");
  const isForClinics = pathname === "/join-clinic" || pathname.startsWith("/join-clinic/");
  const isAppointments = pathname === "/appointments" || pathname.startsWith("/appointments/");
  const isDashboard =
    dashboardHref !== null &&
    (user?.role === "CLINIC_ADMIN"
      ? pathname.startsWith("/admin") && !isManageDoctorsView
      : pathname.startsWith(dashboardHref));
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  function drawerItemClass(active: boolean) {
    return active
      ? "rounded-lg border-l-4 border-teal-700 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-900"
      : "rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800";
  }

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2">
        {!user ? (
          <Link
            href="/login"
            aria-current={isLogin ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              isLogin
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-teal-200 bg-teal-50/70 text-teal-800"
            }`}
          >
            Log in
          </Link>
        ) : (
          <Link
            href={user.role === "PATIENT" ? "/appointments" : (dashboardHref ?? "/")}
            aria-current={(user.role === "PATIENT" ? isAppointments : isDashboard) ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
              (user.role === "PATIENT" ? isAppointments : isDashboard)
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-teal-200 bg-teal-50/70 text-teal-800"
            }`}
          >
            {user.role === "PATIENT" ? "My visits" : "Dashboard"}
          </Link>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-teal-500 hover:text-teal-800"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-slate-200 bg-white px-4 py-4 shadow-lg">
          <div className="flex flex-col space-y-2">
            <Link
              href="/doctors"
              onClick={() => setOpen(false)}
              aria-current={isFindDoctors ? "page" : undefined}
              className={drawerItemClass(isFindDoctors)}
            >
              Find doctors
            </Link>
            <Link
              href="/join-clinic"
              onClick={() => setOpen(false)}
              aria-current={isForClinics ? "page" : undefined}
              className={drawerItemClass(isForClinics)}
            >
              For clinics
            </Link>

            {user ? (
              <>
                <Link
                  href={user.role === "PATIENT" ? "/appointments" : (dashboardHref ?? "/")}
                  onClick={() => setOpen(false)}
                  aria-current={(user.role === "PATIENT" ? isAppointments : isDashboard) ? "page" : undefined}
                  className={drawerItemClass(user.role === "PATIENT" ? isAppointments : isDashboard)}
                >
                  {user.role === "PATIENT" ? "My appointments" : "Dashboard"}
                </Link>
                {user.role === "CLINIC_ADMIN" && (
                  <Link
                    href="/admin?view=manage-doctors"
                    onClick={() => setOpen(false)}
                    aria-current={isManageDoctorsView ? "page" : undefined}
                    className={drawerItemClass(isManageDoctorsView)}
                  >
                    Manage Doctors
                  </Link>
                )}
                <div className="border-t border-slate-100 pt-2">
                  <p className="px-3 pb-2 text-xs text-slate-500">Signed in as {user.name}</p>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-sm font-semibold text-rose-700"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  aria-current={isLogin ? "page" : undefined}
                  className={`inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                    isLogin
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-teal-200 bg-teal-50 text-teal-800"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  aria-current={isRegister ? "page" : undefined}
                  className={`inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold text-white ${
                    isRegister ? "bg-emerald-600" : "bg-teal-700"
                  }`}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
