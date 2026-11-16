// The queue rules. Pure functions only (no database), so they are easy to test.

export type Status = "BOOKED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type QueueAction = "check_in" | "start" | "complete" | "no_show" | "undo";

// ---------- What the clinic staff can do ----------

// For each action: which status it applies to, and the status it leads to.
const TRANSITIONS: Record<QueueAction, Partial<Record<Status, Status>>> = {
  check_in: { BOOKED: "CHECKED_IN" },
  start: { CHECKED_IN: "IN_PROGRESS" },
  complete: { IN_PROGRESS: "COMPLETED" },
  no_show: { BOOKED: "NO_SHOW", CHECKED_IN: "NO_SHOW" },
  undo: { CHECKED_IN: "BOOKED", IN_PROGRESS: "CHECKED_IN", NO_SHOW: "BOOKED" },
};

const ACTION_ORDER: QueueAction[] = ["check_in", "start", "complete", "no_show", "undo"];

export const ACTION_LABELS: Record<QueueAction, string> = {
  check_in: "Check in",
  start: "Start",
  complete: "Complete",
  no_show: "No-show",
  undo: "Undo",
};

export function nextStatus(current: Status, action: QueueAction): Status | null {
  return TRANSITIONS[action][current] ?? null;
}

// The buttons to show for an appointment in this status.
export function actionsFor(status: Status): QueueAction[] {
  return ACTION_ORDER.filter((action) => TRANSITIONS[action][status]);
}

// Which time stamps change with an action. Used later for the average consultation time.
export function timestampChanges(action: QueueAction, from: Status, now: Date) {
  if (action === "check_in") return { checkedInAt: now };
  if (action === "start") return { startedAt: now };
  if (action === "complete") return { completedAt: now };
  if (action === "undo" && from === "CHECKED_IN") return { checkedInAt: null };
  if (action === "undo" && from === "IN_PROGRESS") return { startedAt: null };
  return {};
}

// ---------- Where is a patient in the line? ----------

export type QueueEntry = { id: string; slotTime: string; tokenNumber: number; status: Status };

const PENDING: Status[] = ["BOOKED", "CHECKED_IN", "IN_PROGRESS"];

// Earlier slot first. Same slot: lower token first.
export function compareQueue(a: QueueEntry, b: QueueEntry) {
  if (a.slotTime !== b.slotTime) return a.slotTime < b.slotTime ? -1 : 1;
  return a.tokenNumber - b.tokenNumber;
}

// How many patients are still to be seen before this one?
// Counts everyone not finished (booked, waiting, with the doctor) who has an
// earlier slot. Whoever is with the doctor right now always counts as ahead.
// Cancelled, completed and no-show patients never count.
export function countAhead(mine: QueueEntry, all: QueueEntry[]) {
  return all.filter((other) => {
    if (other.id === mine.id || !PENDING.includes(other.status)) return false;
    return other.status === "IN_PROGRESS" || compareQueue(other, mine) < 0;
  }).length;
}

// ---------- How long will it take? ----------

const MIN_SAMPLES = 3;
const MAX_SAMPLES = 10;

// Average length of the doctor's recent consultations, in minutes.
// Odd values (under 1 minute or over 2 hours, e.g. someone forgot to click
// Complete) are ignored. With fewer than 3 good samples we use the doctor's
// default time instead.
export function averageConsultMinutes(recentDurations: number[], fallback: number) {
  const good = recentDurations.filter((m) => m >= 1 && m <= 120).slice(0, MAX_SAMPLES);
  if (good.length < MIN_SAMPLES) return fallback;
  const mean = good.reduce((sum, m) => sum + m, 0) / good.length;
  return Math.round(mean * 10) / 10;
}

export function estimateWaitMinutes(ahead: number, avgMinutes: number) {
  return Math.round(ahead * avgMinutes);
}

// 0 -> "No wait", 7 -> "Less than 5 minutes", 23 -> "About 25 minutes", 80 -> "About 1 hr 20 min"
export function formatWait(minutes: number) {
  if (minutes <= 0) return "No wait";
  if (minutes < 5) return "Less than 5 minutes";
  const rounded = Math.round(minutes / 5) * 5;
  if (rounded < 60) return `About ${rounded} minutes`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `About ${hours} hr` : `About ${hours} hr ${rest} min`;
}

// ---------- What should the patient's screen say? ----------

export type Phase = "closed" | "later" | "expired" | "not_arrived" | "waiting" | "next" | "with_doctor";

export function phaseFor(args: { status: Status; date: string; today: string; ahead: number }): Phase {
  const { status, date, today, ahead } = args;
  if (status === "COMPLETED" || status === "CANCELLED" || status === "NO_SHOW") return "closed";
  if (date > today) return "later";
  if (date < today) return "expired";
  if (status === "IN_PROGRESS") return "with_doctor";
  if (status === "CHECKED_IN") return ahead === 0 ? "next" : "waiting";
  return "not_arrived";
}

export type QueueSnapshot = {
  appointmentId: string;
  status: Status;
  phase: Phase;
  tokenNumber: number;
  date: string;
  slotTime: string;
  ahead: number;
  position: number;
  estimatedWaitMinutes: number;
  avgMinutes: number;
  nowServingToken: number | null;
};

// ---------- Totals for the clinic dashboard ----------

export function summarizeDay(statuses: Status[]) {
  const count = (status: Status) => statuses.filter((s) => s === status).length;
  const cancelled = count("CANCELLED");
  return {
    expected: statuses.length - cancelled, // everyone booked for today, minus cancellations
    notArrived: count("BOOKED"),
    waiting: count("CHECKED_IN"),
    withDoctor: count("IN_PROGRESS"),
    completed: count("COMPLETED"),
    noShow: count("NO_SHOW"),
    cancelled,
  };
}
