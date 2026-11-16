"use client";

import { useActionState } from "react";
import { updateAppointmentStatus, type QueueFormState } from "@/app/actions/queue";
import { ACTION_LABELS, type QueueAction } from "@/lib/queue";

const STYLES: Record<QueueAction, string> = {
  check_in: "bg-teal-700 text-white hover:bg-teal-800",
  start: "bg-indigo-600 text-white hover:bg-indigo-700",
  complete: "bg-green-600 text-white hover:bg-green-700",
  no_show: "border border-orange-300 text-orange-800 hover:bg-orange-50",
  undo: "text-gray-600 underline hover:text-gray-900",
};

type Props = { appointmentId: string; actions: QueueAction[]; startBlocked?: boolean };

export default function RowActions({ appointmentId, actions, startBlocked = false }: Props) {
  const [state, formAction, pending] = useActionState<QueueFormState, FormData>(updateAppointmentStatus, {});

  if (actions.length === 0) return null;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      {actions.map((action) => {
        const blocked = action === "start" && startBlocked;
        return (
          <button
            key={action}
            type="submit"
            name="action"
            value={action}
            disabled={pending || blocked}
            title={blocked ? "Complete the current patient first" : undefined}
            onClick={(event) => {
              if (action === "no_show" && !window.confirm("Mark this patient as a no-show?")) event.preventDefault();
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[action]}`}
          >
            {ACTION_LABELS[action]}
          </button>
        );
      })}
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
