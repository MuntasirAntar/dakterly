"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import PrintButton from "@/components/PrintButton";
import { OperationType, firestore, handleFirestoreError } from "@/lib/firebase";
import { formatTime } from "@/lib/format";
import { summarizeDay, type Status } from "@/lib/queue";
import { CLINIC_TZ, currentTime, formatDate, nowInClinicTz } from "@/lib/time";

type DoctorMeta = {
  id: string;
  name: string;
  clinicName: string;
  specialtyName: string;
};

type DayAppt = {
  id: string;
  tokenNumber: number;
  slotTime: string;
  status: string;
  patientName: string;
  patientPhone: string | null;
};

function statusText(status: string) {
  const labels: Record<string, string> = {
    BOOKED: "Booked",
    CHECKED_IN: "Arrived",
    IN_PROGRESS: "With doctor",
    COMPLETED: "Seen",
    NO_SHOW: "No-show",
  };
  return labels[status] ?? status;
}

export default function DoctorTodayPrintClient({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const { ready, firebaseUser, profile } = useFirebase();
  const [doctor, setDoctor] = useState<DoctorMeta | null>(null);
  const [appointments, setAppointments] = useState<DayAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const today = nowInClinicTz().date;

  useEffect(() => {
    if (!ready) return;
    if (!firebaseUser) {
      router.replace(`/login?next=${encodeURIComponent(`/admin/doctors/${doctorId}/today`)}`);
      return;
    }
    if (profile && profile.role !== "CLINIC_ADMIN") {
      router.replace(profile.role === "SUPER_ADMIN" ? "/superadmin" : "/");
    }
  }, [ready, firebaseUser, profile, doctorId, router]);

  useEffect(() => {
    if (!ready || !firebaseUser || !profile || profile.role !== "CLINIC_ADMIN") return;
    if (!profile.clinicId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const myClinicId = profile.clinicId;

    async function loadData() {
      try {
        const docSnap = await getDoc(doc(firestore, "doctors", doctorId));
        if (!docSnap.exists() || docSnap.data().clinicId !== myClinicId) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const dv = docSnap.data() as Record<string, unknown>;
        const [clinicSnap, specSnap, apptsSnap] = await Promise.all([
          getDoc(doc(firestore, "clinics", myClinicId)),
          getDoc(doc(firestore, "specialties", String(dv.specialtyId ?? ""))),
          getDocs(
            query(
              collection(firestore, "appointments"),
              where("clinicId", "==", myClinicId),
              where("doctorId", "==", doctorId),
              where("date", "==", today),
            ),
          ),
        ]);

        setDoctor({
          id: docSnap.id,
          name: String(dv.name ?? "Doctor"),
          clinicName: clinicSnap.exists() ? String(clinicSnap.data().name ?? "Clinic") : "Clinic",
          specialtyName: specSnap.exists() ? String(specSnap.data().name ?? "Specialist") : "Specialist",
        });

        const list: DayAppt[] = apptsSnap.docs
          .map((a) => {
            const av = a.data() as Record<string, unknown>;
            return {
              id: a.id,
              tokenNumber: Number(av.tokenNumber ?? 1),
              slotTime: String(av.slotTime ?? ""),
              status: String(av.status ?? "BOOKED"),
              patientName: String(av.patientName ?? "Patient"),
              patientPhone: typeof av.patientPhone === "string" ? av.patientPhone : null,
            };
          })
          .sort((a, b) => a.slotTime.localeCompare(b.slotTime) || a.tokenNumber - b.tokenNumber);

        setAppointments(list);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `doctors/${doctorId}`);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [ready, firebaseUser, profile, doctorId, today]);

  if (!ready || loading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading daily roster from Firestore...
        </div>
      </main>
    );
  }

  if (notFound || !doctor) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <p className="text-slate-700">Doctor not found for your clinic.</p>
        <Link href="/admin" className="mt-2 inline-block text-sm text-teal-700 hover:underline">
          &larr; Back to dashboard
        </Link>
      </main>
    );
  }

  const totals = summarizeDay(appointments.map((a) => a.status as Status));
  const rows = appointments.filter((a) => a.status !== "CANCELLED");
  const printedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(currentTime());

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin" className="text-sm text-teal-700 hover:underline">
          &larr; Back to dashboard
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-gray-300 pb-4">
          <p className="text-sm text-gray-600">{doctor.clinicName}</p>
          <h1 className="text-2xl font-bold text-gray-900">{doctor.name}</h1>
          <p className="text-sm text-gray-700">
            {doctor.specialtyName} · {formatDate(today)}
          </p>
          <p className="mt-3 text-lg">
            Patients expected today: <strong data-testid="expected">{totals.expected}</strong>
            {totals.cancelled > 0 && (
              <span className="text-sm text-gray-600"> ({totals.cancelled} cancelled, not listed)</span>
            )}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="py-8 text-gray-600">No appointments for today.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-gray-400 text-xs uppercase tracking-wide text-gray-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Time</th>
                <th className="py-2 pr-2">Patient</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 text-center">Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-200 print:break-inside-avoid" data-testid="print-row">
                  <td className="py-2.5 pr-2 font-bold">{row.tokenNumber}</td>
                  <td className="py-2.5 pr-2 whitespace-nowrap">{formatTime(row.slotTime)}</td>
                  <td className="py-2.5 pr-2 font-medium">{row.patientName}</td>
                  <td className="py-2.5 pr-2 whitespace-nowrap">{row.patientPhone ?? "-"}</td>
                  <td className="py-2.5 pr-2">{statusText(row.status)}</td>
                  <td className="py-2.5 text-center">
                    <span className="inline-block h-5 w-5 border-2 border-gray-500 align-middle" aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className="mt-6 border-t border-gray-300 pt-3 text-xs text-gray-600">
          Printed at {printedAt}. Status shows the moment of printing. Confidential patient information: keep this
          paper safe and shred it after the clinic day.
        </footer>
      </article>
    </main>
  );
}
