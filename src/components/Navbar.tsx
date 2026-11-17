import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import DesktopNavLinks from "@/components/DesktopNavLinks";
import MobileNavMenu from "@/components/MobileNavMenu";

export default async function Navbar() {
  const user = await getCurrentUser();
  // When DEMO_NOW is set the whole site uses a frozen "pretend" time. Say so clearly.
  const demoNow =
    process.env.DEMO_NOW && !Number.isNaN(new Date(process.env.DEMO_NOW).getTime())
      ? process.env.DEMO_NOW
      : null;

  const userSummary = user ? { name: user.name, role: user.role } : null;
  const dashboardHref = user ? homePathFor(user.role) : null;

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
        <Suspense fallback={null}>
          <MobileNavMenu
            user={userSummary}
            dashboardHref={dashboardHref}
            logoutAction={logout}
          />
        </Suspense>

        {/* Desktop navigation (md+) */}
        <div className="hidden items-center gap-3 lg:gap-4 md:flex">
          <Suspense fallback={null}>
            <DesktopNavLinks user={userSummary} dashboardHref={dashboardHref} />
          </Suspense>

          {user && (
            <form action={logout} className="shrink-0">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                Log out
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
