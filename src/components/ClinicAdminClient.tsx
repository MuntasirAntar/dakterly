"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import DoctorDayCard from "@/components/DoctorDayCard";
import { OperationType, firestore, handleFirestoreError } from "@/lib/firebase";
import { summarizeDay, type Status } from "@/lib/queue";
import { formatDate, nowInClinicTz, weekdayOf } from "@/lib/time";

type ClinicRecord = {
  id: string;
  name: string;
  isActive: boolean;
};

type ClinicDoctorMeta = {
  id: string;
  name: string;
  specialty: string;
  worksToday: boolean;
};

type ClinicAppointmentRow = {
  id: string;
  slotLockId: string;
  doctorId: string;
  clinicId: string;
  date: string;
  slotTime: string;
  tokenNumber: number;
  status: string;
  patient: { name: string; phone: string | null };
};

export default function ClinicAdminClient() {
  const router = useRouter();
  const { ready, firebaseUser, profile } = useFirebase();
  const [clinic, setClinic] = useState<ClinicRecord | null>(null);
  const [doctorsMeta, setDoctorsMeta] = useState<ClinicDoctorMeta[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const today = nowInClinicTz().date;
  const todayWeekday = weekdayOf(today);

  useEffect(() => {
    if (!ready) return;
    if (!firebaseUser) {
      router.replace("/login?next=/admin");
      return;
    }
    if (profile && profile.role !== "CLINIC_ADMIN") {
      router.replace(profile.role === "SUPER_ADMIN" ? "/superadmin" : "/");
    }
  }, [ready, firebaseUser, profile, router]);

  useEffect(() => {
    if (!ready || !firebaseUser || !profile || profile.role !== "CLINIC_ADMIN") return;
    if (!profile.clinicId) {
      setLoading(false);
      return;
    }

    const myClinicId = profile.clinicId;
    let active = true;
    let unsubAppts: (() => void) | undefined;

    async function loadClinicWorkspace() {
      const [clinicSnap, doctorsSnap, specsSnap, schedsSnap] = await Promise.all([
        getDoc(doc(firestore, "clinics", myClinicId)),
        getDocs(query(collection(firestore, "doctors"), where("clinicId", "==", myClinicId))),
        getDocs(collection(firestore, "specialties")),
        getDocs(collection(firestore, "doctorSchedules")),
      ]).catch((err) => handleFirestoreError(err, OperationType.LIST, "clinics,doctors,specialties,doctorSchedules"));

      if (!active) return;

      if (!clinicSnap.exists()) {
        setClinic(null);
        setLoading(false);
        return;
      }

      const cv = clinicSnap.data() as Record<string, unknown>;
      setClinic({
        id: clinicSnap.id,
        name: String(cv.name ?? "Clinic"),
        isActive: cv.isActive !== false,
      });

      const specMap = new Map<string, string>();
      specsSnap.docs.forEach((s) => specMap.set(s.id, String(s.data().name ?? "Specialist")));

      const worksTodayByDoc = new Set<string>();
      schedsSnap.docs.forEach((sc) => {
        const sv = sc.data() as Record<string, unknown>;
        if (Number(sv.weekday) === todayWeekday && typeof sv.doctorId === "string") {
          worksTodayByDoc.add(sv.doctorId);
        }
      });

      const docList: ClinicDoctorMeta[] = doctorsSnap.docs
        .filter((d) => d.data().isActive !== false)
        .map((d) => {
          const dv = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: String(dv.name ?? "Doctor"),
            specialty: specMap.get(String(dv.specialtyId ?? "")) ?? String(dv.specialtyName ?? "Specialist"),
            worksToday: worksTodayByDoc.has(d.id),
          };
        });
      setDoctorsMeta(docList);

      // Strictly scoped query: clinicId == myClinicId AND date == today
      const apptsQuery = query(
        collection(firestore, "appointments"),
        where("clinicId", "==", myClinicId),
        where("date", "==", today),
      );
      unsubAppts = onSnapshot(
        apptsQuery,
        (snap) => {
          const rows: ClinicAppointmentRow[] = snap.docs
            .map((a) => {
              const av = a.data() as Record<string, unknown>;
              return {
                id: a.id,
                slotLockId: String(av.slotLockId ?? ""),
                doctorId: String(av.doctorId ?? ""),
                clinicId: String(av.clinicId ?? myClinicId),
                date: String(av.date ?? today),
                slotTime: String(av.slotTime ?? ""),
                tokenNumber: Number(av.tokenNumber ?? 1),
                status: String(av.status ?? "BOOKED"),
                patient: {
                  name: String(av.patientName ?? "Patient"),
                  phone: typeof av.patientPhone === "string" ? av.patientPhone : null,
                },
              };
            })
            .sort((a, b) => a.slotTime.localeCompare(b.slotTime) || a.tokenNumber - b.tokenNumber);
          setAppointments(rows);
          setLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, "appointments"),
      );
    }

    void loadClinicWorkspace();

    return () => {
      active = false;
      unsubAppts?.();
    };
  }, [ready, firebaseUser, profile, today, todayWeekday]);

  const doctorsWithAppointments = useMemo(() => {
    return doctorsMeta
      .map((docMeta) => ({
        ...docMeta,
        appointments: appointments.filter((a) => a.doctorId === docMeta.id),
      }))
      .filter((d) => d.worksToday || d.appointments.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [doctorsMeta, appointments]);

  if (!ready || loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Loading clinic dashboard from Firestore...
        </div>
      </main>
    );
  }

  if (!profile?.clinicId || !clinic) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-teal-700">Clinic dashboard</h1>
        <p className="mt-2 text-gray-600">No clinic is linked to this account. Please contact the site administrator.</p>
      </main>
    );
  }

  if (!clinic.isActive) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-teal-700">{clinic.name}</h1>
        <p className="mt-2 text-amber-800">This clinic is currently deactivated. Please contact the site administrator.</p>
      </main>
    );
  }

  const totals = summarizeDay(
    doctorsWithAppointments.flatMap((d) => d.appointments.map((a) => a.status as Status)),
  );

  const tiles = [
    { label: "Expected today", value: totals.expected },
    { label: "Not arrived", value: totals.notArrived },
    { label: "Waiting", value: totals.waiting },
    { label: "With doctor", value: totals.withDoctor },
    { label: "Completed", value: totals.completed },
    { label: "No-show", value: totals.noShow },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold text-teal-700">{clinic.name}</h1>
      <p className="mt-1 text-gray-600">
        Today: {formatDate(today)}. Live synced with Firestore — changes reflect immediately on patient tickets.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
            <dt className="text-xs uppercase tracking-wide text-gray-500">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 space-y-5">
        {doctorsWithAppointments.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-gray-600 shadow-sm">No doctors are working at this clinic today.</p>
        ) : (
          doctorsWithAppointments.map((doctor) => (
            <DoctorDayCard key={doctor.id} doctor={doctor} rows={doctor.appointments} />
          ))
        )}
      </div>
    </main>
  );
}
