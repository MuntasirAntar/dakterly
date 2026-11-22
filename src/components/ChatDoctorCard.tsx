import Link from "next/link";
import { Calendar, Clock, MapPin, UserRound } from "lucide-react";
import DoctorAvatar from "@/components/DoctorAvatar";
import { formatFee } from "@/lib/format";
import type { ChatDoctorResult, ChatLanguage } from "@/lib/chat/types";
import { CHAT_UI_TEXT } from "@/lib/chat/ui-text";

type Props = {
  doctor: ChatDoctorResult;
  language: ChatLanguage;
  onNavigate?: () => void;
};

export default function ChatDoctorCard({ doctor, language, onNavigate }: Props) {
  const ui = CHAT_UI_TEXT[language];

  return (
    <article className="rounded-xl border border-emerald-900/15 bg-white p-3 shadow-xs transition-colors hover:border-teal-300">
      <div className="flex items-start gap-2.5">
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-slate-900">{doctor.name}</h4>
          <p className="text-xs font-semibold text-teal-700">
            {doctor.specialty}
            {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
          <span className="min-w-0 break-words">
            <span className="font-medium text-slate-800">{doctor.clinicName}</span> · {doctor.address}, {doctor.city}
          </span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <span className="font-semibold text-slate-900 tabular-nums">
            {ui.consultationFee}: {formatFee(doctor.fee)}
          </span>
          {doctor.nextAvailable && (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                {ui.nextAvailableLabel}: {doctor.nextAvailable}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
        <Link
          href={`/doctors/${doctor.id}`}
          onClick={onNavigate}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{ui.viewProfile}</span>
        </Link>
        <Link
          href={`/doctors/${doctor.id}/book`}
          onClick={onNavigate}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{ui.bookAppointment}</span>
        </Link>
      </div>
    </article>
  );
}
