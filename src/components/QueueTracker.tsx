"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatWait, type QueueSnapshot } from "@/lib/queue";

// Shows the patient's live place in the line and updates itself every 10 seconds.
export default function QueueTracker({ initial }: { initial: QueueSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/queue/${initial.appointmentId}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as QueueSnapshot;
        if (stopped) return;
        setOffline(false);
        setSnapshot(next);
        // The status changed (e.g. completed): reload the rest of the page too.
        if (next.status !== initial.status) router.refresh();
      } catch {
        if (!stopped) setOffline(true);
      }
    };
    const timer = setInterval(poll, 10000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [initial.appointmentId, initial.status, router]);

  const { phase } = snapshot;
  if (phase === "closed" || phase === "later") return null;

  if (phase === "expired") {
    return (
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-sm text-gray-600">
        The date of this appointment has passed.
      </div>
    );
  }

  const headline: Record<string, string> = {
    not_arrived: "Please arrive at the clinic and give your token number to the receptionist.",
    waiting: "You are checked in. Please wait to be called.",
    next: "You are next. Please be ready.",
    with_doctor: "It is your turn. You are with the doctor now.",
  };

  return (
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
            <dd className="mt-1 text-2xl font-bold text-gray-900" data-testid="ahead">{snapshot.ahead}</dd>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Estimated wait</dt>
            <dd className="mt-1 text-sm font-bold text-gray-900" data-testid="wait">{formatWait(snapshot.estimatedWaitMinutes)}</dd>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Now serving</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900" data-testid="serving">
              {snapshot.nowServingToken ? `#${snapshot.nowServingToken}` : "-"}
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-3 text-xs text-gray-500">
        The wait is only an estimate. It updates by itself{offline ? " (connection problem, retrying...)" : "."}
      </p>
    </div>
  );
}
