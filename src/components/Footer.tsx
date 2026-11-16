import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-teal-900/15 bg-teal-950 text-teal-100 print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="inline-block text-xl font-bold tracking-tight text-white transition-colors duration-200 hover:text-emerald-300">
              Dakterly
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-teal-100/80">
              Book clinic appointments with verified specialists and follow your token position live from home—built for calm, predictable clinic visits.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-teal-200/85">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Daily clinic hours: 09:00 – 21:00
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Dhaka &amp; Chattogram
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                01700-000001
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Patients</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-teal-100/80">
              <li>
                <Link href="/doctors" className="transition-colors duration-150 hover:text-emerald-300">
                  Find a doctor
                </Link>
              </li>
              <li>
                <Link href="/appointments" className="transition-colors duration-150 hover:text-emerald-300">
                  My appointments
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors duration-150 hover:text-emerald-300">
                  Patient login
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors duration-150 hover:text-emerald-300">
                  Create an account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Locations &amp; Staff</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-teal-100/80">
              <li>
                <Link href="/doctors?city=Dhaka" className="transition-colors duration-150 hover:text-emerald-300">
                  Doctors in Dhaka
                </Link>
              </li>
              <li>
                <Link href="/doctors?city=Chattogram" className="transition-colors duration-150 hover:text-emerald-300">
                  Doctors in Chattogram
                </Link>
              </li>
              <li>
                <Link href="/join-clinic" className="transition-colors duration-150 hover:text-emerald-300">
                  Partner your clinic
                </Link>
              </li>
              <li>
                <a
                  href="mailto:partnerships@dakterly.com?subject=Clinic%20Partnership%20Inquiry"
                  className="transition-colors duration-150 hover:text-emerald-300"
                >
                  partnerships@dakterly.com
                </a>
              </li>
              <li>
                <Link href="/login" className="transition-colors duration-150 hover:text-emerald-300">
                  Clinic staff portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-teal-800/70 pt-6 text-xs text-teal-200/70 sm:flex-row sm:items-center">
          <p>&copy; 2026 Dakterly. A Doctor Always Near You.</p>
          <p>Pay consultation fees directly at the clinic counter.</p>
        </div>
      </div>
    </footer>
  );
}
