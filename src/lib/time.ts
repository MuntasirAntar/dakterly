// Everything about dates and times lives here. Appointments are plain text:
// date = "2026-11-20", time = "17:10". Clinics are in Bangladesh, so "today"
// and "now" always mean Asia/Dhaka, whatever time zone the server is in.

export const CLINIC_TZ = "Asia/Dhaka";

export type ClinicNow = { date: string; minutes: number }; // minutes since midnight

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The current moment. For demos you can set DEMO_NOW in .env, for example
// DEMO_NOW="2026-11-22T17:30:00+06:00", and the whole site behaves as if it is
// that moment (frozen). Leave it out for real use.
export function currentTime(): Date {
  const demo = process.env.DEMO_NOW;
  if (demo) {
    const date = new Date(demo);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

export function nowInClinicTz(now: Date = currentTime()): ClinicNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

export function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parts(value);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(date: string, days: number) {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// 0 = Sunday ... 6 = Saturday
export function weekdayOf(date: string) {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(from: string, to: string) {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// "2026-11-15" -> "Sun, 15 Nov 2026"
export function formatDate(date: string) {
  const { y, m, d } = parts(date);
  return `${WEEKDAYS[weekdayOf(date)]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

// "2026-11-15" -> { weekday: "Sun", day: 15, month: "Nov" }
export function dateChip(date: string) {
  const { m, d } = parts(date);
  return { weekday: WEEKDAYS[weekdayOf(date)], day: d, month: MONTHS[m - 1] };
}
