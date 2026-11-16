import Link from "next/link";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import MobileNavMenu from "@/components/MobileNavMenu";

export default async function Navbar() {
  const user = await getCurrentUser();
  // When DEMO_NOW is set the whole site uses a frozen "pretend" time. Say so clearly.
  const demoNow =
    process.env.DEMO_NOW && !Number.isNaN(new Date(process.env.DEMO_NOW).getTime())
      ? process.env.DEMO_NOW
      : null;

  const navLinkClass =
    "relative py-1.5 text-sm font-medium text-slate-600 whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-teal-600 after:transition-transform after:duration-200 hover:after:scale-x-100";

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
          user={user ? { name: user.name, role: user.role } : null}
          dashboardHref={user ? homePathFor(user.role) : null}
          logoutAction={logout}
        />

        {/* Desktop navigation (md+) */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/doctors" className={navLinkClass}>
            Find doctors
          </Link>
          <Link href="/join-clinic" className={navLinkClass}>
            For clinics
          </Link>

          {user ? (
            <>
              {user.role === "PATIENT" ? (
                <Link href="/appointments" className={navLinkClass}>
                  My appointments
                </Link>
              ) : (
                <Link href={homePathFor(user.role)} className={navLinkClass}>
                  Dashboard
                </Link>
              )}
              <span className="hidden text-sm text-slate-500 whitespace-nowrap lg:inline">{user.name}</span>
              <form action={logout} className="shrink-0">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  Log out
                </button>
              </form>
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
