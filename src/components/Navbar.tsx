import Link from "next/link";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-teal-700">
          Dakterly
        </Link>

        <div className="flex items-center gap-4 text-sm text-gray-700">
          <Link href="/doctors" className="hover:text-teal-700">
            Find doctors
          </Link>
          {user ? (
            <>
              {user.role === "PATIENT" ? (
                <Link href="/appointments" className="hover:text-teal-700">
                  My appointments
                </Link>
              ) : (
                <Link href={homePathFor(user.role)} className="hover:text-teal-700">
                  Dashboard
                </Link>
              )}
              <span className="text-gray-500">{user.name}</span>
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
