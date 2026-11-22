import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { formatFee, summarizeSchedule } from "@/lib/format";
import DoctorAvatar from "@/components/DoctorAvatar";

export type DoctorCardItem = {
  id: string;
  name: string;
  qualifications: string | null;
  photoUrl: string | null;
  consultationFee: number;
  specialty: { name: string };
  clinic: { id: string; name: string; city: string; address: string };
  schedules: Array<{ weekday: number; startTime: string; endTime: string }>;
};

export default function DoctorCard({ doctor }: { doctor: DoctorCardItem }) {
  const schedule = summarizeSchedule(doctor.schedules);

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md sm:p-5">
      <div>
        <div className="flex items-start gap-3.5 sm:gap-4">
          <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-teal-700">
              {doctor.specialty.name}
              {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
            </p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900 sm:truncate sm:text-lg">
              <Link href={`/doctors/${doctor.id}`} prefetch={true} className="transition-colors hover:text-teal-700">
                {doctor.name}
              </Link>
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-sm text-slate-600">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            <span className="min-w-0">
              <Link href={`/clinics/${doctor.clinic.id}`} prefetch={true} className="font-medium text-slate-800 hover:text-teal-700">
                {doctor.clinic.name}
              </Link>{" "}
              · {doctor.clinic.city}
            </span>
          </p>
          {schedule.slice(0, 2).map((line) => (
            <p key={line} className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              <span className="tabular-nums">{line}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">Consultation fee</p>
          <p className="font-bold text-slate-900 tabular-nums">{formatFee(doctor.consultationFee)}</p>
        </div>
        <Link
          href={`/doctors/${doctor.id}`}
          prefetch={true}
          className="group inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap transition-all duration-200 hover:bg-emerald-600 hover:shadow-sm"
        >
          <span>View profile</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
