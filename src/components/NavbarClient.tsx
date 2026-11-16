"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/components/FirebaseProvider";
import MobileNavMenu from "@/components/MobileNavMenu";

function dashboardPath(role: string) {
  if (role === "SUPER_ADMIN") return "/superadmin";
  if (role === "CLINIC_ADMIN") return "/admin";
  return "/";
}

export default function NavbarClient({ demoNow }: { demoNow: string | null }) {
  const router = useRouter();
  const { ready, profile, signOutUser } = useFirebase();
  const activeUser = ready && profile && profile.isActive ? profile : null;

  const navLinkClass =
    "relative py-1.5 text-sm font-medium text-slate-600 whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-teal-600 after:transition-transform after:duration-200 hover:after:scale-x-100";

  async function handleLogout() {
    await signOutUser();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md print:hidden">
      {demoNow && (
        <p className="bg-amber-100 px-3 py-1 text-center text-[11px] font-medium text-amber-900 sm:px-4 sm:text-xs" data-testid="demo-banner">
          Demo clock is on: {demoNow}
        </p>
      )}
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-teal-800 whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
        >
          Dakterly
        </Link>

        {/* Mobile menu (< md) */}
        <MobileNavMenu
          user={activeUser ? { name: activeUser.name, role: activeUser.role } : null}
          dashboardHref={activeUser ? dashboardPath(activeUser.role) : null}
          onLogout={handleLogout}
        />

        {/* Desktop navigation (md+) */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/doctors" className={navLinkClass}>
            Find doctors
          </Link>
          <Link href="/join-clinic" className={navLinkClass}>
            For clinics
          </Link>

          {activeUser ? (
            <>
              {activeUser.role === "PATIENT" ? (
                <Link href="/appointments" className={navLinkClass}>
                  My appointments
                </Link>
              ) : (
                <Link href={dashboardPath(activeUser.role)} className={navLinkClass}>
                  Dashboard
                </Link>
              )}
              <span className="hidden text-sm text-slate-500 whitespace-nowrap lg:inline">{activeUser.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-2 text-sm font-medium text-teal-800 whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md hover:shadow-teal-700/20 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
