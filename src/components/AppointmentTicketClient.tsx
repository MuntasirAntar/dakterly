"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import StatusBadge from "@/components/StatusBadge";
import { BOOKING_MESSAGES } from "@/lib/booking-constants";
import { OperationType, firestore, handleFirestoreError } from "@/lib/firebase";
import { formatFee, formatTime } from "@/lib/format";
import {
  averageConsultMinutes,
  countAhead,
  estimateWaitMinutes,
  formatWait,
  phaseFor,
  type QueueEntry,
  type Status,
} from "@/lib/queue";
import { CANCEL_CUTOFF_MINUTES, canCancel } from "@/lib/slots";
import { formatDate, nowInClinicTz } from "@/lib/time";

type ApptDetail = {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  date: string;
  slotTime: string;
  status: Status;
  tokenNumber: number;
  slotLockId: string;
};

type DoctorDetail = {
  id: string;
  name: string;
  consultationFee: number;
  avgConsultMinutes: number;
  specialtyName: string;
  clinic: {
    name: string;
    address: string;
    city: string;
    phone: string | null;
  };
};

function toMillis(val: unknown): number | null {
  if (val instanceof Timestamp) return val.toMillis();
  if (val instanceof Date) return val.getTime();
  return null;
}

export default function AppointmentTicketClient({
  appointmentId,
  bookedFlag,
}: {
  appointmentId: string;
  bookedFlag: boolean;
}) {
  const router = useRouter();
  const { ready, firebaseUser, profile } = useFirebase();
  const [appointment, setAppointment] = useState<ApptDetail | null>(null);
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [dayLocks, setDayLocks] = useState<Array<QueueEntry & { startedMs: number | null; completedMs: number | null }>>([]);
  const [notFoundErr, setNotFoundErr] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!firebaseUser) {
      router.replace(`/login?next=${encodeURIComponent(`/appointments/${appointmentId}`)}`);
      return;
    }
    if (profile && profile.role !== "PATIENT") {
      router.replace(profile.role === "SUPER_ADMIN" ? "/superadmin" : "/admin");
    }
  }, [ready, firebaseUser, profile, appointmentId, router]);

  useEffect(() => {
    if (!ready || !firebaseUser || !profile || profile.role !== "PATIENT") return;
    if (!/^[a-zA-Z0-9_-]+$/.test(appointmentId)) {
      setNotFoundErr(true);
      return;
    }

    const unsub = onSnapshot(
      doc(firestore, "appointments", appointmentId),
      async (snap) => {
        if (!snap.exists()) {
          setNotFoundErr(true);
          return;
        }
        const v = snap.data() as Record<string, unknown>;
        if (v.patientId !== profile.uid) {
          setNotFoundErr(true);
          return;
        }
        const detail: ApptDetail = {
          id: snap.id,
          patientId: String(v.patientId ?? ""),
          doctorId: String(v.doctorId ?? ""),
          clinicId: String(v.clinicId ?? ""),
          date: String(v.date ?? ""),
          slotTime: String(v.slotTime ?? ""),
          status: (v.status as Status) ?? "BOOKED",
          tokenNumber: Number(v.tokenNumber ?? 1),
          slotLockId: String(v.slotLockId ?? ""),
        };
        setAppointment(detail);

        // Fetch doctor/clinic metadata once
        try {
          const docSnap = await getDoc(doc(firestore, "doctors", detail.doctorId));
          if (docSnap.exists()) {
            const dv = docSnap.data() as Record<string, unknown>;
            const [clinicSnap, specSnap] = await Promise.all([
              getDoc(doc(firestore, "clinics", String(dv.clinicId ?? detail.clinicId))),
              getDoc(doc(firestore, "specialties", String(dv.specialtyId ?? ""))),
            ]);
            const cv = clinicSnap.exists() ? (clinicSnap.data() as Record<string, unknown>) : {};
            const sv = specSnap.exists() ? (specSnap.data() as Record<string, unknown>) : {};
            setDoctor({
              id: docSnap.id,
              name: String(dv.name ?? "Doctor"),
              consultationFee: Number(dv.consultationFee ?? 0),
              avgConsultMinutes: Number(dv.avgConsultMinutes ?? 10),
              specialtyName: String(sv.name ?? dv.specialtyName ?? "Specialist"),
              clinic: {
                name: String(cv.name ?? dv.clinicName ?? "Clinic"),
                address: String(cv.address ?? ""),
                city: String(cv.city ?? ""),
                phone: typeof cv.phone === "string" ? cv.phone : null,
              },
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `doctors/${detail.doctorId}`);
        }
      },
      (err) => {
        // Permission denied means either missing or not owned by patient
        const msg = err instanceof Error ? err.message : "";
        if (msg.toLowerCase().includes("permission")) {
          setNotFoundErr(true);
        } else {
          handleFirestoreError(err, OperationType.GET, `appointments/${appointmentId}`);
        }
      },
    );

    return () => unsub();
  }, [ready, firebaseUser, profile, appointmentId]);

  // Listen to zero-PII day slotLocks for real-time queue position updates (< 1 second!)
  useEffect(() => {
    if (!ready || !firebaseUser || !appointment) return;
    const q = query(
      collection(firestore, "slotLocks"),
      where("doctorId", "==", appointment.doctorId),
      where("date", "==", appointment.date),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const v = d.data() as Record<string, unknown>;
          return {
            id: String(v.appointmentId ?? d.id),
            slotTime: String(v.slotTime ?? ""),
            tokenNumber: Number(v.tokenNumber ?? 1),
            status: (v.status as Status) ?? "BOOKED",
            startedMs: toMillis(v.startedAt),
            completedMs: toMillis(v.completedAt),
          };
        });
        setDayLocks(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "slotLocks"),
    );
    return () => unsub();
  }, [ready, firebaseUser, appointment]);

  const queueSnapshot = useMemo(() => {
    if (!appointment || !doctor) return null;
    const today = nowInClinicTz().date;
    let ahead = 0;
    let nowServingToken: number | null = null;
    let avgMinutes = doctor.avgConsultMinutes;

    if (appointment.date === today && ["BOOKED", "CHECKED_IN", "IN_PROGRESS"].includes(appointment.status)) {
      ahead = countAhead(
        {
          id: appointment.id,
          slotTime: appointment.slotTime,
          tokenNumber: appointment.tokenNumber,
          status: appointment.status,
        },
        dayLocks,
      );
      nowServingToken = dayLocks.find((e) => e.status === "IN_PROGRESS")?.tokenNumber ?? null;
      const durations = dayLocks
        .filter((d) => d.status === "COMPLETED" && d.startedMs && d.completedMs)
        .map((d) => ((d.completedMs ?? 0) - (d.startedMs ?? 0)) / 60000);
      avgMinutes = averageConsultMinutes(durations, doctor.avgConsultMinutes);
    }

    return {
      phase: phaseFor({ status: appointment.status, date: appointment.date, today, ahead }),
      ahead,
      estimatedWaitMinutes: estimateWaitMinutes(ahead, avgMinutes),
      nowServingToken,
    };
  }, [appointment, doctor, dayLocks]);

  async function handleCancel() {
    if (!appointment) return;
    if (!window.confirm("Cancel this appointment? Your time slot will be given to someone else.")) return;

    if (!canCancel(appointment.date, appointment.slotTime, nowInClinicTz())) {
      setErrorMsg(BOOKING_MESSAGES.too_late);
      return;
    }

    setCancelling(true);
    setErrorMsg(null);
    try {
      await runTransaction(firestore, async (tx) => {
        const apptRef = doc(firestore, "appointments", appointment.id);
        const lockRef = doc(firestore, "slotLocks", appointment.slotLockId);
        const apptSnap = await tx.get(apptRef);
        if (!apptSnap.exists() || apptSnap.data().status !== "BOOKED") {
          throw new Error("NOT_CANCELLABLE");
        }
        const ts = serverTimestamp();
        tx.update(apptRef, {
          status: "CANCELLED",
          cancelledAt: ts,
          updatedAt: ts,
        });
        tx.update(lockRef, {
          status: "CANCELLED",
          updatedAt: ts,
        });
      });
      setCancelledNotice(true);
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_CANCELLABLE") {
        setErrorMsg(BOOKING_MESSAGES.not_cancellable);
      } else {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${appointment.id}`);
      }
    } finally {
      setCancelling(false);
    }
  }

  if (notFoundErr) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-semibold text-slate-900">Appointment not found</p>
        <p className="mt-1 text-sm text-slate-600">This appointment does not exist or belongs to another account.</p>
        <Link href="/appointments" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
          View my appointments
        </Link>
      </div>
    );
  }

  if (!ready || !appointment || !doctor || !queueSnapshot) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Loading your live ticket from Firestore...
      </div>
    );
  }

  const cancellable =
    appointment.status === "BOOKED" && canCancel(appointment.date, appointment.slotTime, nowInClinicTz());
  const isLive = ["BOOKED", "CHECKED_IN", "IN_PROGRESS"].includes(appointment.status);
  const { phase } = queueSnapshot;

  const headline: Record<string, string> = {
    not_arrived: "Please arrive at the clinic and give your token number to the receptionist.",
    waiting: "You are checked in. Please wait to be called.",
    next: "You are next. Please be ready.",
    with_doctor: "It is your turn. You are with the doctor now.",
  };

  return (
    <>
      {bookedFlag && !cancelledNotice && (
        <p role="status" className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-900">
          Your appointment is booked. Please arrive about 15 minutes early and show your token number.
        </p>
      )}
      {cancelledNotice && (
        <p role="status" className="mt-4 rounded-lg bg-gray-100 p-3 text-sm font-medium text-gray-800">
          Your appointment has been cancelled.
        </p>
      )}
      {errorMsg && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <article className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={`flex items-center justify-between px-6 py-5 text-white ${isLive ? "bg-teal-700" : "bg-gray-500"}`}>
          <div>
            <p className={`text-sm ${isLive ? "text-teal-100" : "text-gray-200"}`}>Your token number</p>
            <p className="text-5xl font-bold leading-tight" aria-label={`Token number ${appointment.tokenNumber}`}>
              #{appointment.tokenNumber}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Date</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{formatDate(appointment.date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Time</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{formatTime(appointment.slotTime)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Doctor</dt>
            <dd className="mt-0.5 text-gray-900">
              <Link href={`/doctors/${doctor.id}`} className="font-semibold hover:text-teal-700">
                {doctor.name}
              </Link>
              <span className="block text-sm text-gray-600">{doctor.specialtyName}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Clinic</dt>
            <dd className="mt-0.5 text-gray-900">
              <span className="font-semibold">{doctor.clinic.name}</span>
              <span className="block text-sm text-gray-600">
                {doctor.clinic.address}, {doctor.clinic.city}
              </span>
              {doctor.clinic.phone && <span className="block text-sm text-gray-600">{doctor.clinic.phone}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Fee (pay at the clinic)</dt>
            <dd className="mt-0.5 font-semibold text-gray-900">{formatFee(doctor.consultationFee)}</dd>
          </div>
        </dl>

        {phase === "later" && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <p className="text-sm text-gray-600">Your place in the queue will show here on the day of your visit.</p>
          </div>
        )}

        {phase === "expired" && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-sm text-gray-600">
            The date of this appointment has passed.
          </div>
        )}

        {phase !== "closed" && phase !== "later" && phase !== "expired" && (
          <div
            className={`border-t px-6 py-5 ${phase === "next" || phase === "with_doctor" ? "border-teal-200 bg-teal-50" : "border-gray-100 bg-gray-50"}`}
            data-testid="queue-tracker"
            data-phase={phase}
          >
            <p className="font-semibold text-gray-900" role="status">
              {headline[phase]}
            </p>

            {phase !== "with_doctor" && (
              <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Before you</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900" data-testid="ahead">
                    {queueSnapshot.ahead}
                  </dd>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Estimated wait</dt>
                  <dd className="mt-1 text-sm font-bold text-gray-900" data-testid="wait">
                    {formatWait(queueSnapshot.estimatedWaitMinutes)}
                  </dd>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Now serving</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900" data-testid="serving">
                    {queueSnapshot.nowServingToken ? `#${queueSnapshot.nowServingToken}` : "-"}
                  </dd>
                </div>
              </dl>
            )}

            <p className="mt-3 text-xs text-gray-500">
              Live synced with Firestore — updates automatically when the clinic calls the next token.
            </p>
          </div>
        )}
      </article>

      {appointment.status === "BOOKED" && (
        <section className="mt-5">
          {cancellable ? (
            <button
              type="button"
              disabled={cancelling}
              onClick={handleCancel}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {cancelling ? "Cancelling..." : "Cancel appointment"}
            </button>
          ) : (
            <p className="text-sm text-gray-600">
              Online cancelling closes {CANCEL_CUTOFF_MINUTES / 60} hours before the appointment. Please call the clinic if you cannot come.
            </p>
          )}
        </section>
      )}
    </>
  );
}
