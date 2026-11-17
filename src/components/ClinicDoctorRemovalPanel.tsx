"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Send, UserX } from "lucide-react";
import { requestDoctorRemovalAction } from "@/app/actions/clinic-admin";
import DoctorAvatar from "@/components/DoctorAvatar";

export type ClinicDoctorItem = {
  id: string;
  name: string;
  qualifications: string | null;
  photoUrl: string | null;
  specialtyName: string;
};

export type ClinicRemovalRequestItem = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  reason: string | null;
  status: string;
  createdAt: string;
};

export default function ClinicDoctorRemovalPanel({
  doctors,
  requests,
}: {
  doctors: ClinicDoctorItem[];
  requests: ClinicRemovalRequestItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [optRequests, addOptimisticRequest] = useOptimistic(
    requests,
    (state: ClinicRemovalRequestItem[], next: ClinicRemovalRequestItem) => [next, ...state],
  );

  const pendingDoctorIds = new Set(
    optRequests.filter((r) => r.status === "PENDING").map((r) => r.doctorId),
  );

  function submitRemovalRequest(doc: ClinicDoctorItem) {
    const trimmedReason = reasonDraft.trim();
    setSelectedDoctorId(null);
    setReasonDraft("");
    setFeedback(null);

    startTransition(async () => {
      addOptimisticRequest({
        id: `temp-${doc.id}-${Date.now()}`,
        doctorId: doc.id,
        doctorName: doc.name,
        specialty: doc.specialtyName,
        reason: trimmedReason || null,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });

      const res = await requestDoctorRemovalAction({
        doctorId: doc.id,
        reason: trimmedReason || undefined,
      });

      setFeedback({
        ok: res.ok,
        text: res.ok
          ? res.message ?? `Removal request for ${doc.name} sent.`
          : res.error ?? "Could not submit removal request.",
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <UserX className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Clinic Doctors &amp; Removal Requests
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Need to remove a doctor from your clinic? Send a removal notification directly to the Super Admin.
          </p>
        </div>
        {pendingDoctorIds.size > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {pendingDoctorIds.size} pending approval
          </span>
        )}
      </div>

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`mt-4 rounded-lg border px-3.5 py-2.5 text-sm ${
            feedback.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {doctors.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No active doctors are currently assigned to this clinic.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {doctors.map((doc) => {
            const isPending = pendingDoctorIds.has(doc.id);
            const isEditing = selectedDoctorId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <DoctorAvatar name={doc.name} photoUrl={doc.photoUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-600">
                        {doc.specialtyName}
                        {doc.qualifications ? ` · ${doc.qualifications}` : ""}
                      </p>
                    </div>
                  </div>

                  {isPending ? (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Pending removal
                    </span>
                  ) : (
                    !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(doc.id);
                          setReasonDraft("");
                        }}
                        className="min-h-[36px] shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        Request removal
                      </button>
                    )
                  )}
                </div>

                {isEditing && !isPending && (
                  <div className="space-y-2.5 rounded-lg border border-amber-200 bg-white p-3">
                    <label className="block text-xs font-medium text-gray-700">
                      Reason for removal (optional)
                      <input
                        type="text"
                        maxLength={300}
                        value={reasonDraft}
                        onChange={(e) => setReasonDraft(e.target.value)}
                        placeholder="e.g. Doctor left clinic or schedule discontinued"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-600"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => submitRemovalRequest(doc)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Send to Super Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(null);
                          setReasonDraft("");
                        }}
                        className="min-h-[36px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {optRequests.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recent Removal Requests
          </h3>
          <ul className="mt-2.5 space-y-2">
            {optRequests.slice(0, 6).map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900">{req.doctorName}</span>
                  <span className="text-gray-500"> · {req.specialty}</span>
                  {req.reason && <p className="mt-0.5 text-gray-600">Reason: {req.reason}</p>}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-semibold ${
                    req.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : req.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {req.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
