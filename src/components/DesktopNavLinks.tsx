"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  user: {
    name: string;
    role: string;
  } | null;
  dashboardHref: string | null;
};

export default function DesktopNavLinks({ user, dashboardHref }: Props) {
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

  function linkClass(active: boolean) {
    return active
      ? "relative inline-flex items-center rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 ring-1 ring-teal-600/25 whitespace-nowrap shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 after:absolute after:bottom-0 after:left-2.5 after:right-2.5 after:h-0.5 after:rounded-full after:bg-teal-700"
      : "relative inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 whitespace-nowrap shrink-0 transition-all duration-200 hover:bg-teal-50/70 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600";
  }

  return (
    <>
      <Link
        href="/doctors"
        prefetch={true}
        aria-current={isFindDoctors ? "page" : undefined}
        className={linkClass(isFindDoctors)}
      >
        Find doctors
      </Link>
      <Link
        href="/join-clinic"
        prefetch={true}
        aria-current={isForClinics ? "page" : undefined}
        className={linkClass(isForClinics)}
      >
        For clinics
      </Link>

      {user ? (
        <>
          {user.role === "PATIENT" ? (
            <Link
              href="/appointments"
              aria-current={isAppointments ? "page" : undefined}
              className={linkClass(isAppointments)}
            >
              My appointments
            </Link>
          ) : (
            <>
              <Link
                href={dashboardHref ?? "/"}
                aria-current={isDashboard ? "page" : undefined}
                className={linkClass(isDashboard)}
              >
                Dashboard
              </Link>
              {user.role === "CLINIC_ADMIN" && (
                <Link
                  href="/admin?view=manage-doctors"
                  aria-current={isManageDoctorsView ? "page" : undefined}
                  className={linkClass(isManageDoctorsView)}
                >
                  Manage Doctors
                </Link>
              )}
            </>
          )}
          <span className="hidden text-sm text-slate-500 whitespace-nowrap lg:inline">{user.name}</span>
        </>
      ) : (
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/login"
            aria-current={isLogin ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              isLogin
                ? "border-teal-700 bg-teal-100 font-semibold text-teal-900 shadow-xs"
                : "border-teal-200 bg-teal-50/50 text-teal-800 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/register"
            aria-current={isRegister ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-teal-700/20 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
              isRegister ? "bg-emerald-600 ring-2 ring-teal-700 ring-offset-1" : "bg-teal-700 hover:bg-emerald-600"
            }`}
          >
            Sign up
          </Link>
        </div>
      )}
    </>
  );
}
