"use client";

import { useActionState, useState } from "react";
import { updateAppointmentStatus, type QueueFormState } from "@/app/actions/queue";
import { ACTION_LABELS, type QueueAction } from "@/lib/queue";

const STYLES: Record<QueueAction, string> = {
  check_in: "bg-teal-700 text-white hover:bg-teal-800",
  start: "bg-indigo-600 text-white hover:bg-indigo-700",
  complete: "bg-green-600 text-white hover:bg-green-700",
  no_show: "border border-orange-300 text-orange-800 hover:bg-orange-50",
  undo: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
};

type Props = { appointmentId: string; actions: QueueAction[]; startBlocked?: boolean };

export default function RowActions({ appointmentId, actions, startBlocked = false }: Props) {
  const [state, formAction, pending] = useActionState<QueueFormState, FormData>(updateAppointmentStatus, {});
  const [confirmNoShow, setConfirmNoShow] = useState(false);

  if (actions.length === 0) return null;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      {actions.map((action) => {
        const blocked = action === "start" && startBlocked;

        if (action === "no_show" && confirmNoShow) {
          return (
            <div key={action} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 p-1">
              <button
                type="submit"
                name="action"
                value="no_show"
                disabled={pending}
                onClick={() => setConfirmNoShow(false)}
                className="min-h-[36px] rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                Confirm no-show
              </button>
              <button
                type="button"
                onClick={() => setConfirmNoShow(false)}
                className="min-h-[36px] rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          );
        }

        if (action === "no_show") {
          return (
            <button
              key={action}
              type="button"
              disabled={pending}
              onClick={() => setConfirmNoShow(true)}
              className={`min-h-[38px] rounded-md px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[action]}`}
            >
              {ACTION_LABELS[action]}
            </button>
          );
        }

        return (
          <button
            key={action}
            type="submit"
            name="action"
            value={action}
            disabled={pending || blocked}
            title={blocked ? "Complete the current patient first" : undefined}
            className={`min-h-[38px] rounded-md px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[action]}`}
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
