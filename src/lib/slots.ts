import { addDays, daysBetween, fromMinutes, toMinutes, weekdayOf, type ClinicNow } from "./time";

// The booking rules. Change a number here and the whole site follows.
export const BOOKING_WINDOW_DAYS = 14; // today plus the next 13 days
export const MIN_LEAD_MINUTES = 30; // a slot starting in under 30 minutes cannot be booked
export const CANCEL_CUTOFF_MINUTES = 120; // no online cancelling within 2 hours of the slot

type ScheduleRow = { weekday: number; startTime: string; endTime: string; slotMinutes: number };

// Every slot a doctor offers on a date, ignoring bookings and the clock.
// A slot only counts if it ends by the closing time.
export function slotsForDate(schedules: ScheduleRow[], date: string): string[] {
  const weekday = weekdayOf(date);
  const times = new Set<string>();
  for (const s of schedules) {
    if (s.weekday !== weekday) continue;
    const end = toMinutes(s.endTime);
    for (let t = toMinutes(s.startTime); t + s.slotMinutes <= end; t += s.slotMinutes) {
      times.add(fromMinutes(t));
    }
  }
  return [...times].sort();
}

// The dates a patient may book: today and the following days.
export function bookableDates(today: string): string[] {
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
}

// Slots a patient can really book: all slots, minus the booked ones,
// minus the ones too close to now, and nothing outside the booking window.
export function availableSlots(args: {
  schedules: ScheduleRow[];
  date: string;
  bookedTimes: string[];
  now: ClinicNow;
}): string[] {
  const { schedules, date, bookedTimes, now } = args;
  if (date < now.date) return [];
  if (date > addDays(now.date, BOOKING_WINDOW_DAYS - 1)) return [];

  const booked = new Set(bookedTimes);
  return slotsForDate(schedules, date).filter((time) => {
    if (booked.has(time)) return false;
    if (date === now.date && toMinutes(time) < now.minutes + MIN_LEAD_MINUTES) return false;
    return true;
  });
}

// Can the patient still cancel this appointment themselves?
export function canCancel(date: string, slotTime: string, now: ClinicNow): boolean {
  const minutesUntil = daysBetween(now.date, date) * 1440 + toMinutes(slotTime) - now.minutes;
  return minutesUntil >= CANCEL_CUTOFF_MINUTES;
}
