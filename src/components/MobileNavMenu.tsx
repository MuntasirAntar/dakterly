"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type Props = {
  user: {
    name: string;
    role: string;
  } | null;
  dashboardHref: string | null;
  onLogout: () => Promise<void>;
};

export default function MobileNavMenu({ user, dashboardHref, onLogout }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2">
        {!user ? (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-800 whitespace-nowrap"
          >
            Log in
          </Link>
        ) : (
          <Link
            href={user.role === "PATIENT" ? "/appointments" : (dashboardHref ?? "/")}
            className="inline-flex items-center justify-center rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-800 whitespace-nowrap"
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
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
            >
              Find doctors
            </Link>
            <Link
              href="/join-clinic"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
            >
              For clinics
            </Link>

            {user ? (
              <>
                <Link
                  href={user.role === "PATIENT" ? "/appointments" : (dashboardHref ?? "/")}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                >
                  {user.role === "PATIENT" ? "My appointments" : "Dashboard"}
                </Link>
                <div className="border-t border-slate-100 pt-2">
                  <p className="px-3 pb-2 text-xs text-slate-500">Signed in as {user.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void onLogout();
                    }}
                    className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-sm font-semibold text-rose-700"
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white"
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
