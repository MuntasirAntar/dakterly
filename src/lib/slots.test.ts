import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, isValidDateString, nowInClinicTz, weekdayOf } from "./time";
import { availableSlots, bookableDates, canCancel, slotsForDate } from "./slots";

// 2026-11-15 is a Sunday (weekday 0)
const sundayEvening = [{ weekday: 0, startTime: "17:00", endTime: "21:00", slotMinutes: 15 }];

describe("dates and times", () => {
  it("knows weekdays", () => {
    expect(weekdayOf("2026-11-15")).toBe(0);
    expect(weekdayOf("2026-11-14")).toBe(6);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // leap year
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-11-14", "2026-11-14")).toBe(0);
    expect(daysBetween("2026-11-14", "2026-11-20")).toBe(6);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("validates date strings", () => {
    expect(isValidDateString("2026-11-15")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("15-11-2026")).toBe(false);
    expect(isValidDateString("garbage")).toBe(false);
  });

  it("formats dates for people", () => {
    expect(formatDate("2026-11-15")).toBe("Sun, 15 Nov 2026");
  });

  it("uses Bangladesh time, not the server's time zone", () => {
    // 18:30 UTC is 00:30 the NEXT day in Dhaka (UTC+6)
    expect(nowInClinicTz(new Date("2026-11-14T18:30:00Z"))).toEqual({ date: "2026-11-15", minutes: 30 });
    expect(nowInClinicTz(new Date("2026-11-14T11:00:00Z"))).toEqual({ date: "2026-11-14", minutes: 17 * 60 });
  });
});

describe("slotsForDate", () => {
  it("creates slots from start to end", () => {
    const slots = slotsForDate(sundayEvening, "2026-11-15");
    expect(slots).toHaveLength(16);
    expect(slots[0]).toBe("17:00");
    expect(slots[15]).toBe("20:45");
  });

  it("never creates a slot that runs past closing time", () => {
    const schedule = [{ weekday: 0, startTime: "17:00", endTime: "17:25", slotMinutes: 10 }];
    expect(slotsForDate(schedule, "2026-11-15")).toEqual(["17:00", "17:10"]);
  });

  it("returns nothing on days the doctor does not sit", () => {
    expect(slotsForDate(sundayEvening, "2026-11-16")).toEqual([]);
  });

  it("merges two sessions on the same day, sorted, without duplicates", () => {
    const twoSessions = [
      { weekday: 0, startTime: "17:00", endTime: "18:00", slotMinutes: 30 },
      { weekday: 0, startTime: "09:00", endTime: "10:00", slotMinutes: 30 },
      { weekday: 0, startTime: "09:30", endTime: "10:00", slotMinutes: 30 },
    ];
    expect(slotsForDate(twoSessions, "2026-11-15")).toEqual(["09:00", "09:30", "17:00", "17:30"]);
  });
});

describe("availableSlots", () => {
  const morning = { date: "2026-11-10", minutes: 9 * 60 };

  it("removes booked slots", () => {
    const slots = availableSlots({ schedules: sundayEvening, date: "2026-11-15", bookedTimes: ["17:00", "17:15"], now: morning });
    expect(slots).toHaveLength(14);
    expect(slots).not.toContain("17:00");
    expect(slots).not.toContain("17:15");
  });

  it("removes slots already past or starting within 30 minutes (same day)", () => {
    const now = { date: "2026-11-15", minutes: 17 * 60 + 5 }; // 17:05
    const slots = availableSlots({ schedules: sundayEvening, date: "2026-11-15", bookedTimes: [], now });
    expect(slots[0]).toBe("17:45"); // 17:30 is only 25 minutes away
    expect(slots).not.toContain("17:30");
  });

  it("keeps the whole day when the date is in the future", () => {
    const now = { date: "2026-11-10", minutes: 23 * 60 };
    expect(availableSlots({ schedules: sundayEvening, date: "2026-11-15", bookedTimes: [], now })).toHaveLength(16);
  });

  it("offers nothing in the past", () => {
    const now = { date: "2026-11-16", minutes: 8 * 60 };
    expect(availableSlots({ schedules: sundayEvening, date: "2026-11-15", bookedTimes: [], now })).toEqual([]);
  });

  it("offers nothing beyond the 14-day window", () => {
    const now = { date: "2026-11-01", minutes: 8 * 60 }; // window covers up to 2026-11-14
    expect(availableSlots({ schedules: sundayEvening, date: "2026-11-15", bookedTimes: [], now })).toEqual([]);
    const sat = [{ weekday: 6, startTime: "10:00", endTime: "11:00", slotMinutes: 30 }];
    expect(availableSlots({ schedules: sat, date: "2026-11-14", bookedTimes: [], now })).toEqual(["10:00", "10:30"]);
  });
});

describe("bookableDates", () => {
  it("lists 14 days starting today", () => {
    const dates = bookableDates("2026-12-25");
    expect(dates).toHaveLength(14);
    expect(dates[0]).toBe("2026-12-25");
    expect(dates[13]).toBe("2027-01-07");
  });
});

describe("canCancel", () => {
  it("allows cancelling tomorrow's appointment", () => {
    expect(canCancel("2026-11-15", "17:00", { date: "2026-11-14", minutes: 14 * 60 })).toBe(true);
  });

  it("blocks cancelling with less than 2 hours to go", () => {
    expect(canCancel("2026-11-14", "17:00", { date: "2026-11-14", minutes: 15 * 60 + 30 })).toBe(false);
  });

  it("allows it at exactly 2 hours", () => {
    expect(canCancel("2026-11-14", "17:00", { date: "2026-11-14", minutes: 15 * 60 })).toBe(true);
  });

  it("blocks cancelling a slot that has already passed", () => {
    expect(canCancel("2026-11-14", "10:00", { date: "2026-11-14", minutes: 11 * 60 })).toBe(false);
    expect(canCancel("2026-11-13", "10:00", { date: "2026-11-14", minutes: 8 * 60 })).toBe(false);
  });

  it("works across midnight", () => {
    // 23:00 tonight, appointment 00:30 tomorrow is only 90 minutes away
    expect(canCancel("2026-11-15", "00:30", { date: "2026-11-14", minutes: 23 * 60 })).toBe(false);
  });
});
