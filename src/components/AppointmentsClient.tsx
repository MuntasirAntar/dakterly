"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import AppointmentCard from "@/components/AppointmentCard";
import { OperationType, firestore, handleFirestoreError } from "@/lib/firebase";
import { nowInClinicTz } from "@/lib/time";

type EnrichedAppointment = {
  id: string;
  date: string;
  slotTime: string;
  status: string;
  tokenNumber: number;
  doctor: {
    name: string;
    specialty: { name: string };
    clinic: { name: string };
  };
};

function isUpcoming(status: string, date: string, today: string) {
  return (status === "BOOKED" || status === "CHECKED_IN" || status === "IN_PROGRESS") && date >= today;
}

export default function AppointmentsClient({ tab }: { tab: "upcoming" | "past" }) {
  const router = useRouter();
  const { ready, firebaseUser, profile } = useFirebase();
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!firebaseUser) {
      router.replace("/login?next=/appointments");
      return;
    }
    if (profile && profile.role !== "PATIENT") {
      router.replace(profile.role === "SUPER_ADMIN" ? "/superadmin" : "/admin");
    }
  }, [ready, firebaseUser, profile, router]);

  useEffect(() => {
    if (!ready || !firebaseUser || !profile || profile.role !== "PATIENT") return;
    let active = true;

    async function loadAndWatch() {
      const [docsSnap, clinicsSnap, specsSnap] = await Promise.all([
        getDocs(collection(firestore, "doctors")),
        getDocs(collection(firestore, "clinics")),
        getDocs(collection(firestore, "specialties")),
      ]).catch((err) => handleFirestoreError(err, OperationType.LIST, "doctors,clinics,specialties"));

      if (!active) return;

      const clinicNameById = new Map<string, string>();
      clinicsSnap.docs.forEach((d) => clinicNameById.set(d.id, String(d.data().name ?? "Clinic")));
      const specNameById = new Map<string, string>();
      specsSnap.docs.forEach((d) => specNameById.set(d.id, String(d.data().name ?? "Specialist")));
      const docMetaById = new Map<string, { name: string; spec: string; clinic: string }>();
      docsSnap.docs.forEach((d) => {
        const v = d.data() as Record<string, unknown>;
        docMetaById.set(d.id, {
          name: String(v.name ?? "Doctor"),
          spec: specNameById.get(String(v.specialtyId ?? "")) ?? String(v.specialtyName ?? "Specialist"),
          clinic: clinicNameById.get(String(v.clinicId ?? "")) ?? String(v.clinicName ?? "Clinic"),
        });
      });

      const q = query(collection(firestore, "appointments"), where("patientId", "==", profile!.uid));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const rows: EnrichedAppointment[] = snap.docs
            .map((d) => {
              const v = d.data() as Record<string, unknown>;
              const meta = docMetaById.get(String(v.doctorId ?? "")) ?? {
                name: "Doctor",
                spec: "Specialist",
                clinic: "Clinic",
              };
              return {
                id: d.id,
                date: String(v.date ?? ""),
                slotTime: String(v.slotTime ?? ""),
                status: String(v.status ?? "BOOKED"),
                tokenNumber: Number(v.tokenNumber ?? 1),
                doctor: {
                  name: meta.name,
                  specialty: { name: meta.spec },
                  clinic: { name: meta.clinic },
                },
              };
            })
            .sort((a, b) => a.date.localeCompare(b.date) || a.slotTime.localeCompare(b.slotTime));

          setAppointments(rows);
          setLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, "appointments"),
      );

      return unsub;
    }

    let cleanup: (() => void) | undefined;
    loadAndWatch().then((u) => {
      if (active) cleanup = u;
      else u?.();
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [ready, firebaseUser, profile]);

  const today = nowInClinicTz().date;
  const upcoming = appointments.filter((a) => isUpcoming(a.status, a.date, today));
  const past = appointments.filter((a) => !isUpcoming(a.status, a.date, today)).reverse();
  const shown = tab === "past" ? past : upcoming;

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${active ? "bg-teal-700 text-white" : "bg-white text-gray-700 border border-gray-300 hover:border-teal-600"}`;

  if (!ready || loading) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Loading your appointments from Firestore...
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex gap-2">
        <Link href="/appointments" className={tabClass(tab === "upcoming")}>
          Upcoming ({upcoming.length})
        </Link>
        <Link href="/appointments?tab=past" className={tabClass(tab === "past")}>
          Past ({past.length})
        </Link>
      </div>

      {shown.length > 0 ? (
        <div className="mt-5 space-y-3">
          {shown.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900">
            {tab === "past" ? "No past appointments yet" : "No upcoming appointments"}
          </p>
          <p className="mt-1 text-sm text-gray-600">Find a doctor and book a time that suits you.</p>
          <Link
            href="/doctors"
            className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Find a doctor
          </Link>
        </div>
      )}
    </>
  );
}
