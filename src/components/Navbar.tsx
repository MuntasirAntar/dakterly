import Link from "next/link";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function Navbar() {
  const user = await getCurrentUser();
  // When DEMO_NOW is set the whole site uses a frozen "pretend" time. Say so clearly.
  const demoNow = process.env.DEMO_NOW && !Number.isNaN(new Date(process.env.DEMO_NOW).getTime()) ? process.env.DEMO_NOW : null;

  return (
    <header className="border-b border-gray-200 bg-white print:hidden">
      {demoNow && (
        <p className="bg-amber-100 px-4 py-1 text-center text-xs font-medium text-amber-900" data-testid="demo-banner">
          Demo clock is on: the site thinks it is {demoNow}
        </p>
      )}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-teal-700">
          Dakterly
        </Link>

        <div className="flex items-center gap-3 whitespace-nowrap text-sm text-gray-700 sm:gap-4">
          <Link href="/doctors" className="hover:text-teal-700">
            <span className="sm:hidden">Doctors</span>
            <span className="hidden sm:inline">Find doctors</span>
          </Link>
          {user ? (
            <>
              {user.role === "PATIENT" ? (
                <Link href="/appointments" className="hover:text-teal-700">
                  <span className="sm:hidden">Appointments</span>
                  <span className="hidden sm:inline">My appointments</span>
                </Link>
              ) : (
                <Link href={homePathFor(user.role)} className="hover:text-teal-700">
                  Dashboard
                </Link>
              )}
              <span className="hidden text-gray-500 md:inline">{user.name}</span>
              <form action={logout}>
                <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-teal-700">
                Log in
              </Link>
              <Link href="/register" className="rounded bg-teal-700 px-3 py-1.5 text-white hover:bg-teal-800">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
