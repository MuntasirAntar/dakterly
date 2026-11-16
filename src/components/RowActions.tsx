"use client";

import { useState } from "react";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { OperationType, firestore, handleFirestoreError } from "@/lib/firebase";
import { ACTION_LABELS, nextStatus, type QueueAction, type Status } from "@/lib/queue";

const STYLES: Record<QueueAction, string> = {
  check_in: "bg-teal-700 text-white hover:bg-teal-800",
  start: "bg-indigo-600 text-white hover:bg-indigo-700",
  complete: "bg-green-600 text-white hover:bg-green-700",
  no_show: "border border-orange-300 text-orange-800 hover:bg-orange-50",
  undo: "text-gray-600 underline hover:text-gray-900",
};

type Props = {
  appointmentId: string;
  slotLockId: string;
  doctorId: string;
  clinicId: string;
  date: string;
  currentStatus: Status;
  actions: QueueAction[];
  startBlocked?: boolean;
};

export default function RowActions({
  appointmentId,
  slotLockId,
  doctorId,
  clinicId,
  date,
  currentStatus,
  actions,
  startBlocked = false,
}: Props) {
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (actions.length === 0) return null;

  async function handleAction(action: QueueAction) {
    if (action === "no_show" && !window.confirm("Mark this patient as a no-show?")) {
      return;
    }

    const to = nextStatus(currentStatus, action);
    if (!to) return;

    setPending(true);
    setErrorMsg(null);
    try {
      if (action === "start") {
        const busySnap = await getDocs(
          query(
            collection(firestore, "appointments"),
            where("clinicId", "==", clinicId),
            where("doctorId", "==", doctorId),
            where("date", "==", date),
            where("status", "==", "IN_PROGRESS"),
          ),
        ).catch((err) => handleFirestoreError(err, OperationType.LIST, "appointments"));
        if (!busySnap.empty) {
          setErrorMsg("This doctor already has a patient in progress. Complete that visit first.");
          return;
        }
      }

      await runTransaction(firestore, async (tx) => {
        const apptRef = doc(firestore, "appointments", appointmentId);
        const lockRef = doc(firestore, "slotLocks", slotLockId);
        const snap = await tx.get(apptRef);
        if (!snap.exists()) throw new Error("NOT_FOUND");
        const liveStatus = snap.data().status as Status;
        if (liveStatus !== currentStatus) throw new Error("CONFLICT");

        const ts = serverTimestamp();
        const apptPatch: Record<string, unknown> = { status: to, updatedAt: ts };
        const lockPatch: Record<string, unknown> = { status: to, updatedAt: ts };

        if (action === "check_in") apptPatch.checkedInAt = ts;
        if (action === "start") {
          apptPatch.startedAt = ts;
          lockPatch.startedAt = ts;
        }
        if (action === "complete") {
          apptPatch.completedAt = ts;
          lockPatch.completedAt = ts;
        }
        if (action === "undo" && currentStatus === "CHECKED_IN") {
          apptPatch.checkedInAt = null;
        }
        if (action === "undo" && currentStatus === "IN_PROGRESS") {
          apptPatch.startedAt = null;
          lockPatch.startedAt = null;
        }

        tx.update(apptRef, apptPatch);
        tx.update(lockRef, lockPatch);
      });
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        setErrorMsg("Someone else just updated this appointment.");
      } else {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${appointmentId}`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const blocked = action === "start" && startBlocked;
        return (
          <button
            key={action}
            type="button"
            disabled={pending || blocked}
            title={blocked ? "Complete the current patient first" : undefined}
            onClick={() => void handleAction(action)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[action]}`}
          >
            {ACTION_LABELS[action]}
          </button>
        );
      })}
      {errorMsg && (
        <p role="alert" className="w-full text-sm text-red-700">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
