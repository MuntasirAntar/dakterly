export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// "17:00" -> "5:00 PM"
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// 1500 -> "৳ 1,500"
export function formatFee(amount: number) {
  return `৳ ${amount.toLocaleString("en-US")}`;
}

// "Dr. Farzana Rahman" -> "FR"
export function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

type ScheduleRow = { weekday: number; startTime: string; endTime: string };

// Groups days that share the same hours:
// [{Sun 17:00-21:00}, {Tue 17:00-21:00}] -> ["Sun, Tue · 5:00 PM – 9:00 PM"]
export function summarizeSchedule(schedules: ScheduleRow[]) {
  const groups = new Map<string, number[]>();
  for (const s of [...schedules].sort((a, b) => a.weekday - b.weekday)) {
    const key = `${s.startTime}|${s.endTime}`;
    groups.set(key, [...(groups.get(key) ?? []), s.weekday]);
  }
  return [...groups.entries()].map(([key, days]) => {
    const [start, end] = key.split("|");
    return `${days.map((d) => WEEKDAY_SHORT[d]).join(", ")} · ${formatTime(start)} – ${formatTime(end)}`;
  });
}
