"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import DoctorAvatar from "@/components/DoctorAvatar";
import { BOOKING_MESSAGES, MAX_UPCOMING_APPOINTMENTS } from "@/lib/booking-constants";
import { OperationType, clampString, firestore, handleFirestoreError, normalizeSlotLockId } from "@/lib/firebase";
import { formatFee, formatTime } from "@/lib/format";
import { availableSlots, bookableDates, slotsForDate } from "@/lib/slots";
import { dateChip, formatDate, isValidDateString, nowInClinicTz } from "@/lib/time";

type ScheduleRow = { weekday: number; startTime: string; endTime: string; slotMinutes: number };

type DoctorInfo = {
  id: string;
  name: string;
  clinicId: string;
  specialty: { name: string };
  clinic: { id: string; name: string; address: string; city: string };
  consultationFee: number;
  avgConsultMinutes: number;
  photoUrl: string | null;
  schedules: ScheduleRow[];
};

export default function BookingClient({
  doctor,
  initialDate,
  initialSlot,
}: {
  doctor: DoctorInfo;
  initialDate?: string;
  initialSlot?: string;
}) {
  const router = useRouter();
  const { ready, firebaseUser, profile } = useFirebase();
  const [slotLocks, setSlotLocks] = useState<Array<{ date: string; slotTime: string; tokenNumber: number; status: string }>>([]);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>(initialSlot);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const here = `/doctors/${encodeURIComponent(doctor.id)}/book`;

  // Redirect unauthenticated or non-patient users once auth state is ready
  useEffect(() => {
    if (!ready) return;
    if (!firebaseUser) {
      router.replace(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    if (profile && profile.role !== "PATIENT") {
      router.replace(profile.role === "SUPER_ADMIN" ? "/superadmin" : "/admin");
    }
  }, [ready, firebaseUser, profile, here, router]);

  // Listen to zero-PII slotLocks for this doctor in real time
  useEffect(() => {
    if (!ready || !firebaseUser) return;
    const q = query(collection(firestore, "slotLocks"), where("doctorId", "==", doctor.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const v = d.data() as Record<string, unknown>;
          return {
            date: String(v.date ?? ""),
            slotTime: String(v.slotTime ?? ""),
            tokenNumber: Number(v.tokenNumber ?? 0),
            status: String(v.status ?? "BOOKED"),
          };
        });
        setSlotLocks(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "slotLocks");
      },
    );
    return () => unsub();
  }, [ready, firebaseUser, doctor.id]);

  const now = nowInClinicTz();
  const days = useMemo(() => {
    const dates = bookableDates(now.date);
    const bookedByDate = new Map<string, string[]>();
    for (const row of slotLocks) {
      if (row.status === "CANCELLED") continue;
      bookedByDate.set(row.date, [...(bookedByDate.get(row.date) ?? []), row.slotTime]);
    }
    return dates.map((date) => ({
      date,
      total: slotsForDate(doctor.schedules, date).length,
      slots: availableSlots({ schedules: doctor.schedules, date, bookedTimes: bookedByDate.get(date) ?? [], now }),
    }));
  }, [doctor.schedules, slotLocks, now]);

  const requested =
    selectedDate && isValidDateString(selectedDate) ? days.find((d) => d.date === selectedDate) : undefined;
  const activeDay = requested && requested.slots.length > 0 ? requested : days.find((d) => d.slots.length > 0);
  const activeSlot = activeDay && selectedSlot && activeDay.slots.includes(selectedSlot) ? selectedSlot : undefined;

  async function handleConfirmBooking() {
    if (!firebaseUser || !profile || !activeDay || !activeSlot) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      // Check patient booking rules on their own appointments
      const myApptsSnap = await getDocs(
        query(collection(firestore, "appointments"), where("patientId", "==", profile.uid)),
      ).catch((err) => handleFirestoreError(err, OperationType.LIST, "appointments"));

      const activeMine = myApptsSnap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .filter((a) => a.status !== "CANCELLED");

      if (activeMine.some((a) => a.doctorId === doctor.id && a.date === activeDay.date)) {
        setErrorMsg(BOOKING_MESSAGES.duplicate_doctor_day);
        return;
      }
      if (activeMine.some((a) => a.date === activeDay.date && a.slotTime === activeSlot)) {
        setErrorMsg(BOOKING_MESSAGES.overlap);
        return;
      }
      const upcomingCount = activeMine.filter((a) => a.status === "BOOKED" && String(a.date ?? "") >= now.date).length;
      if (upcomingCount >= MAX_UPCOMING_APPOINTMENTS) {
        setErrorMsg(BOOKING_MESSAGES.limit);
        return;
      }

      // Highest token for this doctor on this date
      const dayTokens = slotLocks
        .filter((s) => s.date === activeDay.date)
        .map((s) => s.tokenNumber)
        .filter((n) => Number.isFinite(n));
      const tokenNumber = (dayTokens.length > 0 ? Math.max(...dayTokens) : 0) + 1;

      const slotLockId = normalizeSlotLockId(doctor.id, activeDay.date, activeSlot);
      const apptRef = doc(collection(firestore, "appointments"));
      const slotLockRef = doc(firestore, "slotLocks", slotLockId);

      await runTransaction(firestore, async (tx) => {
        const lockSnap = await tx.get(slotLockRef);
        const ts = serverTimestamp();

        if (lockSnap.exists()) {
          const lockData = lockSnap.data() as Record<string, unknown>;
          if (lockData.status !== "CANCELLED") {
            throw new Error("SLOT_TAKEN");
          }
          tx.update(slotLockRef, {
            appointmentId: apptRef.id,
            tokenNumber,
            status: "BOOKED",
            startedAt: null,
            completedAt: null,
            updatedAt: ts,
          });
        } else {
          tx.set(slotLockRef, {
            doctorId: doctor.id,
            clinicId: doctor.clinicId,
            appointmentId: apptRef.id,
            date: activeDay.date,
            slotTime: activeSlot,
            tokenNumber,
            status: "BOOKED",
            startedAt: null,
            completedAt: null,
            createdAt: ts,
            updatedAt: ts,
          });
        }

        tx.set(apptRef, {
          patientId: profile.uid,
          patientName: clampString(profile.name, 80, 1),
          patientPhone: profile.phone ?? null,
          doctorId: doctor.id,
          clinicId: doctor.clinicId,
          date: activeDay.date,
          slotTime: activeSlot,
          status: "BOOKED",
          tokenNumber,
          slotLockId,
          checkedInAt: null,
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          createdAt: ts,
          updatedAt: ts,
        });
      });

      router.push(`/appointments/${apptRef.id}?booked=1`);
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        setErrorMsg(BOOKING_MESSAGES.slot_taken);
      } else {
        handleFirestoreError(err, OperationType.WRITE, "appointments,slotLocks");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !firebaseUser || !profile || profile.role !== "PATIENT") {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Checking account session...
      </div>
    );
  }

  return (
    <>
      <section className="mt-5 flex flex-wrap items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-nowrap sm:gap-4">
        <DoctorAvatar name={doctor.name} photoUrl={doctor.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{doctor.name}</p>
          <p className="text-sm text-gray-600">
            {doctor.specialty.name} · {doctor.clinic.name}, {doctor.clinic.city}
          </p>
        </div>
        <p className="font-semibold text-gray-900 tabular-nums">{formatFee(doctor.consultationFee)}</p>
      </section>

      {errorMsg && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {!activeDay ? (
        <p className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
          No free slots in the next 14 days. Please check again later.
        </p>
      ) : (
        <>
          <h2 className="mt-8 text-lg font-semibold text-gray-900">1. Choose a day</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-7">
            {days.map((day) => {
              const chip = dateChip(day.date);
              const isSelected = day.date === activeDay.date;
              const base = "rounded-xl border px-2 py-2.5 text-center text-sm transition-colors";
              const inner = (
                <>
                  <span className="block text-xs">{chip.weekday}</span>
                  <span className="block text-lg font-bold leading-tight">{chip.day}</span>
                  <span className="block text-xs">{chip.month}</span>
                  <span className="mt-1 block text-[11px]">
                    {day.total === 0 ? "Off" : day.slots.length === 0 ? "Full" : `${day.slots.length} left`}
                  </span>
                </>
              );
              return day.slots.length === 0 ? (
                <div key={day.date} aria-disabled className={`${base} border-gray-100 bg-gray-50 text-gray-400`}>
                  {inner}
                </div>
              ) : (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.date);
                    setSelectedSlot(undefined);
                    setErrorMsg(null);
                  }}
                  aria-current={isSelected ? "date" : undefined}
                  className={`${base} ${
                    isSelected
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-gray-300 bg-white text-gray-800 hover:border-teal-600"
                  }`}
                >
                  {inner}
                </button>
              );
            })}
          </div>

          <h2 className="mt-8 text-lg font-semibold text-gray-900">2. Choose a time on {formatDate(activeDay.date)}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {activeDay.slots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => {
                  setSelectedSlot(time);
                  setErrorMsg(null);
                }}
                aria-current={time === activeSlot ? "true" : undefined}
                className={`rounded-lg border px-2 py-2 text-center text-sm font-medium transition-colors ${
                  time === activeSlot
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-gray-300 bg-white text-gray-800 hover:border-teal-600"
                }`}
              >
                {formatTime(time)}
              </button>
            ))}
          </div>

          {activeSlot && (
            <section className="mt-8 rounded-2xl border-2 border-teal-700 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">3. Confirm</h2>
              <p className="mt-2 text-gray-700">
                {doctor.name} on <strong>{formatDate(activeDay.date)}</strong> at{" "}
                <strong>{formatTime(activeSlot)}</strong>
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {doctor.clinic.name}, {doctor.clinic.address}. You pay the fee ({formatFee(doctor.consultationFee)}) at the clinic.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmBooking}
                  className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  {submitting ? "Booking..." : "Confirm booking"}
                </button>
                <Link href={`/doctors/${doctor.id}`} className="text-sm text-slate-600 hover:underline">
                  Cancel selection
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
